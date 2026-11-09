"""Small loopback diagnostics endpoint; no command dispatch or ROS imports."""
import asyncio
import json


def response(path, snapshot):
    if path == '/healthz':
        age = snapshot.get('heartbeat_age_seconds')
        healthy = (age is not None and 0 <= age < 2 and snapshot.get('audit_errors', 0) == 0
                   and snapshot.get('output_drops', 0) == 0)
        return (200 if healthy else 503), 'application/json', json.dumps({
            'status': 'ok' if healthy else 'degraded', **snapshot}, allow_nan=False).encode()
    if path == '/metrics':
        names = {'commands_processed': 'counter', 'commands_rejected': 'counter',
                 'audit_errors': 'counter', 'output_drops': 'counter',
                 'command_queue_depth': 'gauge', 'active_goals': 'gauge', 'ready_robots': 'gauge'}
        lines = []
        for name, kind in names.items():
            suffix = '_total' if kind == 'counter' else ''
            metric = 'nodeai_' + name + suffix
            lines.extend([f'# TYPE {metric} {kind}', f'{metric} {int(snapshot.get(name, 0))}'])
        return 200, 'text/plain; version=0.0.4', ('\n'.join(lines)+'\n').encode()
    return 404, 'text/plain', b'Not found\n'


async def start_health(host, port, snapshot):
    if host not in {'127.0.0.1', '::1', 'localhost'} or type(port) is not int or not 0 <= port <= 65535:
        raise ValueError('Health endpoint requires a loopback host and valid port')
    clients = 0

    async def handle(reader, writer):
        nonlocal clients
        if clients >= 8:
            writer.close()
            await writer.wait_closed()
            return
        clients += 1
        try:
            raw = await asyncio.wait_for(reader.readuntil(b'\r\n\r\n'), timeout=2)
            first = raw.split(b'\r\n', 1)[0].decode('ascii').split()
            if len(raw) > 4096 or len(first) != 3 or first[0] != 'GET' or first[2] != 'HTTP/1.1':
                status, content, body = 400, 'text/plain', b'Bad request\n'
            else:
                status, content, body = response(first[1], snapshot())
            reason = {200: 'OK', 400: 'Bad Request', 404: 'Not Found', 503: 'Service Unavailable'}[status]
            writer.write(f'HTTP/1.1 {status} {reason}\r\nContent-Type: {content}\r\n'
                         f'Content-Length: {len(body)}\r\nConnection: close\r\n\r\n'.encode() + body)
            await asyncio.wait_for(writer.drain(), timeout=2)
        except (asyncio.TimeoutError, asyncio.IncompleteReadError, asyncio.LimitOverrunError,
                UnicodeError, ConnectionError):
            pass
        finally:
            clients -= 1
            writer.close()
            try: await writer.wait_closed()
            except ConnectionError: pass

    return await asyncio.start_server(handle, host, port, limit=4096)
