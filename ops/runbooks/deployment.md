# Deployment Runbook

## Pre-Deployment Checklist

- [ ] All tests passing in CI
- [ ] Security scans completed
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Rollback plan prepared
- [ ] Monitoring dashboards ready
- [ ] Team notified of deployment

## Deployment Methods

### 1. Docker Compose (Development)

```bash
# Pull latest changes
git pull origin main

# Build and deploy
docker compose -f infra/docker/docker-compose.dev.yml up --build -d

# Verify
docker compose ps
curl http://localhost:8080/health
```

### 2. Kubernetes with Kustomize (Recommended)

```bash
# Update image tags
cd infra/k8s/overlays/dev
kustomize edit set image ghcr.io/devops-platform-master/api:v1.2.3

# Dry run
kustomize build . | kubectl apply --dry-run=client -f -

# Apply
kustomize build . | kubectl apply -f -

# Monitor rollout
kubectl rollout status deployment/api -n devops-platform --timeout=300s
```

### 3. Helm

```bash
# Update values
helm upgrade devops-platform infra/helm/devops-platform-master \
  --namespace devops-platform \
  --set api.image.tag=v1.2.3 \
  --set frontend.image.tag=v1.2.3 \
  --wait

# Verify
helm status devops-platform -n devops-platform
```

## Deployment Steps

### Step 1: Prepare

```bash
# Verify you're on the correct cluster
kubectl config current-context

# Verify namespace
kubectl get pods -n devops-platform
```

### Step 2: Database Migrations (if needed)

```bash
# Run migrations
kubectl exec -it deployment/api -n devops-platform -- npx prisma migrate deploy

# Verify
kubectl exec -it deployment/api -n devops-platform -- npx prisma migrate status
```

### Step 3: Deploy

```bash
# Apply new configuration
kustomize build infra/k8s/overlays/prod | kubectl apply -f -

# Watch rollout
kubectl rollout status deployment/api -n devops-platform -w
kubectl rollout status deployment/frontend -n devops-platform -w
kubectl rollout status deployment/worker -n devops-platform -w
```

### Step 4: Verify

```bash
# Check pod status
kubectl get pods -n devops-platform

# Check health
kubectl exec -it deployment/api -n devops-platform -- wget -qO- http://localhost:8080/health

# Run smoke tests
./ci/scripts/smoke_test.sh http://api:8080
```

### Step 5: Monitor

- Watch Grafana dashboards for 15 minutes
- Check error rates
- Monitor latency
- Watch for alerts

## Rollback Procedure

### Immediate Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/api -n devops-platform
kubectl rollout undo deployment/frontend -n devops-platform
kubectl rollout undo deployment/worker -n devops-platform

# Verify rollback
kubectl rollout status deployment/api -n devops-platform
```

### Rollback to Specific Version

```bash
# Check history
kubectl rollout history deployment/api -n devops-platform

# Rollback to specific revision
kubectl rollout undo deployment/api -n devops-platform --to-revision=2
```

### Helm Rollback

```bash
# List releases
helm history devops-platform -n devops-platform

# Rollback
helm rollback devops-platform 3 -n devops-platform
```

## Blue-Green Deployment

```bash
# Deploy new version as "green"
kubectl apply -f deployment-green.yaml

# Verify green is healthy
kubectl exec -it deployment/api-green -- wget -qO- http://localhost:8080/health

# Switch traffic to green
kubectl patch service api -p '{"spec":{"selector":{"version":"green"}}}'

# Verify
kubectl get endpoints api

# Remove old blue deployment (after verification)
kubectl delete deployment api-blue
```

## Canary Deployment

```bash
# Deploy canary (10% traffic)
kubectl apply -f deployment-canary.yaml

# Monitor canary metrics for 30 minutes
# Check error rate, latency

# If good, scale canary to 50%
kubectl scale deployment/api-canary --replicas=5

# If still good, complete rollout
kubectl scale deployment/api --replicas=0
kubectl scale deployment/api-canary --replicas=10
```

## Post-Deployment

1. **Verify Functionality**
   - Test critical user flows
   - Check logs for errors
   - Monitor metrics

2. **Communicate**
   - Update deployment log
   - Notify team of completion
   - Update status page if needed

3. **Document**
   - Record deployment time
   - Note any issues
   - Update runbook if needed

## Troubleshooting

### Deployment Stuck

```bash
# Check pod status
kubectl describe pod -l app=api -n devops-platform

# Check events
kubectl get events -n devops-platform --sort-by='.lastTimestamp'

# Check resource limits
kubectl top nodes
kubectl top pods -n devops-platform
```

### Image Pull Errors

```bash
# Verify image exists
docker pull ghcr.io/devops-platform-master/api:v1.2.3

# Check image pull secrets
kubectl get secrets -n devops-platform
kubectl describe secret registry-credentials -n devops-platform
```

### Migration Failures

```bash
# Check migration status
kubectl exec -it deployment/api -- npx prisma migrate status

# Manual fix (if needed)
kubectl exec -it deployment/api -- npx prisma migrate resolve --applied <migration_name>
```
