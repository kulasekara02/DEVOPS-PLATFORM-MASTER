#!/bin/bash
# =============================================================================
# Lint Script - Run all linters
# =============================================================================
# Usage: ./lint.sh [--fix]
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIX_MODE="${1:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

ERRORS=0

# Lint JavaScript/TypeScript
lint_js() {
  log_info "Linting JavaScript/TypeScript..."

  local services=("api" "frontend" "worker")

  for service in "${services[@]}"; do
    local dir="$PROJECT_ROOT/app/$service"
    if [[ -d "$dir" && -f "$dir/package.json" ]]; then
      log_info "Linting $service..."
      cd "$dir"

      if [[ "$FIX_MODE" == "--fix" ]]; then
        npm run lint:fix 2>/dev/null || npm run lint -- --fix || true
      else
        if ! npm run lint 2>/dev/null; then
          log_error "$service lint failed"
          ((ERRORS++))
        fi
      fi
    fi
  done
}

# Lint Dockerfiles
lint_docker() {
  log_info "Linting Dockerfiles..."

  if command -v hadolint &>/dev/null; then
    for dockerfile in "$PROJECT_ROOT"/infra/docker/Dockerfile.*; do
      if [[ -f "$dockerfile" ]]; then
        log_info "Checking $(basename "$dockerfile")..."
        if ! hadolint "$dockerfile"; then
          ((ERRORS++))
        fi
      fi
    done
  else
    log_info "hadolint not installed, skipping Dockerfile lint"
  fi
}

# Lint YAML files
lint_yaml() {
  log_info "Linting YAML files..."

  if command -v yamllint &>/dev/null; then
    find "$PROJECT_ROOT" -name "*.yaml" -o -name "*.yml" | \
      grep -v node_modules | \
      grep -v .git | \
      while read -r file; do
        if ! yamllint -d relaxed "$file" 2>/dev/null; then
          log_error "YAML lint failed: $file"
          ((ERRORS++))
        fi
      done
  else
    log_info "yamllint not installed, skipping YAML lint"
  fi
}

# Lint shell scripts
lint_shell() {
  log_info "Linting shell scripts..."

  if command -v shellcheck &>/dev/null; then
    find "$PROJECT_ROOT/ci/scripts" -name "*.sh" | while read -r script; do
      log_info "Checking $(basename "$script")..."
      if ! shellcheck "$script"; then
        ((ERRORS++))
      fi
    done
  else
    log_info "shellcheck not installed, skipping shell lint"
  fi
}

# Validate Kubernetes manifests
lint_k8s() {
  log_info "Validating Kubernetes manifests..."

  if command -v kubectl &>/dev/null; then
    find "$PROJECT_ROOT/infra/k8s" -name "*.yaml" | \
      grep -v kustomization | \
      while read -r manifest; do
        if ! kubectl apply --dry-run=client -f "$manifest" 2>/dev/null; then
          log_error "Invalid K8s manifest: $manifest"
          ((ERRORS++))
        fi
      done
  else
    log_info "kubectl not installed, skipping K8s validation"
  fi
}

# Main
main() {
  log_info "Starting lint process..."

  lint_js
  lint_docker
  lint_yaml
  lint_shell
  lint_k8s

  echo ""
  if [[ $ERRORS -gt 0 ]]; then
    log_error "Linting completed with $ERRORS error(s)"
    exit 1
  else
    log_success "All lint checks passed!"
  fi
}

main
