import os
from pathlib import Path
import sys
import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from nodeai_missions.api import create_app


@pytest.fixture(scope='session')
def app():
    # This must be an isolated test database: each test truncates these two tables.
    url = os.environ['NODEAI_TEST_DATABASE_URL']
    config = Config(str(ROOT/'alembic.ini'))
    config.set_main_option('sqlalchemy.url', url)
    command.upgrade(config, 'head')
    application = create_app(url, 'operator-test-token', 'worker-test-token')
    yield application
    application.state.store.engine.dispose()


@pytest.fixture
def client(app):
    with app.state.store.engine.begin() as connection:
        connection.execute(text('TRUNCATE mission_events, missions RESTART IDENTITY CASCADE'))
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def operator(): return {'Authorization': 'Bearer operator-test-token'}


@pytest.fixture
def worker(): return {'Authorization': 'Bearer worker-test-token'}
