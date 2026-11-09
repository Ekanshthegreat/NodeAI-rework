"""ROS-independent input boundary for the WebSocket transport."""
import json
from queue import Full

from nodeai_bridge.gateway import command, identifier

COMMAND_BYTES = 8192


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON field')
        result[key] = value
    return result


def enqueue(raw, commands):
    """Return a correlated error, or enqueue one fully validated command."""
    request_id = None
    try:
        if not isinstance(raw, str) or len(raw.encode('utf-8')) > COMMAND_BYTES:
            raise ValueError('Commands must be UTF-8 text no larger than 8 KiB')
        data = json.loads(raw, object_pairs_hook=_unique_object,
                          parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))
        if isinstance(data, dict):
            try:
                request_id = identifier(data.get('request_id'))
            except ValueError:
                pass
        data = command(data)
        commands.put_nowait(data)
        return None
    except (ValueError, TypeError, RecursionError) as error:
        message = str(error) or 'Invalid command'
    except Full:
        message = 'Command queue full; request was not queued'
    return {'version': 1, 'type': 'error', 'request_id': request_id, 'message': message}
