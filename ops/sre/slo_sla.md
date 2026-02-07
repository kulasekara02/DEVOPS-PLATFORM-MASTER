# Service Level Objectives (SLOs) and SLAs

## Overview

This document defines the reliability targets for the DevOps Platform.

## Service Level Indicators (SLIs)

### Availability
- **Definition**: Percentage of successful requests
- **Measurement**: `(successful_requests / total_requests) * 100`
- **Good Event**: HTTP status < 500

### Latency
- **Definition**: Response time for requests
- **Measurement**: P50, P95, P99 percentiles
- **Good Event**: Response time < threshold

### Error Rate
- **Definition**: Percentage of failed requests
- **Measurement**: `(5xx_responses / total_requests) * 100`

## Service Level Objectives (SLOs)

| Service | SLI | Target | Window |
|---------|-----|--------|--------|
| API | Availability | 99.9% | 30 days |
| API | Latency (P95) | < 200ms | 30 days |
| API | Error Rate | < 0.1% | 30 days |
| Frontend | Availability | 99.9% | 30 days |
| Frontend | Latency (P95) | < 500ms | 30 days |
| Worker | Job Success Rate | 99.5% | 30 days |
| Worker | Job Processing Time (P95) | < 60s | 30 days |

## Error Budgets

### Calculation

```
Error Budget = 100% - SLO
Monthly Error Budget = Error Budget * (minutes in month)

Example for 99.9% SLO:
Error Budget = 0.1%
Monthly Budget = 0.001 * 43,200 = 43.2 minutes of downtime
```

### Current Error Budgets

| Service | SLO | Monthly Budget |
|---------|-----|----------------|
| API | 99.9% | 43 minutes |
| Frontend | 99.9% | 43 minutes |
| Database | 99.99% | 4 minutes |

### Error Budget Policy

1. **Budget > 50%**: Normal development velocity
2. **Budget 25-50%**: Increased focus on reliability
3. **Budget < 25%**: Feature freeze, reliability focus
4. **Budget exhausted**: Emergency response

## SLA (External Commitments)

### Standard SLA

| Metric | Commitment | Measurement Period |
|--------|------------|-------------------|
| Availability | 99.5% | Monthly |
| Response Time | < 1 second (P95) | Monthly |
| Support Response | 24 hours | Per ticket |

### Premium SLA

| Metric | Commitment | Measurement Period |
|--------|------------|-------------------|
| Availability | 99.9% | Monthly |
| Response Time | < 500ms (P95) | Monthly |
| Support Response | 4 hours | Per ticket |

## Monitoring SLOs

### Prometheus Queries

```promql
# Availability (30-day)
sum(rate(devops_api_http_requests_total{status!~"5.."}[30d])) /
sum(rate(devops_api_http_requests_total[30d])) * 100

# P95 Latency
histogram_quantile(0.95,
  sum(rate(devops_api_http_request_duration_seconds_bucket[30d])) by (le)
)

# Error Rate
sum(rate(devops_api_http_requests_total{status=~"5.."}[30d])) /
sum(rate(devops_api_http_requests_total[30d])) * 100

# Error Budget Remaining
(1 - (
  sum(rate(devops_api_http_requests_total{status=~"5.."}[30d])) /
  sum(rate(devops_api_http_requests_total[30d]))
)) / 0.001 * 100
```

### Alerting

```yaml
# Alert when error budget < 25%
- alert: ErrorBudgetLow
  expr: |
    (1 - (sum(rate(devops_api_http_requests_total{status=~"5.."}[30d])) /
    sum(rate(devops_api_http_requests_total[30d])))) / 0.001 * 100 < 25
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Error budget below 25%"

# Alert when SLO breached
- alert: SLOBreach
  expr: |
    sum(rate(devops_api_http_requests_total{status!~"5.."}[30d])) /
    sum(rate(devops_api_http_requests_total[30d])) < 0.999
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Availability SLO breached"
```

## Reporting

### Weekly SLO Report

- Current SLI values
- Error budget consumption
- Incidents impact
- Trend analysis

### Monthly SLO Review

- SLO achievement summary
- Error budget status
- Action items from incidents
- Recommendations

## Improving SLOs

1. **Identify bottlenecks** through tracing
2. **Add redundancy** for critical paths
3. **Implement circuit breakers**
4. **Improve monitoring coverage**
5. **Regular chaos engineering**
