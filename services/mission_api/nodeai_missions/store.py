from datetime import datetime, timedelta, timezone
import uuid
from sqlalchemy import create_engine, exists, func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import aliased, sessionmaker
from .models import Mission, MissionEvent

LEASED = ('dispatching', 'running')
ACTIVE = (*LEASED, 'unknown')
TERMINAL = ('succeeded', 'cancelled', 'rejected', 'failed')


class Conflict(Exception):
    pass


class Missing(Exception):
    pass


def view(mission):
    return {key: getattr(mission, key) for key in ['id', 'robot_id', 'request', 'state', 'version',
            'worker_id', 'dispatch_token', 'lease_until', 'created_at', 'updated_at']}


def record(session, mission, state, detail):
    mission.state = state
    mission.version += 1
    mission.updated_at = datetime.now(timezone.utc)
    session.add(MissionEvent(mission_id=mission.id, state=state, version=mission.version, detail=detail))


class Store:
    def __init__(self, url):
        if not url.startswith('postgresql+psycopg://'):
            raise ValueError('Use a PostgreSQL psycopg database URL')
        self.engine = create_engine(url, pool_pre_ping=True, pool_size=5, max_overflow=5,
                                    connect_args={'connect_timeout': 3, 'options': '-c statement_timeout=5000'})
        self.sessions = sessionmaker(self.engine, expire_on_commit=False)

    def ready(self):
        with self.engine.connect() as connection:
            connection.execute(text('SELECT id FROM missions LIMIT 0'))

    def mission_counts(self):
        expired = func.count().filter(
            Mission.state.in_(LEASED), Mission.lease_until < func.now()
        )
        query = select(Mission.state, func.count(), expired).group_by(Mission.state)
        counts = dict.fromkeys(('queued', *ACTIVE, *TERMINAL), 0)
        expired_count = 0
        with self.sessions() as session:
            for state, count, expired_in_state in session.execute(query):
                counts[state] = count
                expired_count += expired_in_state
        return counts, expired_count

    def submit(self, key, payload):
        with self.sessions.begin() as session:
            mission = session.execute(insert(Mission).values(id=uuid.uuid4(), idempotency_key=key,
                robot_id=payload['robot_id'], request=payload, state='queued', version=1)
                .on_conflict_do_nothing(index_elements=['idempotency_key']).returning(Mission)).scalar_one_or_none()
            created = mission is not None
            if mission is None:
                mission = session.scalar(select(Mission).where(Mission.idempotency_key == key))
                if mission.request != payload:
                    raise Conflict('Idempotency key already belongs to a different request')
            else:
                session.add(MissionEvent(mission_id=mission.id, state='queued', version=1, detail='Mission accepted'))
            session.flush()
            return view(mission), created

    def get(self, mission_id):
        with self.sessions.begin() as session:
            mission = session.get(Mission, mission_id)
            if mission is None: raise Missing()
            return view(mission)

    def events(self, mission_id, after, limit):
        with self.sessions.begin() as session:
            if session.get(Mission, mission_id) is None: raise Missing()
            rows = session.scalars(select(MissionEvent).where(MissionEvent.mission_id == mission_id,
                MissionEvent.sequence > after).order_by(MissionEvent.sequence).limit(limit))
            return [dict(sequence=row.sequence, state=row.state, version=row.version,
                         detail=row.detail, recorded_at=row.recorded_at) for row in rows]

    def claim(self, worker, robots):
        now = datetime.now(timezone.utc)
        try:
            with self.sessions.begin() as session:
                expired = session.scalars(select(Mission).where(Mission.state.in_(LEASED),
                    Mission.lease_until < now).with_for_update(skip_locked=True)).all()
                for mission in expired:
                    record(session, mission, 'unknown', 'Worker lease expired; reconcile before dispatching again')
                session.flush()
                active = aliased(Mission)
                mission = session.scalar(select(Mission).where(Mission.state == 'queued', Mission.robot_id.in_(robots),
                    ~exists(select(active.id).where(active.robot_id == Mission.robot_id, active.state.in_(ACTIVE))))
                    .order_by(Mission.created_at, Mission.id).with_for_update(skip_locked=True).limit(1))
                if mission is None: return None
                mission.worker_id, mission.dispatch_token = worker, uuid.uuid4()
                mission.lease_until = now + timedelta(seconds=30)
                record(session, mission, 'dispatching', 'Worker claimed mission')
                session.flush()
                return view(mission)
        except IntegrityError as error:
            # The partial unique index arbitrates two workers racing for one robot.
            if getattr(error.orig, 'sqlstate', None) == '23505': return None
            raise

    def report(self, mission_id, worker, token, state=None, detail='Worker heartbeat'):
        with self.sessions.begin() as session:
            mission = session.scalar(select(Mission).where(Mission.id == mission_id).with_for_update())
            if mission is None: raise Missing()
            if mission.worker_id != worker or mission.dispatch_token != token:
                raise Conflict('Worker does not own this dispatch')
            if mission.state in TERMINAL:
                if state == mission.state: return view(mission)
                raise Conflict('Mission is already terminal')
            if mission.state == 'queued': raise Conflict('Mission has not been dispatched')
            if mission.lease_until < datetime.now(timezone.utc) and mission.state != 'unknown':
                record(session, mission, 'unknown', 'Worker lease expired; late evidence requires reconciliation')
            if state is None:
                # A late heartbeat never revives an uncertain dispatch.
                if mission.state != 'unknown': mission.lease_until = datetime.now(timezone.utc) + timedelta(seconds=30)
            elif mission.state == 'unknown' and state not in TERMINAL:
                if state != 'unknown': raise Conflict('Uncertain dispatch requires terminal evidence')
            else:
                if state != mission.state: record(session, mission, state, detail)
                mission.lease_until = datetime.now(timezone.utc) + timedelta(seconds=30)
            session.flush()
            return view(mission)

    def reconcile(self, mission_id, version, state, reason):
        with self.sessions.begin() as session:
            mission = session.scalar(select(Mission).where(Mission.id == mission_id).with_for_update())
            if mission is None: raise Missing()
            if mission.state != 'unknown' or mission.version != version:
                raise Conflict('Mission state or version changed; reload before reconciling')
            record(session, mission, state, 'Operator reconciliation: ' + reason)
            session.flush()
            return view(mission)
