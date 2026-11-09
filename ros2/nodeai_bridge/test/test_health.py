import asyncio
import json
import unittest
from nodeai_bridge.health import response, start_health


class HealthTests(unittest.IsolatedAsyncioTestCase):
    async def test_http_endpoints_report_operational_state(self):
        snapshot = dict(audit_errors=0, output_drops=0, commands_processed=7, ready_robots=0, heartbeat_age_seconds=0)
        server = await start_health('127.0.0.1', 0, lambda: snapshot)
        self.addAsyncCleanup(server.wait_closed)
        self.addCleanup(server.close)
        port = server.sockets[0].getsockname()[1]
        async def get(path):
            reader, writer = await asyncio.open_connection('127.0.0.1', port)
            writer.write(f'GET {path} HTTP/1.1\r\nHost: localhost\r\n\r\n'.encode())
            await writer.drain()
            result = await reader.read()
            writer.close(); await writer.wait_closed()
            return result
        result = await get('/healthz')
        self.assertIn(b'200 OK', result)
        # Healthy service is distinct from robot readiness.
        self.assertEqual(json.loads(result.split(b'\r\n\r\n')[1])['ready_robots'], 0)
        self.assertIn(b'nodeai_commands_processed_total 7', await get('/metrics'))
        snapshot['audit_errors'] = 1
        self.assertIn(b'503 Service Unavailable', await get('/healthz'))
        self.assertIn(b'404 Not Found', await get('/unknown'))
        snapshot['audit_errors'] = 0
        snapshot['heartbeat_age_seconds'] = 3
        self.assertIn(b'503 Service Unavailable', await get('/healthz'))

    async def test_rejects_remote_diagnostics_bind(self):
        with self.assertRaises(ValueError): await start_health('0.0.0.0', 9091, dict)

    async def test_metrics_have_explicit_types_and_no_commands(self):
        status, _, body = response('/metrics', dict(active_goals=2, output_drops=1))
        self.assertEqual(status, 200)
        self.assertIn(b'# TYPE nodeai_active_goals gauge', body)
        self.assertIn(b'nodeai_output_drops_total 1', body)
        self.assertEqual(response('/dispatch', {})[0], 404)


if __name__ == '__main__': unittest.main()
