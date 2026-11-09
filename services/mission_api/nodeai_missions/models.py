from datetime import datetime
import uuid
from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Mission(Base):
    __tablename__ = 'missions'
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    idempotency_key: Mapped[str] = mapped_column(String(64), unique=True)
    robot_id: Mapped[str] = mapped_column(String(64))
    request: Mapped[dict] = mapped_column(JSONB)
    state: Mapped[str] = mapped_column(String(16), default='queued')
    version: Mapped[int] = mapped_column(Integer, default=1)
    worker_id: Mapped[str | None] = mapped_column(String(64))
    dispatch_token: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (
        CheckConstraint("state IN ('queued','dispatching','running','unknown','succeeded','cancelled','rejected','failed')", name='mission_state'),
        CheckConstraint('version > 0', name='mission_version'),
        Index('one_active_mission_per_robot', 'robot_id', unique=True,
              postgresql_where=text("state IN ('dispatching','running','unknown')")),
        Index('mission_queue_order', 'state', 'created_at', 'id'),
    )


class MissionEvent(Base):
    __tablename__ = 'mission_events'
    sequence: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    mission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('missions.id'), index=True)
    state: Mapped[str] = mapped_column(String(16))
    version: Mapped[int] = mapped_column(Integer)
    detail: Mapped[str] = mapped_column(Text)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
