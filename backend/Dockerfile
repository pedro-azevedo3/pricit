FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "scripts/encrypted_run.py", "sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host ${UVICORN_HOST:-0.0.0.0} --port ${PORT:-8000} --no-access-log"]
