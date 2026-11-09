from pathlib import Path
import sqlite3
import tempfile
import unittest
from nodeai_bridge.audit import AuditLog, records


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name)/'audit.sqlite3'

    def test_reopen_preserves_sequence_and_separates_bridge_sessions(self):
        log = AuditLog(self.path)
        first = log.session
        self.assertEqual(log.append('command', {'request_id': 'one'}), 1)
        log.close()
        log = AuditLog(self.path)
        self.assertNotEqual(log.session, first)
        self.assertEqual(log.append('navigation', {'state': 'succeeded'}), 2)
        log.close()
        rows = records(self.path)
        self.assertEqual([r['sequence'] for r in rows], [1, 2])
        self.assertEqual(rows[0]['body'], {'request_id': 'one'})
        self.assertEqual(len(records(self.path, session=first)), 1)
        self.assertEqual(records(self.path, after=1, limit=1)[0]['sequence'], 2)

    def test_retention_is_bounded_without_reusing_sequence_ids(self):
        log = AuditLog(self.path, limit=3)
        for n in range(5): log.append('error', {'number': n})
        log.close()
        rows = records(self.path)
        self.assertEqual([r['sequence'] for r in rows], [3, 4, 5])

    def test_invalid_records_never_partially_commit(self):
        log = AuditLog(self.path)
        for kind, value in [('invalid', {}), ('error', {'x': float('nan')}),
                            ('error', {'message': '界' * 22000})]:
            with self.assertRaises(ValueError): log.append(kind, value)
        log.append('error', {'ok': True})
        log.close()
        self.assertEqual(len(records(self.path)), 1)

    def test_read_only_export_never_creates_a_missing_database(self):
        with self.assertRaises(sqlite3.Error): records(self.path)
        self.assertFalse(self.path.exists())
        for options in [dict(after=-1), dict(limit=0), dict(limit=10001)]:
            with self.assertRaises(ValueError): records(self.path, **options)


if __name__ == '__main__': unittest.main()
