# Kubernetes Guide

## Overview

This project supports deployment to Kubernetes using:
- **Kustomize**: For environment-specific configurations
- **Helm**: For templated deployments

## Local Development with kind

### Create Cluster

```bash
# Using the provided script
./ci/scripts/deploy_kind.sh create

# Or manually
kind create cluster --name devops-platform --config - <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
  - containerPort: 443
    hostPort: 443
- role: worker
- role: worker
EOF
```

### Deploy Application

```bash
# Full deployment
./ci/scripts/deploy_kind.sh all

# Or step by step
./ci/scripts/deploy_kind.sh create
./ci/scripts/deploy_kind.sh load
./ci/scripts/deploy_kind.sh deploy
```

### Access Application

```bash
# Via Ingress (if configured)
curl http://localhost

# Via port-forward
kubectl port-forward svc/frontend 3000:80 -n devops-platform
kubectl port-forward svc/api 8080:8080 -n devops-platform
```

## Kustomize Deployments

### Structure

```
infra/k8s/
├── base/                 # Base configurations
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.example.yaml
│   ├── frontend-deploy.yaml
│   ├── api-deploy.yaml
│   ├── worker-deploy.yaml
│   ├── postgres-statefulset.yaml
│   ├── redis-deploy.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── pdb.yaml
│   └── networkpolicy.yaml
└── overlays/
    ├── dev/              # Development overrides
    ├── staging/          # Staging overrides
    └── prod/             # Production overrides
```

### Deploy with Kustomize

```bash
# Preview
kustomize build infra/k8s/overlays/dev

# Apply
kustomize build infra/k8s/overlays/dev | kubectl apply -f -

# Or using kubectl directly
kubectl apply -k infra/k8s/overlays/dev
```

### Update Images

```bash
cd infra/k8s/overlays/dev
kustomize edit set image ghcr.io/devops-platform-master/api:v1.2.3
```

## Helm Deployments

### Install

```bash
# Add dependencies
helm dependency update infra/helm/devops-platform-master

# Install
helm install devops-platform infra/helm/devops-platform-master \
  --namespace devops-platform \
  --create-namespace \
  --set api.image.tag=v1.2.3
```

### Upgrade

```bash
helm upgrade devops-platform infra/helm/devops-platform-master \
  --namespace devops-platform \
  --set api.image.tag=v1.2.4
```

### Rollback

```bash
helm rollback devops-platform 1 -n devops-platform
```

## Common Operations

### View Resources

```bash
# All resources in namespace
kubectl get all -n devops-platform

# Pods with more details
kubectl get pods -n devops-platform -o wide

# Watch pods
kubectl get pods -n devops-platform -w
```

### Debugging

```bash
# Pod logs
kubectl logs -f deployment/api -n devops-platform

# Previous container logs
kubectl logs deployment/api -n devops-platform --previous

# Shell into pod
kubectl exec -it deployment/api -n devops-platform -- sh

# Describe pod
kubectl describe pod <pod-name> -n devops-platform
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment/api --replicas=5 -n devops-platform

# Check HPA
kubectl get hpa -n devops-platform
```

### Rollouts

```bash
# Status
kubectl rollout status deployment/api -n devops-platform

# History
kubectl rollout history deployment/api -n devops-platform

# Undo
kubectl rollout undo deployment/api -n devops-platform

# Restart
kubectl rollout restart deployment/api -n devops-platform
```

## Configuration

### ConfigMaps

```bash
# View
kubectl get configmap app-config -n devops-platform -o yaml

# Edit
kubectl edit configmap app-config -n devops-platform
```

### Secrets

```bash
# Create from literal
kubectl create secret generic app-secrets \
  --from-literal=JWT_SECRET=mysecret \
  -n devops-platform

# Create from file
kubectl create secret generic app-secrets \
  --from-env-file=.env \
  -n devops-platform

# View (base64 encoded)
kubectl get secret app-secrets -n devops-platform -o yaml
```

## Ingress

### Install Ingress Controller

```bash
# For kind
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# For cloud
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
```

### TLS Certificate

```bash
# Self-signed (development)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt -subj "/CN=devops.local"

kubectl create secret tls tls-secret \
  --key tls.key --cert tls.crt \
  -n devops-platform
```

## Monitoring

### Install metrics-server

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### View Metrics

```bash
kubectl top nodes
kubectl top pods -n devops-platform
```

## Troubleshooting

### Pod Won't Start

```bash
# Check events
kubectl get events -n devops-platform --sort-by='.lastTimestamp'

# Check pod status
kubectl describe pod <pod> -n devops-platform

# Check logs
kubectl logs <pod> -n devops-platform
```

### Service Not Accessible

```bash
# Check endpoints
kubectl get endpoints -n devops-platform

# Test from inside cluster
kubectl run debug --rm -it --image=busybox -- wget -O- http://api:8080/health
```
