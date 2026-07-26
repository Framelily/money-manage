#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== 1. Build frontend ==="
cd "$ROOT/apps/web"
npm ci
npm run build

echo "=== 2. Start services ==="
cd "$ROOT"
docker compose up -d --build

echo ""
echo "=== Done! ==="
echo "App running at http://localhost:8080"
