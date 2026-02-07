#!/bin/bash
# =============================================================================
# Deploy to Kubernetes Script
# =============================================================================
# Usage: ./deploy_k8s.sh [dev|staging|prod]
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${1:-dev}"

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

# Validate environment
validate_env() {
  case "$ENVIRONMENT" in
    dev|staging|prod)
      log_info "Deploying to: $ENVIRONMENT"
      ;;
    *)
      log_error "Invalid environment: $ENVIRONMENT"
      echo "Usage: $0 [dev|staging|prod]"
      exit 1
      ;;
  esac

  # Extra confirmation for production
  if [[ "$ENVIRONMENT" == "prod" ]]; then
    log_warning "You are about to deploy to PRODUCTION!"
    read -p "Are you sure? Type 'yes' to continue: " confirm
    if [[ "$confirm" != "yes" ]]; then
      log_info "Deployment cancelled"
      exit 0
    fi
  fi
}

# Deploy using Kustomize
deploy() {
  local overlay_path="$PROJECT_ROOT/infra/k8s/overlays/$ENVIRONMENT"

  if [[ ! -d "$overlay_path" ]]; then
    log_error "Overlay not found: $overlay_path"
    exit 1
  fi

  log_info "Building and applying Kustomize manifests..."
  cd "$overlay_path"

  # Dry run first
  log_info "Running dry-run..."
  kustomize build . | kubectl apply --dry-run=client -f -

  # Apply
  log_info "Applying manifests..."
  kustomize build . | kubectl apply -f -

  # Wait for rollout
  local namespace
  case "$ENVIRONMENT" in
    dev) namespace="devops-platform-dev" ;;
    staging) namespace="devops-platform-staging" ;;
    prod) namespace="devops-platform" ;;
  esac

  log_info "Waiting for deployments to be ready..."
  kubectl rollout status deployment -n "$namespace" --timeout=300s

  log_success "Deployment to $ENVIRONMENT completed!"

  # Show status
  echo ""
  kubectl get pods -n "$namespace"
}

main() {
  validate_env
  deploy
}

main
