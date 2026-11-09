"""Persistent missions and lifecycle events."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('missions',
        sa.Column('id', pg.UUID(as_uuid=True), primary_key=True),
        sa.Column('idempotency_key', sa.String(64), nullable=False, unique=True),
        sa.Column('robot_id', sa.String(64), nullable=False),
        sa.Column('request', pg.JSONB(), nullable=False),
        sa.Column('state', sa.String(16), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('worker_id', sa.String(64)),
        sa.Column('dispatch_token', pg.UUID(as_uuid=True)),
        sa.Column('lease_until', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("state IN ('queued','dispatching','running','unknown','succeeded','cancelled','rejected','failed')", name='mission_state'),
        sa.CheckConstraint('version > 0', name='mission_version'))
    op.create_index('one_active_mission_per_robot', 'missions', ['robot_id'], unique=True,
                    postgresql_where=sa.text("state IN ('dispatching','running','unknown')"))
    op.create_index('mission_queue_order', 'missions', ['state', 'created_at', 'id'])
    op.create_table('mission_events',
        sa.Column('sequence', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('mission_id', pg.UUID(as_uuid=True), sa.ForeignKey('missions.id'), nullable=False),
        sa.Column('state', sa.String(16), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('detail', sa.Text(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index('ix_mission_events_mission_id', 'mission_events', ['mission_id'])


def downgrade():
    op.drop_table('mission_events')
    op.drop_table('missions')
