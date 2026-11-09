import json
import pytest
from nodeai_missions.worker import run_once
from test_api import submit, claim


class Bridge:
    def __init__(self, fail_send=False):
        self.sent = []
        self.fail_send = fail_send
        self.messages = [dict(version=1, type='hello', robots=['agv1'], capabilities=['navigate','waypoints','cancel']),
            dict(version=1, type='robots', robots=[dict(id='agv1', ready=True, request_id=None, state='idle')])]
    def __enter__(self): return self
    def __exit__(self, *_): pass
    def send(self, text):
        self.sent.append(json.loads(text))
        if self.fail_send: raise OSError('connection lost after write')
        request = self.sent[-1]
        self.messages.extend(dict(version=1, type='navigation', robot_id=request['robot_id'],
            request_id=request['request_id'], state=state, error=None) for state in ['accepted', 'running', 'succeeded'])
    def recv(self, timeout): return json.dumps(self.messages.pop(0))


def test_claimed_mission_is_sent_once_and_reaches_terminal_state(client, operator, worker):
    mission = submit(client, operator).json()
    bridge = Bridge()
    result = run_once(client, 'worker-test-token', 'worker1', 'ws://fixture', socket_factory=lambda *a, **kw: bridge)
    assert result['id'] == mission['id']
    assert result['state'] == 'succeeded'
    assert len(bridge.sent) == 1
    assert bridge.sent[0]['request_id'] == result['dispatch_token']
    assert claim(client, worker).status_code == 204


def test_uncertain_send_is_never_retried_and_holds_the_robot(client, operator, worker):
    submit(client, operator)
    submit(client, operator, 'second')
    bridge = Bridge(fail_send=True)
    result = run_once(client, 'worker-test-token', 'worker1', 'ws://fixture', socket_factory=lambda *a, **kw: bridge)
    assert result['state'] == 'unknown'
    assert len(bridge.sent) == 1
    assert claim(client, worker).status_code == 204


def test_incomplete_snapshot_cannot_claim_a_persisted_mission(client, operator, worker):
    submit(client, operator)
    bridge = Bridge()
    bridge.messages[1]['robots'] = []
    with pytest.raises(ValueError, match='full bridge'):
        run_once(client, 'worker-test-token', 'worker1', 'ws://fixture', socket_factory=lambda *a, **kw: bridge)
    assert bridge.sent == []
    assert claim(client, worker).status_code == 200
