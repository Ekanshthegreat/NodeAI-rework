"""Claim one persisted mission and dispatch it once to a ROS bridge."""
import argparse
import json
import os
import time
import httpx
from websockets.sync.client import connect
from websockets.exceptions import WebSocketException

TERMINAL = {'succeeded', 'cancelled', 'rejected', 'failed'}


def run_once(client, worker_token, worker_id, bridge_url, socket_factory=connect, deadline_seconds=150):
    headers = {'Authorization': 'Bearer ' + worker_token}
    with socket_factory(bridge_url, origin='http://localhost:5173', open_timeout=3, max_size=65536) as socket:
        def read(timeout):
            raw = socket.recv(timeout=timeout)
            if not isinstance(raw, str): raise ValueError('Bridge messages must be JSON text')
            message = json.loads(raw)
            if not isinstance(message, dict) or type(message.get('version')) is not int or message['version'] != 1:
                raise ValueError('Unsupported bridge message')
            return message
        hello = read(3)
        if hello.get('type') != 'hello': raise ValueError('Expected bridge handshake')
        advertised = hello.get('robots', [])
        if (not isinstance(advertised, list) or not 1 <= len(advertised) <= 32
                or any(not isinstance(robot, str) for robot in advertised)
                or len(set(advertised)) != len(advertised)):
            raise ValueError('Invalid bridge roster')
        capabilities = hello.get('capabilities', ['navigate', 'cancel'])
        # Single-target missions still use waypoints on a waypoint-only bridge.
        if not isinstance(capabilities, list) or any(value not in ('navigate', 'waypoints', 'cancel') for value in capabilities):
            raise ValueError('Invalid bridge capabilities')
        if not ({'navigate', 'waypoints'} & set(capabilities)): return None
        snapshot = read(3)
        robots = snapshot.get('robots', [])
        if (snapshot.get('type') != 'robots' or not isinstance(robots, list)
                or any(not isinstance(robot, dict) for robot in robots) or len(robots) != len(advertised)
                or {robot.get('id') for robot in robots} != set(advertised)):
            raise ValueError('Expected full bridge robot snapshot')
        ready = [robot['id'] for robot in robots if robot.get('ready') is True
                 and robot.get('request_id') is None and robot.get('state') == 'idle']
        if not ready: return None
        fresh_at = time.monotonic()
        response = client.post('/worker/claim', headers=headers, json={'worker_id': worker_id, 'robot_ids': ready})
        response.raise_for_status()
        if response.status_code == 204: return None
        mission = response.json()
        ownership = {'worker_id': worker_id, 'dispatch_token': mission['dispatch_token']}
        def report(state, detail):
            response = client.post(f"/worker/{mission['id']}/report", headers=headers,
                                   json={**ownership, 'state': state, 'detail': str(detail)[:500] or state})
            response.raise_for_status()
            return response.json()
        try:
            targets = mission['request']['targets']
            if len(targets) > 1 and 'waypoints' not in capabilities:
                return report('rejected', 'Bridge does not support waypoint missions')
            if time.monotonic() - fresh_at >= 3:
                return report('unknown', 'Readiness snapshot expired after claim; nothing was sent')
            command = dict(version=1, robot_id=mission['robot_id'], request_id=mission['dispatch_token'])
            if len(targets) == 1 and 'navigate' in capabilities:
                command.update(type='navigate', target=targets[0])
            else: command.update(type='waypoints', targets=targets)
            # No automatic retry: delivery may have succeeded even when send/recv fails.
            socket.send(json.dumps(command, allow_nan=False))
            until = time.monotonic() + deadline_seconds
            while time.monotonic() < until:
                try: message = read(min(5, max(.01, until-time.monotonic())))
                except TimeoutError:
                    response = client.post(f"/worker/{mission['id']}/heartbeat", headers=headers, json=ownership)
                    response.raise_for_status()
                    if response.json()['state'] == 'unknown': return report('unknown', 'Worker lease expired')
                    continue
                if message.get('request_id') != mission['dispatch_token']: continue
                if message.get('type') == 'error': return report('rejected', message.get('message', 'Bridge rejected request'))
                if message.get('type') != 'navigation' or message.get('robot_id') != mission['robot_id']: continue
                state = message.get('state')
                if state in TERMINAL or state == 'unknown': return report(state, message.get('error') or state)
                if state in {'accepted', 'running'}: report('running', 'Bridge reported ' + state)
            return report('unknown', 'Worker deadline elapsed; goal outcome requires reconciliation')
        except (OSError, ValueError, TimeoutError, WebSocketException) as error:
            return report('unknown', 'Bridge communication ended: ' + str(error))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--once', action='store_true', help='exit after one claim attempt')
    args = parser.parse_args()
    try:
        with httpx.Client(base_url=os.environ.get('NODEAI_API_URL', 'http://127.0.0.1:8000'), timeout=5) as client:
            while True:
                result = run_once(client, os.environ['NODEAI_WORKER_TOKEN'],
                    os.environ.get('NODEAI_WORKER_ID', 'worker1'), os.environ.get('NODEAI_BRIDGE_URL', 'ws://127.0.0.1:8765'))
                if result: print(json.dumps({'mission_id': result['id'], 'state': result['state']}), flush=True)
                if args.once: break
                time.sleep(1)
    except (KeyError, OSError, ValueError, httpx.HTTPError, WebSocketException) as error:
        parser.error(str(error))


if __name__ == '__main__': main()
