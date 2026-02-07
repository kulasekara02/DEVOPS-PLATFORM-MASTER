#!/bin/bash
# =============================================================================
# Smoke Test Script
# =============================================================================
# Runs basic health and functionality tests against deployed environment
# Usage: ./smoke_test.sh [base_url]
# =============================================================================

set -euo pipefail

# Configuration
BASE_URL="${1:-http://localhost:8080}"
TIMEOUT=10
RETRIES=3

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; ((PASSED++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAILED++)); }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# HTTP request with retry
http_request() {
  local method=$1
  local url=$2
  local expected_status=${3:-200}
  local data=${4:-}

  local attempt=1
  while [[ $attempt -le $RETRIES ]]; do
    local response
    local status

    if [[ -n "$data" ]]; then
      response=$(curl -s -w "\n%{http_code}" -X "$method" \
        -H "Content-Type: application/json" \
        -d "$data" \
        --connect-timeout "$TIMEOUT" \
        "$url" 2>/dev/null || echo -e "\n000")
    else
      response=$(curl -s -w "\n%{http_code}" -X "$method" \
        --connect-timeout "$TIMEOUT" \
        "$url" 2>/dev/null || echo -e "\n000")
    fi

    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [[ "$status" == "$expected_status" ]]; then
      echo "$body"
      return 0
    fi

    log_warning "Attempt $attempt failed (status: $status, expected: $expected_status)"
    ((attempt++))
    sleep 2
  done

  return 1
}

# Test functions
test_health_endpoint() {
  log_info "Testing health endpoint..."

  if http_request GET "$BASE_URL/health" 200 >/dev/null; then
    log_success "Health endpoint is accessible"
  else
    log_fail "Health endpoint failed"
  fi
}

test_health_live() {
  log_info "Testing liveness probe..."

  if http_request GET "$BASE_URL/health/live" 200 >/dev/null; then
    log_success "Liveness probe passed"
  else
    log_fail "Liveness probe failed"
  fi
}

test_health_ready() {
  log_info "Testing readiness probe..."

  local response
  if response=$(http_request GET "$BASE_URL/health/ready" 200); then
    local status=$(echo "$response" | jq -r '.status' 2>/dev/null || echo "unknown")
    if [[ "$status" == "healthy" ]]; then
      log_success "Readiness probe passed (status: $status)"
    else
      log_fail "Readiness probe returned unhealthy status: $status"
    fi
  else
    log_fail "Readiness probe failed"
  fi
}

test_api_root() {
  log_info "Testing API root endpoint..."

  local response
  if response=$(http_request GET "$BASE_URL/api/v1" 200); then
    local name=$(echo "$response" | jq -r '.name' 2>/dev/null || echo "")
    if [[ -n "$name" ]]; then
      log_success "API root accessible (name: $name)"
    else
      log_fail "API root returned unexpected response"
    fi
  else
    log_fail "API root endpoint failed"
  fi
}

test_items_list() {
  log_info "Testing items list endpoint..."

  local response
  if response=$(http_request GET "$BASE_URL/api/v1/items" 200); then
    local has_data=$(echo "$response" | jq -r 'has("data")' 2>/dev/null || echo "false")
    if [[ "$has_data" == "true" ]]; then
      log_success "Items list endpoint working"
    else
      log_fail "Items list returned unexpected format"
    fi
  else
    log_fail "Items list endpoint failed"
  fi
}

test_items_create() {
  log_info "Testing item creation..."

  local payload='{"name":"Smoke Test Item","description":"Created by smoke test"}'
  local response

  if response=$(http_request POST "$BASE_URL/api/v1/items" 201 "$payload"); then
    local id=$(echo "$response" | jq -r '.id' 2>/dev/null || echo "")
    if [[ -n "$id" && "$id" != "null" ]]; then
      log_success "Item created successfully (id: $id)"
      # Store for cleanup
      echo "$id" > /tmp/smoke_test_item_id
    else
      log_fail "Item creation returned unexpected response"
    fi
  else
    log_fail "Item creation failed"
  fi
}

test_stats_endpoint() {
  log_info "Testing stats endpoint..."

  local response
  if response=$(http_request GET "$BASE_URL/api/v1/stats" 200); then
    local has_items=$(echo "$response" | jq -r 'has("items")' 2>/dev/null || echo "false")
    if [[ "$has_items" == "true" ]]; then
      log_success "Stats endpoint working"
    else
      log_fail "Stats returned unexpected format"
    fi
  else
    log_fail "Stats endpoint failed"
  fi
}

test_metrics_endpoint() {
  log_info "Testing metrics endpoint..."

  local response
  if response=$(http_request GET "$BASE_URL/metrics" 200); then
    if echo "$response" | grep -q "devops_api"; then
      log_success "Metrics endpoint returning Prometheus metrics"
    else
      log_warning "Metrics endpoint accessible but may not have expected metrics"
      log_success "Metrics endpoint is accessible"
    fi
  else
    log_fail "Metrics endpoint failed"
  fi
}

cleanup() {
  log_info "Cleaning up test data..."

  if [[ -f /tmp/smoke_test_item_id ]]; then
    local item_id=$(cat /tmp/smoke_test_item_id)
    http_request DELETE "$BASE_URL/api/v1/items/$item_id" 204 >/dev/null 2>&1 || true
    rm -f /tmp/smoke_test_item_id
  fi
}

# Main
main() {
  echo ""
  echo "============================================="
  echo "       SMOKE TEST - DevOps Platform"
  echo "============================================="
  echo "Target: $BASE_URL"
  echo "============================================="
  echo ""

  # Wait for service to be ready
  log_info "Waiting for service to be ready..."
  sleep 5

  # Run tests
  test_health_endpoint
  test_health_live
  test_health_ready
  test_api_root
  test_items_list
  test_items_create
  test_stats_endpoint
  test_metrics_endpoint

  # Cleanup
  cleanup

  # Summary
  echo ""
  echo "============================================="
  echo "               TEST SUMMARY"
  echo "============================================="
  echo -e "Passed: ${GREEN}$PASSED${NC}"
  echo -e "Failed: ${RED}$FAILED${NC}"
  echo "============================================="

  if [[ $FAILED -gt 0 ]]; then
    log_fail "Smoke tests failed!"
    exit 1
  else
    log_success "All smoke tests passed!"
    exit 0
  fi
}

main
