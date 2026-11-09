from contextlib import asynccontextmanager
import math
import os
import secrets
from typing import Annotated, Literal
import uuid
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field, StrictFloat, StrictInt
from sqlalchemy.exc import SQLAlchemyError
from .store import Conflict, Missing, Store

ID = Annotated[str, Field(pattern=r'^[A-Za-z0-9_-]{1,64}$')]
Number = StrictFloat | StrictInt


class Target(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    x: Annotated[Number, Field(ge=-10000, le=10000)]
    y: Annotated[Number, Field(ge=-10000, le=10000)]
    yaw: Annotated[Number, Field(ge=-math.pi, le=math.pi)]


class NewMission(BaseModel):
    model_config = ConfigDict(extra='forbid')
    robot_id: ID
    targets: Annotated[list[Target], Field(min_length=1, max_length=20)]


class Claim(BaseModel):
    model_config = ConfigDict(extra='forbid')
    worker_id: ID
    robot_ids: Annotated[list[ID], Field(min_length=1, max_length=32)]


class Ownership(BaseModel):
    model_config = ConfigDict(extra='forbid')
    worker_id: ID
    dispatch_token: uuid.UUID


class Report(Ownership):
    state: Literal['running', 'unknown', 'succeeded', 'cancelled', 'rejected', 'failed']
    detail: Annotated[str, Field(min_length=1, max_length=500)]


class Reconcile(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_version: Annotated[int, Field(strict=True, ge=1)]
    state: Literal['succeeded', 'cancelled', 'failed']
    reason: Annotated[str, Field(min_length=10, max_length=500)]


def create_app(database_url, api_token, worker_token):
    if not api_token or not worker_token or api_token == worker_token:
        raise ValueError('Configure different, nonempty API and worker tokens')
    store = Store(database_url)
    @asynccontextmanager
    async def lifespan(_app):
        yield
        store.engine.dispose()
    app = FastAPI(title='NodeAI mission service', lifespan=lifespan)
    app.state.store = store
    def auth(expected):
        def check(authorization: Annotated[str | None, Header()] = None):
            if authorization is None or not secrets.compare_digest(authorization, 'Bearer ' + expected):
                raise HTTPException(401, 'Invalid credentials')
        return check
    operator = Depends(auth(api_token))
    worker = Depends(auth(worker_token))
    @app.exception_handler(Conflict)
    async def conflict(_request, error):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=409, content={'detail': str(error)})
    @app.exception_handler(Missing)
    async def missing(_request, _error):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=404, content={'detail': 'Mission not found'})
    @app.exception_handler(SQLAlchemyError)
    async def unavailable(_request, _error):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content={'detail': 'Mission storage unavailable'})
    @app.get('/healthz')
    def health():
        store.ready()
        return {'status': 'ok'}
    @app.post('/missions', dependencies=[operator])
    def submit(body: NewMission, response: Response, idempotency_key: Annotated[ID, Header()]):
        mission, created = store.submit(idempotency_key, body.model_dump(mode='json'))
        response.status_code = 201 if created else 200
        return mission
    @app.get('/missions/{mission_id}', dependencies=[operator])
    def get(mission_id: uuid.UUID): return store.get(mission_id)
    @app.get('/missions/{mission_id}/events', dependencies=[operator])
    def events(mission_id: uuid.UUID, after: Annotated[int, Query(ge=0)] = 0,
               limit: Annotated[int, Query(ge=1, le=100)] = 100):
        return store.events(mission_id, after, limit)
    @app.post('/worker/claim', dependencies=[worker])
    def claim(body: Claim, response: Response):
        mission = store.claim(body.worker_id, body.robot_ids)
        if mission is None: return Response(status_code=204)
        return mission
    @app.post('/worker/{mission_id}/heartbeat', dependencies=[worker])
    def heartbeat(mission_id: uuid.UUID, body: Ownership):
        return store.report(mission_id, body.worker_id, body.dispatch_token)
    @app.post('/worker/{mission_id}/report', dependencies=[worker])
    def report(mission_id: uuid.UUID, body: Report):
        return store.report(mission_id, body.worker_id, body.dispatch_token, body.state, body.detail)
    @app.post('/missions/{mission_id}/reconcile', dependencies=[operator])
    def reconcile(mission_id: uuid.UUID, body: Reconcile):
        return store.reconcile(mission_id, body.expected_version, body.state, body.reason)
    return app


def application():
    return create_app(os.environ['NODEAI_DATABASE_URL'], os.environ['NODEAI_API_TOKEN'], os.environ['NODEAI_WORKER_TOKEN'])
