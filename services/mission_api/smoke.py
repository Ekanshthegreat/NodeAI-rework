#!/usr/bin/env python3
"""Exercise the Docker mission API -> worker -> ROS action fixture path."""
import argparse
import json
import os
from pathlib import Path
import time
import uuid
import httpx


def smoke(base_url, token):
    key = 'smoke-' + uuid.uuid4().hex
    with httpx.Client(base_url=base_url, headers={'Authorization': 'Bearer '+token}, timeout=5) as client:
        payload = {'robot_id': 'agv1', 'targets': [{'x': 1, 'y': 2, 'yaw': 0}, {'x': 2, 'y': 1, 'yaw': 0}]}
        first = client.post('/missions', headers={'Idempotency-Key': key}, json=payload)
        first.raise_for_status()
        assert first.status_code == 201
        mission = first.json()
        repeated = client.post('/missions', headers={'Idempotency-Key': key}, json=payload)
        repeated.raise_for_status()
        assert repeated.status_code == 200 and repeated.json()['id'] == mission['id']
        deadline = time.monotonic() + 40
        while time.monotonic() < deadline:
            response = client.get('/missions/'+mission['id'])
            response.raise_for_status()
            current = response.json()
            if current['state'] == 'succeeded': break
            if current['state'] in {'failed','cancelled','rejected','unknown'}:
                raise RuntimeError('Mission ended in '+current['state'])
            time.sleep(.5)
        else: raise RuntimeError('Fixture mission timed out')
        response = client.get('/missions/'+mission['id']+'/events')
        response.raise_for_status()
        events = response.json()
        assert [event['state'] for event in events] == ['queued','dispatching','running','succeeded']
        return {'source': 'Docker Compose with real ROS 2 action test fixture; no robot hardware',
                'mission': {key: current[key] for key in ['id','robot_id','state','version']},
                'idempotent_submission_verified': True, 'events': events}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8000')
    parser.add_argument('--out', type=Path)
    args = parser.parse_args()
    result = smoke(args.url, os.environ.get('NODEAI_API_TOKEN','operator-local-development'))
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(result,indent=2)+'\n')
    print('Completed persisted two-waypoint mission:',result['mission']['id'])
    print('Lifecycle:', ' -> '.join(event['state'] for event in result['events']))
