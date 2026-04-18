FROM python:3.13-slim AS base

WORKDIR /app

# Install system deps for psycopg2/asyncpg and GeoAlchemy2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc gdal-bin && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps first (cacheable layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Non-root user for security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
