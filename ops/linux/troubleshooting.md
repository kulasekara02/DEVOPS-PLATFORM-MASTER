# Troubleshooting Guide

Common issues and solutions for the DevOps Platform.

## Docker Issues

### Container Won't Start

```bash
# Check container logs
docker logs <container_name>

# Check container status
docker inspect <container_name> | jq '.[0].State'

# Check resource usage
docker stats --no-stream

# Check for port conflicts
sudo netstat -tulpn | grep <port>
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Docker disk usage
docker system df

# Clean up
docker system prune -a --volumes

# Remove old images
docker image prune -a

# Remove build cache
docker builder prune
```

### Network Issues

```bash
# List networks
docker network ls

# Inspect network
docker network inspect <network_name>

# Recreate network
docker compose down
docker network rm <network_name>
docker compose up -d
```

## Kubernetes Issues

### Pod Not Starting

```bash
# Check pod status
kubectl describe pod <pod_name> -n devops-platform

# Check events
kubectl get events -n devops-platform --sort-by='.lastTimestamp'

# Check logs (including previous container)
kubectl logs <pod_name> -n devops-platform --previous

# Check resource limits
kubectl top pods -n devops-platform
kubectl describe node
```

### Common Pod States

| State | Cause | Solution |
|-------|-------|----------|
| Pending | No resources | Scale down or add nodes |
| ImagePullBackOff | Wrong image | Check image name and registry access |
| CrashLoopBackOff | App crashing | Check logs for errors |
| OOMKilled | Out of memory | Increase memory limits |

### Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints <service> -n devops-platform

# Check service selector matches pod labels
kubectl get pods --show-labels -n devops-platform

# Test from inside cluster
kubectl run debug --rm -it --image=busybox -- wget -O- http://<service>:8080

# Port forward to test locally
kubectl port-forward svc/<service> 8080:8080 -n devops-platform
```

## Database Issues

### PostgreSQL Connection Failed

```bash
# Check if PostgreSQL is running
docker compose ps postgres
kubectl get pods -l app=postgres -n devops-platform

# Test connection
docker compose exec postgres pg_isready
kubectl exec -it postgres-0 -n devops-platform -- pg_isready

# Check logs
docker compose logs postgres
kubectl logs postgres-0 -n devops-platform

# Verify credentials
docker compose exec postgres psql -U devops -d devops_platform -c "SELECT 1"
```

### Database Migration Issues

```bash
# Check migration status
docker compose exec api npx prisma migrate status

# Reset database (development only!)
docker compose exec api npx prisma migrate reset --force

# Apply migrations manually
docker compose exec api npx prisma migrate deploy
```

## Redis Issues

### Redis Connection Failed

```bash
# Check if Redis is running
docker compose exec redis redis-cli ping

# Check memory
docker compose exec redis redis-cli INFO memory

# Clear cache (if needed)
docker compose exec redis redis-cli FLUSHALL
```

## API Issues

### High Latency

```bash
# Check API metrics
curl localhost:8080/metrics | grep http_request_duration

# Check database queries
# Look for slow query logs

# Check resource usage
docker stats api
kubectl top pods -l app=api -n devops-platform
```

### 5xx Errors

```bash
# Check API logs
docker compose logs -f api
kubectl logs -l app=api -n devops-platform -f

# Check health endpoints
curl localhost:8080/health/ready

# Check dependencies
curl localhost:8080/health | jq
```

## Monitoring Issues

### Prometheus Not Scraping

```bash
# Check targets
curl localhost:9090/api/v1/targets | jq '.data.activeTargets'

# Verify endpoint
curl localhost:8080/metrics

# Check Prometheus config
docker compose exec prometheus cat /etc/prometheus/prometheus.yml
```

### Grafana Dashboard Empty

```bash
# Check datasource
# Grafana UI > Configuration > Data Sources > Test

# Check Prometheus connection
curl localhost:9090/api/v1/query?query=up

# Verify metrics exist
curl localhost:8080/metrics | grep devops_api
```

## Build Issues

### Docker Build Fails

```bash
# Build with no cache
docker build --no-cache -t app .

# Check Dockerfile syntax
docker build --check .

# Build with verbose output
docker build --progress=plain -t app .
```

### npm Install Fails

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version
```

## kind Cluster Issues

### Cluster Creation Fails

```bash
# Delete existing cluster
kind delete cluster --name devops-platform

# Check Docker resources
docker system df
docker system prune -a

# Create with verbose logging
kind create cluster --name devops-platform -v 7
```

### Images Not Available

```bash
# Load images into kind
kind load docker-image <image>:<tag> --name devops-platform

# Verify images
docker exec -it devops-platform-control-plane crictl images
```

## Quick Diagnostic Commands

```bash
# System overview
echo "=== Docker ===" && docker ps
echo "=== Disk ===" && df -h
echo "=== Memory ===" && free -h
echo "=== Load ===" && uptime

# Application health
curl -s localhost:8080/health | jq
curl -s localhost:8080/health/ready | jq

# Kubernetes overview
kubectl get pods -A
kubectl get events --sort-by='.lastTimestamp' | tail -20
```

## Getting Help

1. Check logs first (always)
2. Search GitHub issues
3. Check documentation
4. Ask in team chat with:
   - Error message
   - Steps to reproduce
   - Environment details
   - What you've tried
