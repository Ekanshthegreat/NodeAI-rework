import json
from queue import Queue
import unittest
from nodeai_bridge.transport import enqueue


class TransportTests(unittest.TestCase):
    def setUp(self):
        self.queue = Queue(maxsize=1)
        self.command = dict(version=1, type='navigate', request_id='one', robot_id='agv1',
                            target=dict(x=1, y=2, yaw=0))

    def test_validated_command_is_queued_once(self):
        self.assertIsNone(enqueue(json.dumps(self.command), self.queue))
        self.assertEqual(self.queue.get_nowait(), self.command)

    def test_bad_json_never_reuses_a_previous_request_id(self):
        enqueue(json.dumps(self.command), self.queue)
        for raw in ['{', '[]', 'null', '"string"', '{"request_id":"bad id"}',
                    '{"request_id":"first","request_id":"second"}',
                    '{"version":1,"version":2}', b'not text']:
            with self.subTest(raw=raw):
                error = enqueue(raw, self.queue)
                self.assertEqual(error['type'], 'error')
                self.assertIsNone(error['request_id'])
        self.assertEqual(self.queue.qsize(), 1)

    def test_invalid_payload_is_correlated_but_never_queued(self):
        for change in [dict(type='unknown'), dict(target=dict(x=float('nan'), y=0, yaw=0)),
                       dict(extra=True), dict(target=dict(x=True, y=0, yaw=0))]:
            error = enqueue(json.dumps({**self.command, **change}), self.queue)
            self.assertIsNotNone(error)
            self.assertEqual(error['request_id'], 'one' if 'NaN' not in json.dumps(change) else None)
        self.assertTrue(self.queue.empty())

    def test_queue_pressure_and_multibyte_limits(self):
        enqueue(json.dumps(self.command), self.queue)
        error = enqueue(json.dumps({**self.command, 'request_id': 'two'}), self.queue)
        self.assertEqual(error['request_id'], 'two')
        self.assertIn('not queued', error['message'])
        error = enqueue('界' * 3000, self.queue)
        self.assertIsNone(error['request_id'])
        self.assertIn('8 KiB', error['message'])
        self.assertEqual(self.queue.qsize(), 1)


if __name__ == '__main__':
    unittest.main()
