#!/bin/bash
set -euo pipefail

DEPLOY_DIR="/opt/keodi"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-summer0404/keodi}"
REGISTRY="ghcr.io/${GITHUB_REPOSITORY}"

if [ -z "${1:-}" ]; then
    echo "Usage: ./rollback.sh <version-tag>"
    echo ""
    for svc in api-gateway auth-service core-service notification-service intelligence-service; do
        echo "$svc:"
        docker images "${REGISTRY}/${svc}" --format "  {{.Tag}}\t{{.CreatedAt}}" | head -5
    done
    exit 1
fi

TAG=$1
cd "$DEPLOY_DIR"
export GITHUB_REPOSITORY TAG

for svc in api-gateway auth-service core-service notification-service intelligence-service; do
    docker pull "${REGISTRY}/${svc}:${TAG}" || echo "${svc}:${TAG} not found, skipping"
done

docker compose -f docker-compose.prod.yml up -d --remove-orphans
sleep 20
docker compose -f docker-compose.prod.yml ps
echo "Rolled back to $TAG"
