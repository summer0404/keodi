FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    build-essential \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

RUN prisma generate --schema=app/database/schema.prisma

EXPOSE 3004

CMD ["uvicorn", "app.main:app"]