#!/bin/bash

set -e

echo "=== Stopping containers and removing volumes ==="
docker compose down -v

echo "=== Pruning Docker system ==="
docker system prune -af

echo "=== Building containers ==="
docker compose build --no-cache

echo "=== Starting containers ==="
docker compose up -d

echo "=== Waiting for PostgreSQL to be ready ==="
until docker compose exec postgres pg_isready -U complif -d onboarding_db &> /dev/null; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo "=== Seeding database ==="
cd onboarding-api
npx prisma migrate dev
npx prisma generate
npx prisma db seed

echo "=== Done! ==="
