#!/bin/bash
# =============================================================================
# Build Script - Build Docker images
# =============================================================================
# Usage: ./build.sh [service] [version] [commit_sha]
# Examples:
#   ./build.sh all v1.0.0 abc123
#   ./build.sh api latest
#   ./build.sh frontend
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_PREFIX="${IMAGE_PREFIX:-devops-platform-master}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Arguments
SERVICE="${1:-all}"
VERSION="${2:-latest}"
COMMIT_SHA="${3:-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Build a single service
build_service() {
  local service=$1
  local dockerfile="$PROJECT_ROOT/infra/docker/Dockerfile.$service"

  if [[ ! -f "$dockerfile" ]]; then
    log_error "Dockerfile not found: $dockerfile"
    return 1
  fi

  log_info "Building $service..."

  local image_name="$REGISTRY/$IMAGE_PREFIX/$service"
  local tags=(
    "$image_name:$VERSION"
    "$image_name:$COMMIT_SHA"
  )

  # Add latest tag if building main version
  if [[ "$VERSION" == "latest" ]] || [[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    tags+=("$image_name:latest")
  fi

  # Build tag arguments
  local tag_args=""
  for tag in "${tags[@]}"; do
    tag_args="$tag_args -t $tag"
  done

  # Build the image
  docker build \
    $tag_args \
    --build-arg VERSION="$VERSION" \
    --build-arg COMMIT_SHA="$COMMIT_SHA" \
    --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -f "$dockerfile" \
    --target production \
    "$PROJECT_ROOT"

  if [[ $? -eq 0 ]]; then
    log_success "Built $service successfully"
    for tag in "${tags[@]}"; do
      echo "  - $tag"
    done
  else
    log_error "Failed to build $service"
    return 1
  fi
}

# Main
main() {
  log_info "Starting build process..."
  log_info "Version: $VERSION"
  log_info "Commit: $COMMIT_SHA"

  cd "$PROJECT_ROOT"

  if [[ "$SERVICE" == "all" ]]; then
    local services=("frontend" "api" "worker")
    local failed=0

    for svc in "${services[@]}"; do
      if ! build_service "$svc"; then
        ((failed++))
      fi
    done

    if [[ $failed -gt 0 ]]; then
      log_error "$failed service(s) failed to build"
      exit 1
    fi
  else
    if ! build_service "$SERVICE"; then
      exit 1
    fi
  fi

  log_success "Build process completed!"
}

main
