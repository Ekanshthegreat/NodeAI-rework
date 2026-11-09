"""Bound JSON requests before validation, including chunked request bodies."""
import asyncio
import json
from starlette.responses import JSONResponse


def unique_fields(pairs):
    result = {}
    for key, value in pairs:
        if key in result: raise ValueError('Duplicate JSON field')
        result[key] = value
    return result


class BoundedJSONBody:
    def __init__(self, app, limit=16384):
        self.app, self.limit = app, limit

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or scope['method'] != 'POST':
            return await self.app(scope, receive, send)
        data = bytearray()
        try:
            async with asyncio.timeout(5):
                while True:
                    message = await receive()
                    if message['type'] == 'http.disconnect': return
                    chunk = message.get('body', b'')
                    if len(data) + len(chunk) > self.limit:
                        response = JSONResponse({'detail': 'JSON body exceeds 16 KiB'}, status_code=413,
                                                headers={'Connection': 'close'})
                        return await response(scope, receive, send)
                    data.extend(chunk)
                    if not message.get('more_body', False): break
            if data:
                parsed = json.loads(data, object_pairs_hook=unique_fields,
                           parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))
                pending = [(parsed, 0)]
                while pending:
                    value, depth = pending.pop()
                    if depth > 16: raise ValueError('JSON nesting exceeds 16 levels')
                    if isinstance(value, dict): pending.extend((child, depth+1) for child in value.values())
                    elif isinstance(value, list): pending.extend((child, depth+1) for child in value)
        except (ValueError, UnicodeError, RecursionError):
            return await JSONResponse({'detail': 'Invalid or ambiguous JSON'}, status_code=400)(scope, receive, send)
        except TimeoutError:
            return await JSONResponse({'detail': 'Request body timed out'}, status_code=408,
                                      headers={'Connection': 'close'})(scope, receive, send)
        delivered = False
        async def replay():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {'type': 'http.request', 'body': bytes(data), 'more_body': False}
            return await receive()
        await self.app(scope, replay, send)
