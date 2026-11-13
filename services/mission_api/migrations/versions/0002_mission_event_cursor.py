"""Index mission events in cursor order."""
from alembic import op

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade():
    op.create_index('mission_event_cursor', 'mission_events', ['mission_id', 'sequence'])
    op.drop_index('ix_mission_events_mission_id', table_name='mission_events')


def downgrade():
    op.create_index('ix_mission_events_mission_id', 'mission_events', ['mission_id'])
    op.drop_index('mission_event_cursor', table_name='mission_events')
