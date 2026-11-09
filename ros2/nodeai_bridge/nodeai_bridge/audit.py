"""Bounded SQLite event history. This is an audit trail, not action recovery."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sqlite3
import threading
import uuid


class AuditLog:
    def __init__(self, path, limit=100_000):
        if type(limit) is not int or not 1 <= limit <= 1_000_000:
            raise ValueError('Audit retention must be 1–1,000,000 records')
        self.limit = limit
        self.session = uuid.uuid4().hex
        self.lock = threading.Lock()
        self.db = sqlite3.connect(path, timeout=2, check_same_thread=False)
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('PRAGMA synchronous=FULL')
        self.db.execute('CREATE TABLE IF NOT EXISTS events ('
                        'sequence INTEGER PRIMARY KEY AUTOINCREMENT, session TEXT NOT NULL, '
                        'recorded_at TEXT NOT NULL, kind TEXT NOT NULL, body TEXT NOT NULL)')
        self.db.commit()

    def append(self, kind, body):
        payload = json.dumps(body, allow_nan=False, separators=(',', ':'))
        if kind not in {'command', 'navigation', 'error'} or len(payload.encode()) > 65536:
            raise ValueError('Invalid audit event')
        timestamp = datetime.now(timezone.utc).isoformat()
        with self.lock, self.db:
            cursor = self.db.execute('INSERT INTO events(session, recorded_at, kind, body) VALUES (?,?,?,?)',
                                     (self.session, timestamp, kind, payload))
            self.db.execute('DELETE FROM events WHERE sequence <= ?', (cursor.lastrowid - self.limit,))
            return cursor.lastrowid

    def close(self):
        with self.lock:
            self.db.close()


def records(path, after=0, limit=1000, session=None):
    if type(after) is not int or after < 0 or type(limit) is not int or not 1 <= limit <= 10000:
        raise ValueError('Use after >= 0 and limit 1–10,000')
    uri = Path(path).resolve().as_uri() + '?mode=ro'
    with sqlite3.connect(uri, uri=True, timeout=2) as db:
        rows = db.execute('SELECT sequence, session, recorded_at, kind, body FROM events '
                          'WHERE sequence > ? AND (? IS NULL OR session = ?) ORDER BY sequence LIMIT ?',
                          (after, session, session, limit))
        return [dict(sequence=row[0], session=row[1], recorded_at=row[2], kind=row[3],
                     body=json.loads(row[4])) for row in rows]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('database', type=Path)
    parser.add_argument('--after', type=int, default=0)
    parser.add_argument('--limit', type=int, default=1000)
    parser.add_argument('--session')
    args = parser.parse_args()
    try:
        for record in records(args.database, args.after, args.limit, args.session):
            print(json.dumps(record, ensure_ascii=False))
    except (ValueError, sqlite3.Error, OSError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
