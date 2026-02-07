#!/bin/bash
# =============================================================================
# Security Scan Script
# =============================================================================
# Usage: ./scan.sh [images|deps|secrets|sbom|all]
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCAN_TYPE="${1:-all}"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_PREFIX="${IMAGE_PREFIX:-devops-platform-master}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

scan_images() {
  log_info "Scanning Docker images with Trivy..."

  if ! command -v trivy &>/dev/null; then
    log_warning "Trivy not installed. Install with: brew install trivy"
    return 0
  fi

  local services=("frontend" "api" "worker")

  for service in "${services[@]}"; do
    local image="$REGISTRY/$IMAGE_PREFIX/$service:$IMAGE_TAG"
    log_info "Scanning $service..."

    trivy image --severity HIGH,CRITICAL "$image" || true
  done
}

scan_dependencies() {
  log_info "Scanning dependencies for vulnerabilities..."

  local services=("api" "frontend" "worker")

  for service in "${services[@]}"; do
    local dir="$PROJECT_ROOT/app/$service"
    if [[ -d "$dir" && -f "$dir/package.json" ]]; then
      log_info "Auditing $service dependencies..."
      cd "$dir"
      npm audit --audit-level=high || true
    fi
  done
}

scan_secrets() {
  log_info "Scanning for secrets in codebase..."

  if command -v gitleaks &>/dev/null; then
    gitleaks detect --source "$PROJECT_ROOT" --verbose || true
  elif command -v trufflehog &>/dev/null; then
    trufflehog filesystem "$PROJECT_ROOT" || true
  else
    log_warning "No secret scanner installed (gitleaks or trufflehog)"
  fi
}

generate_sbom() {
  log_info "Generating Software Bill of Materials..."

  if ! command -v syft &>/dev/null; then
    log_warning "Syft not installed. Install with: brew install syft"
    return 0
  fi

  mkdir -p "$PROJECT_ROOT/scan-results"

  local services=("frontend" "api" "worker")

  for service in "${services[@]}"; do
    local image="$REGISTRY/$IMAGE_PREFIX/$service:$IMAGE_TAG"
    local output="$PROJECT_ROOT/scan-results/sbom-$service.spdx.json"

    log_info "Generating SBOM for $service..."
    syft "$image" -o spdx-json > "$output" || true
    log_success "SBOM saved to $output"
  done
}

main() {
  log_info "Starting security scan: $SCAN_TYPE"

  case "$SCAN_TYPE" in
    images)
      scan_images
      ;;
    deps)
      scan_dependencies
      ;;
    secrets)
      scan_secrets
      ;;
    sbom)
      generate_sbom
      ;;
    all)
      scan_dependencies
      scan_secrets
      scan_images
      generate_sbom
      ;;
    *)
      echo "Usage: $0 [images|deps|secrets|sbom|all]"
      exit 1
      ;;
  esac

  log_success "Security scan completed!"
}

main
