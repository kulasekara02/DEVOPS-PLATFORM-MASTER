#!/bin/bash
# =============================================================================
# Deploy to Kind Script
# =============================================================================
# Creates a local Kubernetes cluster using kind and deploys the application
# Usage: ./deploy_kind.sh [create|load|deploy|all]
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLUSTER_NAME="${KIND_CLUSTER_NAME:-devops-platform}"
NAMESPACE="${NAMESPACE:-devops-platform}"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_PREFIX="${IMAGE_PREFIX:-devops-platform-master}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
  local missing=()

  command -v docker &>/dev/null || missing+=("docker")
  command -v kind &>/dev/null || missing+=("kind")
  command -v kubectl &>/dev/null || missing+=("kubectl")
  command -v kustomize &>/dev/null || missing+=("kustomize")

  if [[ ${#missing[@]} -gt 0 ]]; then
    log_error "Missing required tools: ${missing[*]}"
    echo "Please install them before continuing."
    exit 1
  fi
}

# Create kind cluster
create_cluster() {
  log_info "Creating kind cluster: $CLUSTER_NAME"

  # Check if cluster already exists
  if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    log_warning "Cluster $CLUSTER_NAME already exists"
    read -p "Delete and recreate? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      kind delete cluster --name "$CLUSTER_NAME"
    else
      return 0
    fi
  fi

  # Create cluster with custom configuration
  cat <<EOF | kind create cluster --name "$CLUSTER_NAME" --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
  - containerPort: 30000
    hostPort: 30000
    protocol: TCP
- role: worker
- role: worker
EOF

  log_success "Cluster created successfully"

  # Install ingress-nginx
  log_info "Installing ingress-nginx..."
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

  log_info "Waiting for ingress controller..."
  kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=180s

  log_success "Ingress controller ready"

  # Install metrics-server (optional, for HPA)
  log_info "Installing metrics-server..."
  kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

  # Patch metrics-server for kind (insecure TLS)
  kubectl patch deployment metrics-server -n kube-system \
    --type='json' \
    -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]' || true

  log_success "Metrics server installed"
}

# Load images into kind
load_images() {
  log_info "Loading images into kind cluster..."

  local services=("frontend" "api" "worker")

  for service in "${services[@]}"; do
    local image="$REGISTRY/$IMAGE_PREFIX/$service:$IMAGE_TAG"

    # Check if image exists locally
    if docker image inspect "$image" &>/dev/null; then
      log_info "Loading $image..."
      kind load docker-image "$image" --name "$CLUSTER_NAME"
    else
      log_warning "Image not found locally: $image"
      log_info "Building image..."
      "$SCRIPT_DIR/build.sh" "$service" "$IMAGE_TAG"
      kind load docker-image "$image" --name "$CLUSTER_NAME"
    fi
  done

  log_success "Images loaded successfully"
}

# Deploy application
deploy_app() {
  log_info "Deploying application..."

  # Create namespace
  kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

  # Create secrets
  log_info "Creating secrets..."
  kubectl create secret generic app-secrets \
    --from-literal=POSTGRES_USER=devops \
    --from-literal=POSTGRES_PASSWORD=devops_kind_password \
    --from-literal=DATABASE_URL=postgresql://devops:devops_kind_password@postgres:5432/devops_platform \
    --from-literal=REDIS_URL=redis://redis:6379/0 \
    --from-literal=JWT_SECRET=kind-dev-jwt-secret-not-for-production \
    --namespace "$NAMESPACE" \
    --dry-run=client -o yaml | kubectl apply -f -

  # Deploy using Kustomize
  log_info "Applying Kustomize manifests..."
  cd "$PROJECT_ROOT/infra/k8s/overlays/dev"

  # Update image tags
  kustomize edit set image \
    "ghcr.io/devops-platform-master/frontend=$REGISTRY/$IMAGE_PREFIX/frontend:$IMAGE_TAG" \
    "ghcr.io/devops-platform-master/api=$REGISTRY/$IMAGE_PREFIX/api:$IMAGE_TAG" \
    "ghcr.io/devops-platform-master/worker=$REGISTRY/$IMAGE_PREFIX/worker:$IMAGE_TAG"

  kustomize build . | kubectl apply -f -

  # Wait for deployments
  log_info "Waiting for deployments..."
  kubectl rollout status deployment/dev-postgres -n "$NAMESPACE" --timeout=120s || true
  kubectl rollout status deployment/dev-redis -n "$NAMESPACE" --timeout=60s || true

  sleep 10  # Give database time to initialize

  kubectl rollout status deployment/dev-api -n "$NAMESPACE" --timeout=180s
  kubectl rollout status deployment/dev-frontend -n "$NAMESPACE" --timeout=120s
  kubectl rollout status deployment/dev-worker -n "$NAMESPACE" --timeout=120s

  log_success "Application deployed successfully"

  # Show status
  echo ""
  log_info "Deployment Status:"
  kubectl get pods -n "$NAMESPACE"
  echo ""
  kubectl get services -n "$NAMESPACE"
  echo ""

  log_info "Access the application:"
  echo "  Frontend: http://localhost (via ingress)"
  echo "  API:      http://localhost/api"
  echo ""
  echo "Or use port-forward:"
  echo "  kubectl port-forward -n $NAMESPACE svc/dev-frontend 3000:80"
  echo "  kubectl port-forward -n $NAMESPACE svc/dev-api 8080:8080"
}

# Main
main() {
  local command="${1:-all}"

  check_prerequisites

  case "$command" in
    create)
      create_cluster
      ;;
    load)
      load_images
      ;;
    deploy)
      deploy_app
      ;;
    all)
      create_cluster
      load_images
      deploy_app
      ;;
    *)
      echo "Usage: $0 [create|load|deploy|all]"
      exit 1
      ;;
  esac
}

main "$@"
