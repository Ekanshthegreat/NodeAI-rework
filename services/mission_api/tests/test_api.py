from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import uuid
from sqlalchemy import update
from nodeai_missions.models import Mission

PAYLOAD = {'robot_id': 'agv1', 'targets': [{'x': 1, 'y': 2, 'yaw': 0}]}


def submit(client, operator, key='first', payload=None):
    return client.post('/missions', headers={**operator, 'Idempotency-Key': key}, json=payload or PAYLOAD)


def claim(client, worker, name='worker1', robots=None):
    return client.post('/worker/claim', headers=worker, json={'worker_id': name, 'robot_ids': robots or ['agv1']})


def report(client, worker, mission, state, token=None):
    return client.post(f"/worker/{mission['id']}/report", headers=worker,
        json={'worker_id': mission['worker_id'], 'dispatch_token': token or mission['dispatch_token'],
              'state': state, 'detail': 'Observed by the bridge fixture'})


def test_submission_is_idempotent_and_conflicts_are_explicit(client, operator):
    first = submit(client, operator)
    assert first.status_code == 201
    replay = submit(client, operator)
    assert replay.status_code == 200
    assert replay.json()['id'] == first.json()['id']
    changed = {**PAYLOAD, 'robot_id': 'agv2'}
    assert submit(client, operator, payload=changed).status_code == 409
    events = client.get(f"/missions/{first.json()['id']}/events", headers=operator).json()
    assert [event['state'] for event in events] == ['queued']


def test_concurrent_duplicate_submissions_create_one_mission(client, operator):
    with ThreadPoolExecutor(max_workers=6) as pool:
        replies = list(pool.map(lambda _: submit(client, operator), range(6)))
    assert sum(reply.status_code == 201 for reply in replies) == 1
    assert all(reply.status_code in (200, 201) for reply in replies)
    assert len({reply.json()['id'] for reply in replies}) == 1


def test_claims_are_exclusive_per_robot_and_worker_token_is_fenced(client, operator, worker):
    submit(client, operator)
    submit(client, operator, 'second')
    with ThreadPoolExecutor(max_workers=2) as pool:
        replies = list(pool.map(lambda name: claim(client, worker, name), ['w1', 'w2']))
    assert sorted(reply.status_code for reply in replies) == [200, 204]
    mission = next(reply.json() for reply in replies if reply.status_code == 200)
    assert report(client, worker, mission, 'running', str(uuid.uuid4())).status_code == 409
    assert report(client, worker, mission, 'running').json()['state'] == 'running'
    assert report(client, worker, mission, 'succeeded').json()['state'] == 'succeeded'
    assert report(client, worker, mission, 'succeeded').status_code == 200
    assert report(client, worker, mission, 'failed').status_code == 409
    assert claim(client, worker).status_code == 200


def test_expired_worker_holds_robot_until_versioned_reconciliation(client, app, operator, worker):
    submit(client, operator)
    submit(client, operator, 'second')
    mission = claim(client, worker).json()
    with app.state.store.engine.begin() as connection:
        connection.execute(update(Mission).where(Mission.id == uuid.UUID(mission['id']))
            .values(lease_until=datetime.now(timezone.utc)-timedelta(seconds=1)))
    assert claim(client, worker).status_code == 204
    current = client.get(f"/missions/{mission['id']}", headers=operator).json()
    assert current['state'] == 'unknown'
    assert report(client, worker, mission, 'running').status_code == 409
    body = dict(expected_version=current['version']-1, state='cancelled', reason='Verified terminal status on Nav2')
    endpoint = f"/missions/{mission['id']}/reconcile"
    assert client.post(endpoint, headers=operator, json=body).status_code == 409
    body['expected_version'] = current['version']
    assert client.post(endpoint, headers=operator, json=body).status_code == 200
    assert report(client, worker, mission, 'running').status_code == 409
    assert claim(client, worker).status_code == 200


def test_state_survives_new_api_instance(client, app, operator, worker):
    from fastapi.testclient import TestClient
    from nodeai_missions.api import create_app
    mission = submit(client, operator).json()
    claimed = claim(client, worker).json()
    other = create_app(str(app.state.store.engine.url.render_as_string(hide_password=False)),
                       'operator-test-token', 'worker-test-token')
    with TestClient(other) as restarted:
        restored = restarted.get(f"/missions/{mission['id']}", headers=operator).json()
        assert restored['state'] == 'dispatching'
        assert restored['dispatch_token'] == claimed['dispatch_token']
        assert claim(restarted, worker).status_code == 204


def test_worker_and_operator_roles_and_invalid_payloads(client, operator, worker):
    assert submit(client, worker).status_code == 401
    assert claim(client, operator).status_code == 401
    assert client.get('/healthz').status_code == 200
    for targets in [[], [{'x': True, 'y': 0, 'yaw': 0}], [{'x': 0, 'y': 0, 'yaw': 4}]]:
        assert submit(client, operator, payload={**PAYLOAD, 'targets': targets}).status_code == 422
    assert client.post('/missions', headers=operator, json=PAYLOAD).status_code == 422
    assert client.get('/missions/'+str(uuid.uuid4()), headers=operator).status_code == 404


def test_lifecycle_events_are_transactional_and_cursor_paginated(client, operator, worker):
    mission = submit(client, operator).json()
    leased = claim(client, worker).json()
    report(client, worker, leased, 'running')
    report(client, worker, leased, 'succeeded')
    endpoint = f"/missions/{mission['id']}/events"
    first = client.get(endpoint+'?limit=2', headers=operator).json()
    rest = client.get(endpoint+f"?after={first[-1]['sequence']}", headers=operator).json()
    assert [row['state'] for row in first+rest] == ['queued', 'dispatching', 'running', 'succeeded']
    assert [row['version'] for row in first+rest] == [1, 2, 3, 4]
    assert client.get(endpoint+'?limit=1000', headers=operator).status_code == 422
