# Useful Linux Commands Cheat Sheet

Quick reference for common commands used in this project.

## Docker Commands

```bash
# Container Management
docker ps                          # List running containers
docker ps -a                       # List all containers
docker logs <container>            # View container logs
docker logs -f <container>         # Follow logs in real-time
docker exec -it <container> sh     # Shell into container
docker stop <container>            # Stop container
docker rm <container>              # Remove container
docker inspect <container>         # Detailed container info

# Image Management
docker images                      # List images
docker pull <image>                # Pull image from registry
docker build -t <name> .           # Build image
docker push <image>                # Push to registry
docker rmi <image>                 # Remove image
docker image prune                 # Remove unused images

# Docker Compose
docker compose up                  # Start services
docker compose up -d               # Start in background
docker compose down                # Stop and remove
docker compose down -v             # Also remove volumes
docker compose logs                # View all logs
docker compose logs -f api         # Follow specific service
docker compose ps                  # List services
docker compose exec api sh         # Shell into service
docker compose build               # Rebuild images
docker compose pull                # Pull latest images

# Cleanup
docker system prune                # Remove unused data
docker system prune -a             # Remove all unused (including images)
docker volume prune                # Remove unused volumes
docker network prune               # Remove unused networks
```

## Kubernetes Commands

```bash
# Cluster Info
kubectl cluster-info               # Cluster information
kubectl get nodes                  # List nodes
kubectl top nodes                  # Node resource usage
kubectl get namespaces             # List namespaces

# Pods
kubectl get pods                   # List pods in default namespace
kubectl get pods -n devops-platform # List pods in namespace
kubectl get pods -A                # List all pods
kubectl get pods -o wide           # More details
kubectl describe pod <pod>         # Pod details
kubectl logs <pod>                 # Pod logs
kubectl logs -f <pod>              # Follow logs
kubectl logs <pod> -c <container>  # Specific container logs
kubectl exec -it <pod> -- sh       # Shell into pod
kubectl delete pod <pod>           # Delete pod

# Deployments
kubectl get deployments            # List deployments
kubectl describe deployment <name> # Deployment details
kubectl rollout status deployment/<name>    # Rollout status
kubectl rollout history deployment/<name>   # Rollout history
kubectl rollout undo deployment/<name>      # Rollback
kubectl scale deployment/<name> --replicas=3 # Scale

# Services
kubectl get svc                    # List services
kubectl get endpoints              # List endpoints
kubectl port-forward svc/<name> 8080:80  # Port forward

# ConfigMaps & Secrets
kubectl get configmaps             # List configmaps
kubectl get secrets                # List secrets
kubectl create secret generic <name> --from-literal=key=value

# Debugging
kubectl get events --sort-by='.lastTimestamp'  # Recent events
kubectl top pods                   # Pod resource usage
kubectl describe node <node>       # Node details
kubectl get all -n <namespace>     # All resources in namespace

# Apply/Delete
kubectl apply -f <file.yaml>       # Apply configuration
kubectl delete -f <file.yaml>      # Delete configuration
kubectl apply -k .                 # Apply with Kustomize
```

## Kind Commands

```bash
# Cluster Management
kind create cluster                # Create cluster
kind create cluster --name myapp   # Named cluster
kind get clusters                  # List clusters
kind delete cluster                # Delete default cluster
kind delete cluster --name myapp   # Delete named cluster

# Image Loading
kind load docker-image <image>     # Load image into cluster
kind load docker-image <image> --name <cluster>

# Kubeconfig
kind get kubeconfig                # Get kubeconfig
kind export kubeconfig             # Export kubeconfig
```

## Git Commands

```bash
# Basic
git status                         # Current status
git log --oneline                  # Commit history
git diff                           # Show changes
git add .                          # Stage all changes
git commit -m "message"            # Commit
git push                           # Push to remote
git pull                           # Pull from remote

# Branches
git branch                         # List branches
git checkout -b feature/name       # Create and switch
git checkout main                  # Switch to main
git merge feature/name             # Merge branch
git branch -d feature/name         # Delete branch

# Tags
git tag v1.0.0                     # Create tag
git tag -a v1.0.0 -m "Release"     # Annotated tag
git push origin v1.0.0             # Push tag
git tag -l                         # List tags
```

## System Commands

```bash
# Process Management
ps aux                             # List all processes
ps aux | grep node                 # Find specific process
top                                # Interactive process viewer
htop                               # Better process viewer
kill <pid>                         # Kill process
kill -9 <pid>                      # Force kill

# Disk Usage
df -h                              # Disk space
du -sh *                           # Directory sizes
du -sh /var/log                    # Specific directory
ncdu /                             # Interactive disk usage

# Memory
free -h                            # Memory usage
cat /proc/meminfo                  # Detailed memory info

# Network
netstat -tulpn                     # Listening ports
ss -tulpn                          # Socket statistics
curl -I http://localhost:8080      # HTTP headers
wget http://localhost:8080         # Download file
ping google.com                    # Test connectivity
dig google.com                     # DNS lookup

# Files
find /path -name "*.log"           # Find files
grep -r "pattern" /path            # Search in files
tail -f /var/log/syslog            # Follow log file
less /var/log/syslog               # View file with paging
head -n 100 file.log               # First 100 lines
tail -n 100 file.log               # Last 100 lines

# Permissions
chmod +x script.sh                 # Make executable
chmod 644 file                     # rw-r--r--
chmod 755 directory                # rwxr-xr-x
chown user:group file              # Change owner

# Archives
tar -czvf archive.tar.gz /path     # Create tar.gz
tar -xzvf archive.tar.gz           # Extract tar.gz
zip -r archive.zip /path           # Create zip
unzip archive.zip                  # Extract zip
```

## Monitoring Commands

```bash
# Prometheus
curl localhost:9090/api/v1/targets # List targets
curl localhost:9090/api/v1/query?query=up  # Run query

# Service Health
curl localhost:8080/health         # Health check
curl localhost:8080/health/ready   # Readiness
curl localhost:8080/metrics        # Prometheus metrics

# Logs
journalctl -u docker               # Docker service logs
journalctl -f                      # Follow system logs
journalctl --since "1 hour ago"    # Recent logs
```

## Quick Reference

| Task | Command |
|------|---------|
| Check API health | `curl localhost:8080/health` |
| View API logs | `docker compose logs -f api` |
| Restart API | `docker compose restart api` |
| Scale workers | `kubectl scale deployment/worker --replicas=3` |
| Rollback deployment | `kubectl rollout undo deployment/api` |
| Check pod resources | `kubectl top pods -n devops-platform` |
| Port forward | `kubectl port-forward svc/api 8080:8080` |
| Create kind cluster | `./ci/scripts/deploy_kind.sh create` |
| Run smoke tests | `./ci/scripts/smoke_test.sh` |
