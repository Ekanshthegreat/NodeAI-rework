FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
COPY services/mission_api/requirements.lock .
RUN pip install --no-cache-dir -r requirements.lock && useradd --create-home --uid 10001 nodeai
COPY services/mission_api/nodeai_missions nodeai_missions
COPY services/mission_api/migrations migrations
COPY services/mission_api/alembic.ini .
USER nodeai
CMD ["uvicorn", "nodeai_missions.api:application", "--factory", "--host", "0.0.0.0", "--port", "8000", "--limit-concurrency", "100"]
