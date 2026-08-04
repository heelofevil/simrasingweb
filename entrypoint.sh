#!/bin/sh
set -e

echo "Waiting for Postgres..."
python - <<'PY'
import os, time
import psycopg2

url = os.environ["DATABASE_URL"].replace("postgresql+psycopg2://", "postgresql://")
for i in range(30):
    try:
        conn = psycopg2.connect(url)
        conn.close()
        print("Postgres is ready")
        break
    except Exception as e:
        print(f"Waiting... ({i+1}/30): {e}")
        time.sleep(1)
else:
    raise SystemExit("Postgres did not become ready in time")
PY

echo "Initializing database schema..."
python -c "from app import init_db; init_db()"

exec gunicorn -b 0.0.0.0:8000 -w 2 --access-logfile - --error-logfile - wsgi:app
