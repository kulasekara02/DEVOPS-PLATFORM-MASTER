# DEVOPS-PLATFORM-MASTER

> A comprehensive DevOps learning and showcase repository demonstrating Docker, Kubernetes, CI/CD, Infrastructure as Code, monitoring, and security best practices.

[![CI Pipeline](https://github.com/YOUR_USERNAME/devops-platform-master/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/devops-platform-master/actions/workflows/ci.yml)
[![Security Scan](https://github.com/YOUR_USERNAME/devops-platform-master/actions/workflows/security.yml/badge.svg)](https://github.com/YOUR_USERNAME/devops-platform-master/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DEVOPS-PLATFORM-MASTER                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │   GitHub    │────▶│  CI/CD      │────▶│  Container  │                   │
│  │   Actions   │     │  Pipeline   │     │  Registry   │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│         │                   │                   │                           │
│         ▼                   ▼                   ▼                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Kubernetes Cluster (kind/minikube)                │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │                         Ingress (Nginx)                      │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │         │                    │                    │                  │   │
│  │         ▼                    ▼                    ▼                  │   │
│  │  ┌───────────┐        ┌───────────┐        ┌───────────┐            │   │
│  │  │ Frontend  │        │    API    │        │  Worker   │            │   │
│  │  │  (React)  │───────▶│  (Node)   │◀──────▶│  (Node)   │            │   │
│  │  │  :3000    │        │  :8080    │        │           │            │   │
│  │  └───────────┘        └───────────┘        └───────────┘            │   │
│  │                              │                    │                  │   │
│  │                              ▼                    ▼                  │   │
│  │                       ┌───────────┐        ┌───────────┐            │   │
│  │                       │ PostgreSQL│        │   Redis   │            │   │
│  │                       │   :5432   │        │   :6379   │            │   │
│  │                       └───────────┘        └───────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Observability Stack                               │   │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐     │   │
│  │  │Prometheus │   │  Grafana  │   │   Loki    │   │  Jaeger   │     │   │
│  │  │   :9090   │   │   :3001   │   │   :3100   │   │  :16686   │     │   │
│  │  └───────────┘   └───────────┘   └───────────┘   └───────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

### DevOps Capabilities
- **Containerization**: Multi-stage Docker builds with security best practices
- **Orchestration**: Kubernetes manifests with Kustomize overlays
- **CI/CD**: GitHub Actions workflows for build, test, scan, deploy
- **IaC**: Terraform modules for cloud infrastructure
- **Monitoring**: Prometheus, Grafana, Loki observability stack
- **Security**: Container scanning, SAST, dependency checks, policy enforcement

### Application Stack
| Service    | Technology      | Port  | Description                    |
|------------|-----------------|-------|--------------------------------|
| Frontend   | React + Vite    | 3000  | Web UI dashboard               |
| API        | Node.js/Express | 8080  | REST API with OpenTelemetry    |
| Worker     | Node.js         | -     | Background job processor       |
| Database   | PostgreSQL 15   | 5432  | Primary data store             |
| Cache      | Redis 7         | 6379  | Caching and job queue          |
| Proxy      | Nginx           | 80    | Reverse proxy and load balancer|

## Quick Start

### Prerequisites

```bash
# Required tools
docker --version        # Docker 24.0+
docker compose version  # Docker Compose v2+
kubectl version        # Kubernetes CLI 1.28+
kind version           # kind 0.20+ (for local k8s)
helm version           # Helm 3.12+

# Optional tools
terraform --version    # Terraform 1.5+
trivy --version        # Trivy 0.45+
k6 version            # k6 (for load testing)
```

### Option 1: Run with Docker Compose (Fastest)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/devops-platform-master.git
cd devops-platform-master

# Start development environment
make dev

# Or manually:
cp .env.example .env
docker compose -f infra/docker/docker-compose.dev.yml up --build

# Access the application
# Frontend: http://localhost:3000
# API:      http://localhost:8080
# Grafana:  http://localhost:3001
```

### Option 2: Run with Kubernetes (kind)

```bash
# Create local Kubernetes cluster
make kind-up

# Deploy all services
make deploy

# Or step by step:
./ci/scripts/deploy_kind.sh

# Check deployment status
kubectl get pods -n devops-platform

# Access via port-forward
kubectl port-forward -n devops-platform svc/frontend 3000:80
kubectl port-forward -n devops-platform svc/api 8080:8080

# Run smoke tests
make smoke-test

# Cleanup
make destroy
```

### Option 3: Using Makefile Shortcuts

```bash
make help          # Show all available commands
make dev           # Start development environment
make test          # Run all tests
make build         # Build all Docker images
make scan          # Run security scans
make kind-up       # Create kind cluster
make deploy        # Deploy to Kubernetes
make logs          # Tail all logs
make destroy       # Tear down everything
```

## Project Structure

```
DEVOPS-PLATFORM-MASTER/
├── app/                          # Application source code
│   ├── frontend/                 # React frontend application
│   ├── api/                      # Node.js REST API
│   └── worker/                   # Background job processor
│
├── infra/                        # Infrastructure configurations
│   ├── docker/                   # Docker configurations
│   │   ├── docker-compose.dev.yml
│   │   ├── docker-compose.prod.yml
│   │   ├── Dockerfile.*         # Multi-stage Dockerfiles
│   │   └── nginx.conf           # Nginx configuration
│   │
│   ├── k8s/                      # Kubernetes manifests
│   │   ├── base/                 # Base configurations
│   │   └── overlays/             # Environment-specific (Kustomize)
│   │       ├── dev/
│   │       ├── staging/
│   │       └── prod/
│   │
│   ├── helm/                     # Helm charts
│   │   └── devops-platform-master/
│   │
│   └── terraform/                # Infrastructure as Code
│       ├── modules/              # Reusable modules
│       └── envs/                 # Environment configurations
│
├── ci/                           # CI/CD configurations
│   ├── github-actions/workflows/ # GitHub Actions workflows
│   └── scripts/                  # Build and deployment scripts
│
├── ops/                          # Operations documentation
│   ├── linux/                    # Linux administration guides
│   ├── monitoring/               # Observability configurations
│   ├── runbooks/                 # Operational runbooks
│   └── sre/                      # SRE practices
│
├── docs/                         # Project documentation
├── tests/                        # Test suites
│   ├── integration/              # Integration tests
│   └── e2e/                      # End-to-end tests
│
└── .github/                      # GitHub configurations
    ├── ISSUE_TEMPLATE/
    ├── PULL_REQUEST_TEMPLATE.md
    └── workflows/                # GitHub Actions (symlinked)
```

## CI/CD Pipeline

### Workflow Overview

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│     Push     │───▶│     CI       │───▶│   Security   │───▶│     CD       │
│   to branch  │    │   Pipeline   │    │    Scan      │    │   Deploy     │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                           │                   │                    │
                           ▼                   ▼                    ▼
                    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                    │ • Lint       │    │ • Trivy      │    │ • kind       │
                    │ • Test       │    │ • Snyk       │    │ • Smoke test │
                    │ • Build      │    │ • SBOM       │    │ • Rollback   │
                    │ • Cache      │    │ • Secrets    │    │   on failure │
                    └──────────────┘    └──────────────┘    └──────────────┘

┌──────────────┐    ┌──────────────┐
│  Tag vX.Y.Z  │───▶│   Release    │
│              │    │   Pipeline   │
└──────────────┘    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ • Build      │
                    │ • Sign       │
                    │ • Publish    │
                    │ • Release    │
                    │   Notes      │
                    └──────────────┘
```

### Workflows

| Workflow       | Trigger                    | Description                           |
|----------------|----------------------------|---------------------------------------|
| `ci.yml`       | Push/PR to any branch      | Lint, test, build, cache artifacts    |
| `security.yml` | Push to main, daily cron   | Security scanning and SBOM generation |
| `cd.yml`       | Push to main (CI success)  | Deploy to kind, smoke tests           |
| `release.yml`  | Tag `v*`                   | Build, publish, create GitHub release |
| `cleanup.yml`  | Weekly cron                | Clean old artifacts and images        |

## Adding a New Service

1. **Create service directory**
   ```bash
   mkdir -p app/new-service
   ```

2. **Add Dockerfile**
   ```bash
   cp infra/docker/Dockerfile.api infra/docker/Dockerfile.new-service
   # Modify as needed
   ```

3. **Add Kubernetes manifests**
   ```bash
   cp infra/k8s/base/api-deploy.yaml infra/k8s/base/new-service-deploy.yaml
   # Update names, labels, and configurations
   ```

4. **Update Kustomize**
   ```yaml
   # Add to infra/k8s/base/kustomization.yaml
   resources:
     - new-service-deploy.yaml
   ```

5. **Update docker-compose**
   ```yaml
   # Add to infra/docker/docker-compose.dev.yml
   new-service:
     build:
       context: ../../app/new-service
       dockerfile: ../../infra/docker/Dockerfile.new-service
   ```

6. **Add to CI/CD**
   - Update `ci/scripts/build.sh`
   - Update GitHub Actions workflows

## Creating a Release

### Semantic Versioning

This project follows [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH` (e.g., `v1.2.3`)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Release Process

```bash
# 1. Ensure main branch is up to date
git checkout main
git pull origin main

# 2. Create and push a version tag
git tag -s v1.0.0 -m "Release v1.0.0: Initial release"
git push origin v1.0.0

# 3. The release workflow automatically:
#    - Builds and tags images
#    - Pushes to container registry
#    - Creates GitHub release with notes
#    - Generates changelog

# 4. Verify the release
gh release view v1.0.0
```

### Image Tagging Strategy

| Tag Format              | Example                          | When Used              |
|-------------------------|----------------------------------|------------------------|
| `latest`                | `image:latest`                   | Latest main build      |
| `<sha>`                 | `image:a1b2c3d`                  | Every commit           |
| `<branch>-<sha>`        | `image:main-a1b2c3d`             | Branch builds          |
| `v<semver>`             | `image:v1.2.3`                   | Releases               |

## Troubleshooting

### Common Issues

#### Docker Compose fails to start

```bash
# Check logs
docker compose -f infra/docker/docker-compose.dev.yml logs

# Reset everything
make destroy
docker system prune -af
make dev
```

#### kind cluster not starting

```bash
# Delete and recreate
kind delete cluster --name devops-platform
make kind-up

# Check Docker resources
docker system df
```

#### Pods stuck in Pending/CrashLoopBackOff

```bash
# Check pod status
kubectl describe pod <pod-name> -n devops-platform

# Check logs
kubectl logs <pod-name> -n devops-platform --previous

# Check resource limits
kubectl top nodes
kubectl top pods -n devops-platform
```

#### Database connection issues

```bash
# Check if PostgreSQL is running
kubectl get pods -n devops-platform -l app=postgres

# Port-forward and test connection
kubectl port-forward -n devops-platform svc/postgres 5432:5432
psql -h localhost -U devops -d devops_platform
```

### Debug Commands

```bash
# View all resources in namespace
kubectl get all -n devops-platform

# Watch pods in real-time
kubectl get pods -n devops-platform -w

# Execute into a pod
kubectl exec -it <pod-name> -n devops-platform -- /bin/sh

# View resource usage
kubectl top pods -n devops-platform

# Check events
kubectl get events -n devops-platform --sort-by='.lastTimestamp'
```

## Environment Variables

See [`.env.example`](.env.example) for all available configuration options.

| Variable                | Default              | Description                    |
|-------------------------|----------------------|--------------------------------|
| `NODE_ENV`              | `development`        | Environment mode               |
| `API_PORT`              | `8080`               | API server port                |
| `DATABASE_URL`          | (see .env.example)   | PostgreSQL connection string   |
| `REDIS_URL`             | `redis://redis:6379` | Redis connection string        |
| `LOG_LEVEL`             | `info`               | Logging verbosity              |
| `OTEL_EXPORTER_ENDPOINT`| `http://jaeger:4318` | OpenTelemetry collector        |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

Examples:
```
feat(api): add user authentication endpoint
fix(worker): resolve memory leak in job processor
docs(readme): update deployment instructions
ci(actions): add security scanning workflow
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Kubernetes](https://kubernetes.io/)
- [Docker](https://www.docker.com/)
- [GitHub Actions](https://github.com/features/actions)
- [Terraform](https://www.terraform.io/)
- [Prometheus](https://prometheus.io/)
- [Grafana](https://grafana.com/)

---

**Happy DevOps Learning!** 🚀

If you find this project helpful, please consider giving it a ⭐ on GitHub!
