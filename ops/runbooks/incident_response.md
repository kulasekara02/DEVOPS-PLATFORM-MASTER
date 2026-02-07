# Incident Response Runbook

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P1 - Critical | Complete service outage | < 15 min | All services down, data loss |
| P2 - High | Major feature unavailable | < 30 min | API 50% error rate, auth broken |
| P3 - Medium | Degraded performance | < 2 hours | High latency, minor feature broken |
| P4 - Low | Minor issues | < 24 hours | UI bug, typo, non-critical feature |

## Incident Response Process

### 1. Detection (0-5 min)

- Alert received via monitoring
- User report received
- Anomaly detected in metrics

**Actions:**
1. Acknowledge the alert
2. Assess initial severity
3. Start incident channel (if P1/P2)

### 2. Triage (5-15 min)

**Quick Health Check:**
```bash
# Check overall health
curl -s http://api:8080/health/ready | jq

# Check all services
kubectl get pods -n devops-platform
docker compose ps

# Check recent events
kubectl get events -n devops-platform --sort-by='.lastTimestamp' | tail -20
```

**Identify Impact:**
- Which services are affected?
- How many users are impacted?
- Is data at risk?

### 3. Communication (Ongoing)

**P1/P2 Incidents:**
1. Create incident channel: `#incident-YYYY-MM-DD-brief-description`
2. Post initial status update
3. Assign roles:
   - **Incident Commander (IC)**: Coordinates response
   - **Technical Lead**: Drives investigation
   - **Communications Lead**: Updates stakeholders

**Status Update Template:**
```
**Incident Update - [TIME]**
- Status: [Investigating/Identified/Monitoring/Resolved]
- Impact: [Description of user impact]
- Current Actions: [What we're doing]
- Next Update: [Time]
```

### 4. Investigation

**Systematic Debugging:**

```bash
# 1. Check service status
kubectl get pods -n devops-platform
kubectl describe pod <failing-pod> -n devops-platform

# 2. Check logs
kubectl logs <pod> -n devops-platform --tail=100
kubectl logs <pod> -n devops-platform --previous

# 3. Check metrics
# Access Grafana dashboards
# Look for anomalies in:
# - Error rate
# - Latency
# - Resource usage

# 4. Check dependencies
kubectl exec -it <api-pod> -n devops-platform -- nc -zv postgres 5432
kubectl exec -it <api-pod> -n devops-platform -- nc -zv redis 6379

# 5. Check recent changes
git log --oneline -20
kubectl rollout history deployment/api -n devops-platform
```

### 5. Mitigation

**Quick Fixes (in order of preference):**

1. **Rollback** (if recent deploy caused issue):
```bash
kubectl rollout undo deployment/api -n devops-platform
kubectl rollout status deployment/api -n devops-platform
```

2. **Scale Up** (if capacity issue):
```bash
kubectl scale deployment/api -n devops-platform --replicas=10
```

3. **Restart** (if temporary issue):
```bash
kubectl rollout restart deployment/api -n devops-platform
```

4. **Failover** (if infrastructure issue):
- Switch to backup region
- Enable maintenance mode

### 6. Resolution

**Verify Fix:**
```bash
# Check health
curl -s http://api:8080/health/ready | jq

# Monitor metrics for 10 minutes
# Verify error rate is back to normal
# Check user reports
```

**Close Incident:**
1. Confirm all systems operational
2. Post final status update
3. Document timeline
4. Schedule post-mortem (for P1/P2)

### 7. Post-Mortem

**Within 48 hours of P1/P2 incidents:**

1. **Timeline**: What happened and when
2. **Root Cause**: Why it happened
3. **Impact**: Users affected, duration
4. **Detection**: How we found out
5. **Response**: What we did
6. **Action Items**: How to prevent recurrence

---

## Common Scenarios

### API Returning 5xx Errors

1. Check API logs for exceptions
2. Verify database connectivity
3. Check memory/CPU limits
4. Review recent deployments
5. Rollback if needed

### Database Connection Issues

1. Check PostgreSQL pod status
2. Verify connection credentials
3. Check connection pool exhaustion
4. Review for slow queries
5. Check disk space

### High Latency

1. Check API metrics for P95
2. Look for slow database queries
3. Check Redis cache hit rate
4. Review for N+1 queries
5. Check external service latency

### Out of Memory

1. Check memory metrics
2. Increase memory limits
3. Look for memory leaks
4. Review recent changes
5. Scale horizontally

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| On-Call Engineer | See PagerDuty |
| Engineering Lead | TBD |
| Product Owner | TBD |

## Quick Links

- Grafana: http://localhost:3001
- Prometheus: http://localhost:9090
- Jaeger: http://localhost:16686
- API Health: http://localhost:8080/health
