import math
import unittest
from concurrent.futures import Future
from types import SimpleNamespace
from nodeai_bridge.gateway import Gateway, command


class Port:
    available = True

    def __init__(self):
        self.sent = []

    def ready(self):
        return self.available

    def send(self, target, feedback):
        future = Future()
        self.sent.append((target, feedback, future))
        return future


class Handle:
    def __init__(self, accepted=True):
        self.accepted = accepted
        self.result, self.cancel = Future(), Future()
        self.cancel_count = 0

    def get_result_async(self):
        return self.result

    def cancel_goal_async(self):
        self.cancel_count += 1
        return self.cancel


class GatewayTests(unittest.TestCase):
    def setUp(self):
        self.port, self.events, self.time = Port(), [], 0
        self.gateway = Gateway(
            {"agv1": self.port}, self.events.append, lambda: self.time
        )
        self.request = {
            "version": 1,
            "type": "navigate",
            "robot_id": "agv1",
            "request_id": "first",
            "target": {"x": 1, "y": 2, "yaw": 0},
        }

    def send(self):
        self.gateway.receive(self.request)
        return self.port.sent[-1][2]

    def complete(self, handle, status=4, code=0):
        handle.result.set_result(
            SimpleNamespace(
                status=status,
                result=SimpleNamespace(error_code=code, error_msg="nav failure"),
            )
        )

    def test_acceptance_does_not_claim_completion(self):
        future = self.send()
        handle = Handle()
        future.set_result(handle)
        self.assertEqual(self.events[-1]["state"], "accepted")
        self.assertIn("agv1", self.gateway.active)
        self.complete(handle)
        self.assertEqual(self.events[-1]["state"], "succeeded")
        self.assertNotIn("agv1", self.gateway.active)

    def test_rejection_and_aborted_result_release_assignment(self):
        self.send().set_result(Handle(False))
        self.assertEqual(self.events[-1]["state"], "rejected")
        self.request["request_id"] = "second"
        handle = Handle()
        self.send().set_result(handle)
        self.complete(handle, 6)
        self.assertEqual(self.events[-1]["state"], "failed")
        self.assertFalse(self.gateway.active)

    def test_nav2_error_code_prevents_false_success(self):
        handle = Handle()
        self.send().set_result(handle)
        self.complete(handle, 4, 1)
        self.assertEqual(self.events[-1]["state"], "failed")

    def test_duplicate_requests_are_idempotent_but_changed_payload_rejected(self):
        self.send()
        self.gateway.receive(self.request)
        self.assertEqual(len(self.port.sent), 1)
        self.gateway.receive({**self.request, "target": {"x": 3, "y": 2, "yaw": 0}})
        self.assertEqual(self.events[-1]["type"], "error")

    def test_busy_and_unavailable_robots_cannot_receive_goals(self):
        self.send()
        self.gateway.receive({**self.request, "request_id": "other"})
        self.assertEqual(len(self.port.sent), 1)
        self.port.available = False
        self.gateway = Gateway(
            {"agv1": self.port}, self.events.append, lambda: self.time
        )
        self.gateway.receive(self.request)
        self.assertEqual(self.events[-1]["type"], "error")

    def test_cancel_before_acceptance_waits_and_sends_once(self):
        future = self.send()
        cancel = {
            "version": 1,
            "type": "cancel",
            "robot_id": "agv1",
            "request_id": "cancel",
            "target_request_id": "first",
        }
        self.gateway.receive(cancel)
        handle = Handle()
        future.set_result(handle)
        self.gateway.receive(cancel)
        self.assertEqual(handle.cancel_count, 1)
        handle.cancel.set_result(SimpleNamespace(goals_canceling=[1]))
        self.assertIn("agv1", self.gateway.active)
        self.complete(handle, 5)
        self.assertEqual(self.events[-1]["state"], "cancelled")

    def test_cancellation_failure_holds_robot(self):
        handle = Handle()
        self.send().set_result(handle)
        self.gateway.receive(
            {
                "version": 1,
                "type": "cancel",
                "robot_id": "agv1",
                "request_id": "cancel",
                "target_request_id": "first",
            }
        )
        handle.cancel.set_result(SimpleNamespace(goals_canceling=[]))
        self.assertEqual(self.events[-1]["state"], "unknown")
        self.assertIn("agv1", self.gateway.active)

    def test_timeout_cancels_late_accepted_goal_without_resubmission(self):
        future = self.send()
        self.time = 11
        self.gateway.poll()
        self.assertEqual(self.events[-1]["state"], "unknown")
        handle = Handle()
        future.set_result(handle)
        self.assertEqual(handle.cancel_count, 1)
        self.assertEqual(len(self.port.sent), 1)

    def test_goal_and_cancel_timeouts_hold_assignment(self):
        handle = Handle()
        self.send().set_result(handle)
        self.time = 121
        self.gateway.poll()
        self.assertEqual(handle.cancel_count, 1)
        self.time = 132
        self.gateway.poll()
        self.assertEqual(self.events[-1]["state"], "unknown")
        self.assertIn("agv1", self.gateway.active)

    def test_nonfinite_unknown_and_extra_fields_are_rejected(self):
        for value in [math.nan, math.inf, True, 10001]:
            with self.assertRaises(ValueError):
                command({**self.request, "target": {"x": value, "y": 0, "yaw": 0}})
        self.gateway.receive({**self.request, "robot_id": "unknown"})
        self.gateway.receive({**self.request, "extra": 1})
        self.assertEqual(len(self.port.sent), 0)

    def test_protocol_version_boolean_is_rejected(self):
        with self.assertRaises(ValueError):
            command({**self.request, "version": True})

    def test_nonfinite_feedback_is_reported_as_unknown_distance(self):
        handle = Handle()
        self.send().set_result(handle)
        self.port.sent[0][1]({"distance_remaining": math.nan})
        self.assertIsNone(self.events[-1]["distance_remaining"])

    def test_cancel_cannot_target_another_robot(self):
        self.send()
        self.gateway.receive(
            {
                "version": 1,
                "type": "cancel",
                "robot_id": "missing",
                "request_id": "cancel",
                "target_request_id": "first",
            }
        )
        self.assertEqual(self.events[-1]["type"], "error")

    def test_late_feedback_does_not_reopen_completed_goal(self):
        handle = Handle()
        self.send().set_result(handle)
        self.complete(handle)
        self.port.sent[0][1]({"distance_remaining": 9})
        self.assertEqual(self.gateway.sessions["first"].state, "succeeded")


if __name__ == "__main__":
    unittest.main()
