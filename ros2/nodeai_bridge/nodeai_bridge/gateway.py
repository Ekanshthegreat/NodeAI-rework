"""ROS-independent navigation lifecycle; clients supply asynchronous action ports."""

from dataclasses import dataclass
import math
import re
from typing import Callable

TERMINAL = {"succeeded", "cancelled", "rejected", "failed"}


def identifier(value):
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", value):
        raise ValueError("Identifiers must contain 1–64 letters, digits, '_' or '-'")
    return value


def validate_target(target):
    if not isinstance(target, dict) or set(target) != {"x", "y", "yaw"}:
        raise ValueError("Target needs x, y and yaw")
    for key, limit in [("x", 10000), ("y", 10000), ("yaw", math.pi)]:
        value = target[key]
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
            or abs(value) > limit
        ):
            raise ValueError(f"Invalid target {key}")


def command(data):
    if (
        not isinstance(data, dict)
        or type(data.get("version")) is not int
        or data.get("version") != 1
    ):
        raise ValueError("Expected protocol version 1")
    kind = data.get("type")
    fields = {"version", "type", "request_id", "robot_id"}
    extra = {
        "navigate": "target",
        "waypoints": "targets",
        "cancel": "target_request_id",
    }
    if kind not in extra:
        raise ValueError("Supported commands are navigate, waypoints and cancel")
    fields.add(extra[kind])
    if set(data) != fields:
        raise ValueError("Unexpected or missing command fields")
    identifier(data["request_id"])
    identifier(data["robot_id"])
    if kind == "cancel":
        identifier(data["target_request_id"])
    elif kind == "navigate":
        validate_target(data["target"])
    else:
        targets = data["targets"]
        if not isinstance(targets, list) or not 1 <= len(targets) <= 20:
            raise ValueError("A waypoint mission needs 1–20 targets")
        for target in targets:
            validate_target(target)
    return data


@dataclass
class Session:
    request: dict
    started: float
    state: str = "pending"
    handle: object = None
    cancel_requested: bool = False
    cancel_sent: bool = False
    cancel_started: float | None = None
    error: str | None = None
    completed: int = 0
    generation: int = 0


class Gateway:
    def __init__(
        self,
        ports: dict,
        emit: Callable,
        clock: Callable,
        response_timeout=10,
        goal_timeout=120,
    ):
        self.ports, self.emit, self.clock = ports, emit, clock
        self.response_timeout, self.goal_timeout = response_timeout, goal_timeout
        self.sessions: dict[str, Session] = {}
        self.active: dict[str, str] = {}
        self.cancel_requests: dict[str, dict] = {}

    def event(self, session, **extra):
        self.emit(
            {
                "version": 1,
                "type": "navigation",
                "request_id": session.request["request_id"],
                "robot_id": session.request["robot_id"],
                "state": session.state,
                "error": session.error,
                "completed_waypoints": session.completed,
                "total_waypoints": len(self.targets(session)),
                **extra,
            }
        )

    def reject(self, data, reason):
        self.emit(
            {
                "version": 1,
                "type": "error",
                "request_id": data.get("request_id")
                if isinstance(data, dict)
                else None,
                "message": reason,
            }
        )

    def receive(self, data):
        try:
            data = command(data)
            robot, request_id = data["robot_id"], data["request_id"]
            if robot not in self.ports:
                raise ValueError("Unknown robot")
            if data["type"] == "cancel":
                previous = self.cancel_requests.get(request_id)
                if previous is not None and previous != data:
                    raise ValueError("Request ID reused with different content")
                if request_id in self.sessions:
                    raise ValueError("Request ID is already used by navigation")
                session = self.sessions.get(data["target_request_id"])
                if session is None or session.request["robot_id"] != robot:
                    raise ValueError("Cancel target does not match this robot")
                if len(self.cancel_requests) >= 256 and previous is None:
                    self.cancel_requests.pop(next(iter(self.cancel_requests)))
                self.cancel_requests[request_id] = dict(data)
                if session.state not in TERMINAL:
                    session.cancel_requested = True
                    self.cancel(session)
                self.event(session)
                return
            if request_id in self.cancel_requests:
                raise ValueError("Request ID is already used by cancellation")
            previous = self.sessions.get(request_id)
            if previous:
                if previous.request != data:
                    raise ValueError("Request ID reused with different content")
                self.event(previous)
                return
            if robot in self.active:
                raise ValueError("Robot has an outstanding navigation goal")
            if not self.ports[robot].ready():
                raise ValueError("Nav2 action server is unavailable")
            if len(self.sessions) >= 256:
                oldest = next(
                    (
                        key
                        for key, value in self.sessions.items()
                        if value.state in TERMINAL
                    ),
                    None,
                )
                if oldest is None:
                    raise ValueError("Navigation history is full")
                del self.sessions[oldest]
            import copy

            session = Session(copy.deepcopy(data), self.clock())
            self.sessions[request_id], self.active[robot] = session, request_id
            self.dispatch(session)
        except (ValueError, TypeError, KeyError) as error:
            self.reject(data, str(error))

    def targets(self, session):
        return session.request.get("targets", [session.request.get("target")])

    def current(self, session, generation):
        return session.generation == generation and session.state not in TERMINAL

    def dispatch(self, session):
        session.generation += 1
        generation = session.generation
        session.started = self.clock()
        session.handle = None
        session.cancel_sent = False
        session.cancel_started = None
        session.state, session.error = "pending", None
        self.event(session)
        try:
            future = self.ports[session.request["robot_id"]].send(
                self.targets(session)[session.completed],
                lambda feedback: (
                    self.feedback(session, feedback)
                    if self.current(session, generation)
                    else None
                ),
            )
            future.add_done_callback(
                lambda done: (
                    self.accepted(session, done)
                    if self.current(session, generation)
                    else None
                )
            )
        except Exception as error:
            session.state, session.error = "unknown", str(error)
            self.event(session)

    def finish(self, session, state, error=None):
        session.state, session.error = state, error
        robot = session.request["robot_id"]
        if self.active.get(robot) == session.request["request_id"]:
            del self.active[robot]
        self.event(session)

    def accepted(self, session, future):
        try:
            handle = future.result()
            if not handle.accepted:
                self.finish(
                    session,
                    "failed" if session.completed else "rejected",
                    "Nav2 rejected the goal",
                )
                return
            session.handle, session.state, session.error = handle, "accepted", None
            self.event(session)
            generation = session.generation
            handle.get_result_async().add_done_callback(
                lambda result: (
                    self.result(session, result)
                    if self.current(session, generation)
                    else None
                )
            )

            if session.cancel_requested:
                self.cancel(session)
        except Exception as error:
            session.state, session.error = "unknown", str(error)
            self.event(session)

    def feedback(self, session, feedback):
        if session.state in TERMINAL or session.state in {"cancelling", "unknown"}:
            return
        session.state = "running"
        distance = feedback.get("distance_remaining")
        if (
            not isinstance(distance, (int, float))
            or not math.isfinite(distance)
            or distance < 0
        ):
            distance = None
        self.event(session, distance_remaining=distance)

    def result(self, session, future):
        try:
            result = future.result()
            status, code = result.status, getattr(result.result, "error_code", 0)
            if status == 4 and code == 0:  # action_msgs/GoalStatus SUCCEEDED
                session.completed += 1
                if session.completed == len(self.targets(session)):
                    self.finish(session, "succeeded")
                elif session.cancel_requested:
                    self.finish(session, "cancelled")
                else:
                    self.event(session)
                    # Recheck server/telemetry readiness before starting another leg.
                    if not self.ports[session.request["robot_id"]].ready():
                        self.finish(
                            session,
                            "failed",
                            "Robot is not ready for the next waypoint",
                        )
                    else:
                        self.dispatch(session)
            elif status == 5:
                self.finish(session, "cancelled")
            else:
                self.finish(
                    session,
                    "failed",
                    getattr(result.result, "error_msg", "")
                    or f"Nav2 status {status}, error {code}",
                )
        except Exception as error:
            session.state, session.error = "unknown", str(error)
            self.event(session)

    def cancel(self, session):
        if session.handle is None or session.cancel_sent:
            return
        session.cancel_sent = True
        session.cancel_started = self.clock()
        session.state = "cancelling"
        self.event(session)
        try:
            generation = session.generation
            session.handle.cancel_goal_async().add_done_callback(
                lambda future: (
                    self.cancel_response(session, future)
                    if self.current(session, generation)
                    else None
                )
            )

        except Exception as error:
            session.state, session.error = "unknown", str(error)
            self.event(session)

    def cancel_response(self, session, future):
        if session.state in TERMINAL:
            return
        try:
            response = future.result()
            if not response.goals_canceling:
                session.state, session.error = (
                    "unknown",
                    "Nav2 did not acknowledge cancellation; goal may still be active",
                )
                self.event(session)
            # An acknowledgement is not a terminal result. Hold assignment until result.
        except Exception as error:
            session.state, session.error = "unknown", str(error)
            self.event(session)

    def poll(self):
        now = self.clock()
        for request_id in list(self.active.values()):
            session = self.sessions[request_id]
            if (
                session.handle is None
                and now - session.started >= self.response_timeout
            ):
                if not session.cancel_requested:
                    session.cancel_requested = True
                    session.state, session.error = (
                        "unknown",
                        "Goal response timeout; holding robot until result",
                    )
                    self.event(session)
            elif (
                session.handle is not None
                and now - session.started >= self.goal_timeout
            ):
                session.cancel_requested = True
                self.cancel(session)
            if (
                session.cancel_started is not None
                and now - session.cancel_started >= self.response_timeout
                and session.state != "unknown"
            ):
                session.state, session.error = (
                    "unknown",
                    "Cancellation result timeout; robot remains occupied",
                )
                self.event(session)
