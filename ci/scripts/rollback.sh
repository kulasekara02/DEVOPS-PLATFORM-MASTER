#!/bin/bash
# =============================================================================
# Rollback Script
# =============================================================================
# Usage: ./rollback.sh [namespace] [deployment]
# =============================================================================

set -euo pipefail

NAMESPACE="${1:-devops-platform}"
DEPLOYMENT="${2:-all}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

rollback_deployment() {
  local deployment=$1
  log_info "Rolling back $deployment..."
  kubectl rollout undo deployment/"$deployment" -n "$NAMESPACE"
  kubectl rollout status deployment/"$deployment" -n "$NAMESPACE" --timeout=120s
  log_success "$deployment rolled back successfully"
}

main() {
  log_warning "Starting rollback in namespace: $NAMESPACE"

  if [[ "$DEPLOYMENT" == "all" ]]; then
    local deployments=$(kubectl get deployments -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}')
    for dep in $deployments; do
      rollback_deployment "$dep"
    done
  else
    rollback_deployment "$DEPLOYMENT"
  fi

  log_success "Rollback completed!"
  kubectl get pods -n "$NAMESPACE"
}

main
