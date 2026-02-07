#!/bin/bash
# =============================================================================
# Test Script - Run tests
# =============================================================================
# Usage: ./test.sh [unit|integration|e2e|all]
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_TYPE="${1:-all}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

run_unit_tests() {
  log_info "Running unit tests..."

  local services=("api" "frontend" "worker")
  local failed=0

  for service in "${services[@]}"; do
    local dir="$PROJECT_ROOT/app/$service"
    if [[ -d "$dir" && -f "$dir/package.json" ]]; then
      log_info "Testing $service..."
      cd "$dir"
      if ! npm run test 2>/dev/null; then
        log_error "$service unit tests failed"
        ((failed++))
      fi
    fi
  done

  return $failed
}

run_integration_tests() {
  log_info "Running integration tests..."
  cd "$PROJECT_ROOT/tests/integration"

  if [[ -f "package.json" ]]; then
    npm install
    npm test
  else
    log_info "No integration tests found"
  fi
}

run_e2e_tests() {
  log_info "Running e2e tests..."
  cd "$PROJECT_ROOT/tests/e2e"

  if [[ -f "package.json" ]]; then
    npm install
    npm test
  else
    log_info "No e2e tests found"
  fi
}

main() {
  log_info "Starting test process: $TEST_TYPE"

  case "$TEST_TYPE" in
    unit)
      run_unit_tests
      ;;
    integration)
      run_integration_tests
      ;;
    e2e)
      run_e2e_tests
      ;;
    all)
      run_unit_tests
      run_integration_tests
      run_e2e_tests
      ;;
    *)
      echo "Usage: $0 [unit|integration|e2e|all]"
      exit 1
      ;;
  esac

  log_success "Tests completed!"
}

main
