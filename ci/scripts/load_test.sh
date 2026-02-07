#!/bin/bash
# =============================================================================
# Load Test Script
# =============================================================================
# Runs load tests using k6
# Usage: ./load_test.sh [base_url] [duration] [vus]
# =============================================================================

set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
DURATION="${2:-30s}"
VUS="${3:-10}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# Check if k6 is installed
if ! command -v k6 &>/dev/null; then
  echo "k6 is not installed. Install with: brew install k6"
  exit 1
fi

# Create temporary k6 script
K6_SCRIPT=$(mktemp)
cat > "$K6_SCRIPT" << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  vus: __ENV.VUS || 10,
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  // Health check
  let res = http.get(`${BASE_URL}/health`);
  check(res, {
    'health status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(0.5);

  // API root
  res = http.get(`${BASE_URL}/api/v1`);
  check(res, {
    'api root status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(0.5);

  // List items
  res = http.get(`${BASE_URL}/api/v1/items`);
  check(res, {
    'items list status is 200': (r) => r.status === 200,
    'items has data': (r) => JSON.parse(r.body).data !== undefined,
  }) || errorRate.add(1);

  sleep(0.5);

  // Stats endpoint
  res = http.get(`${BASE_URL}/api/v1/stats`);
  check(res, {
    'stats status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}
EOF

log_info "Starting load test..."
log_info "Target: $BASE_URL"
log_info "Duration: $DURATION"
log_info "Virtual Users: $VUS"

k6 run \
  -e BASE_URL="$BASE_URL" \
  -e DURATION="$DURATION" \
  -e VUS="$VUS" \
  "$K6_SCRIPT"

# Cleanup
rm -f "$K6_SCRIPT"

log_success "Load test completed!"
