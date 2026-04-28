#!/bin/bash
# =============================================================================
# Manual Deploy Script (run on VPS)
# Usage: ./deploy.sh [tag]
# Example: ./deploy.sh v1.0.0
# =============================================================================

set -euo pipefail

TAG=${1:-latest}
DEPLOY_DIR="/opt/keodi"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-summer0404/keodi}"

echo "=========================================="
echo "🚀 Deploying Keodi (tag: $TAG)"
echo "=========================================="

cd "$DEPLOY_DIR"

# Pull latest images
echo "📥 Pulling images..."
export GITHUB_REPOSITORY TAG
docker compose -f docker-compose.prod.yml pull

# Deploy
echo "🚀 Starting services..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# Monitoring
echo "📊 Starting monitoring..."
docker compose -f docker-compose.monitoring.yml up -d --remove-orphans

# Cleanup
docker image prune -f

# Wait & check
echo "⏳ Waiting 30s for services..."
sleep 30

echo ""
echo "🔍 Application services:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "📊 Monitoring services:"
docker compose -f docker-compose.monitoring.yml ps

echo ""
echo "✅ Deploy complete! (tag: $TAG)"
