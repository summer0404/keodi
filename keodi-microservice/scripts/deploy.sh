#!/bin/bash
set -euo pipefail

TAG=${1:-latest}
DEPLOY_DIR="/opt/keodi"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-summer0404/keodi}"

cd "$DEPLOY_DIR"
export GITHUB_REPOSITORY TAG
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker image prune -f
sleep 30
docker compose -f docker-compose.prod.yml ps
echo "Deploy complete (tag: $TAG)"
