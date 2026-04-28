#!/bin/bash
# =============================================================================
# Rollback Script (run on VPS)
# Usage: ./rollback.sh <version-tag>
# Example: ./rollback.sh v1.0.0
# =============================================================================

set -euo pipefail

DEPLOY_DIR="/opt/keodi"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-summer0404/keodi}"
REGISTRY="ghcr.io/${GITHUB_REPOSITORY}"

if [ -z "${1:-}" ]; then
    echo "=========================================="
    echo "🔄 Keodi Rollback"
    echo "=========================================="
    echo ""
    echo "Usage: ./rollback.sh <version-tag>"
    echo "Example: ./rollback.sh v1.0.0"
    echo ""
    echo "Available image tags:"
    echo ""
    for svc in api-gateway auth-service core-service notification-service intelligence-service; do
        echo "  📦 $svc:"
        docker images "${REGISTRY}/${svc}" --format "    {{.Tag}}\t{{.CreatedAt}}" | head -5
        echo ""
    done
    exit 1
fi

TAG=$1

echo "=========================================="
echo "🔄 Rolling back to: $TAG"
echo "=========================================="

cd "$DEPLOY_DIR"

# Pull specific version
echo "📥 Pulling images for tag: $TAG..."
export GITHUB_REPOSITORY
export TAG

for svc in api-gateway auth-service core-service notification-service intelligence-service; do
    echo "  Pulling ${svc}:${TAG}..."
    docker pull "${REGISTRY}/${svc}:${TAG}" || echo "  ⚠️  ${svc}:${TAG} not found, skipping"
done

# Restart with specific tag
echo ""
echo "🚀 Restarting services with tag: $TAG..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# Wait & check
echo "⏳ Waiting 20s..."
sleep 20

echo ""
echo "🔍 Service status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Rolled back to $TAG"
