# Error Budget Policy

## What is an Error Budget?

An error budget is the maximum amount of time a service can fail without violating its SLO. It balances reliability with feature velocity.

```
Error Budget = 1 - SLO

Example: 99.9% SLO = 0.1% error budget
Monthly: 0.1% × 43,200 minutes = 43.2 minutes of allowed downtime
```

## Current Error Budgets

| Service | SLO | Monthly Budget | Current Usage |
|---------|-----|----------------|---------------|
| API | 99.9% | 43.2 min | Track in Grafana |
| Frontend | 99.9% | 43.2 min | Track in Grafana |
| Worker | 99.5% | 216 min | Track in Grafana |

## Error Budget Policy

### Green Zone (Budget > 50%)

**Status**: Normal operations

**Allowed**:
- Full feature development velocity
- Experimentation and innovation
- Normal change velocity

### Yellow Zone (Budget 25-50%)

**Status**: Caution required

**Actions**:
- Review recent incidents
- Prioritize reliability fixes
- Slow down risky changes
- Increase testing coverage

### Red Zone (Budget < 25%)

**Status**: Reliability focus

**Actions**:
- Feature freeze (except reliability)
- Daily error budget reviews
- Incident review for all issues
- Accelerate reliability improvements

### Budget Exhausted (Budget ≤ 0%)

**Status**: Emergency

**Actions**:
- Complete feature freeze
- All hands on reliability
- Executive escalation
- Post-incident review required

## Tracking Error Budget

### Prometheus Query

```promql
# Error budget remaining (percentage)
(
  1 - (
    sum(increase(devops_api_http_requests_total{status=~"5.."}[30d])) /
    sum(increase(devops_api_http_requests_total[30d]))
  )
) / (1 - 0.999) * 100
```

### Grafana Dashboard

Create a dashboard panel showing:
- Error budget remaining (gauge)
- Budget burn rate (graph)
- Budget consumption over time (graph)
- Incidents impact on budget

## Error Budget Burn Rate

### Burn Rate Calculation

```
Burn Rate = Error Rate / Error Budget

Example:
- SLO: 99.9%
- Error Budget: 0.1%
- Current Error Rate: 0.5%
- Burn Rate: 0.5% / 0.1% = 5x

At 5x burn rate, 30-day budget exhausted in 6 days
```

### Burn Rate Alerts

```yaml
# Fast burn - budget gone in 2 hours
- alert: ErrorBudgetFastBurn
  expr: |
    (
      sum(rate(devops_api_http_requests_total{status=~"5.."}[5m])) /
      sum(rate(devops_api_http_requests_total[5m]))
    ) > (14.4 * 0.001)
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Error budget burning at 14.4x rate"

# Slow burn - budget gone in 3 days
- alert: ErrorBudgetSlowBurn
  expr: |
    (
      sum(rate(devops_api_http_requests_total{status=~"5.."}[1h])) /
      sum(rate(devops_api_http_requests_total[1h]))
    ) > (3 * 0.001)
  for: 30m
  labels:
    severity: warning
  annotations:
    summary: "Error budget burning at 3x rate"
```

## Error Budget Reviews

### Weekly Review

- Current budget status
- Recent incidents and their impact
- Upcoming risky changes
- Remediation progress

### Monthly Review

- Full budget consumption analysis
- Pattern identification
- SLO adjustments if needed
- Team velocity vs reliability balance

## Using Error Budget

### Funding Reliability Work

When error budget is consumed:
1. Calculate cost of reliability issues
2. Prioritize reliability improvements
3. Allocate engineering time
4. Track ROI of improvements

### Negotiating Features

Use error budget to make data-driven decisions:
- "We have 30 minutes of budget left. This deployment is risky."
- "We've consumed 80% of budget. Let's skip the experiment."
- "Budget is healthy. We can try the new feature flag."

## Example: Incident Impact

```
Incident Duration: 15 minutes
Affected Requests: 10,000
Failed Requests: 10,000
Total Requests (month): 10,000,000

Impact = 10,000 / 10,000,000 = 0.1%
Budget Consumed = 0.1% / 0.1% = 100% (entire budget!)
```

## Best Practices

1. **Track continuously** - Don't wait for monthly reviews
2. **Automate alerts** - Get notified of burn rate changes
3. **Visible dashboards** - Everyone should see budget status
4. **Blameless reviews** - Focus on systems, not people
5. **Realistic SLOs** - Don't set unachievable targets
