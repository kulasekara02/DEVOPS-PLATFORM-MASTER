# =============================================================================
# DEVOPS-PLATFORM-MASTER Makefile
# =============================================================================
# Usage: make <target>
# Run 'make help' to see all available targets
# =============================================================================

.PHONY: help dev dev-build test test-unit test-integration test-e2e build \
        scan lint kind-up kind-down deploy deploy-dev deploy-staging deploy-prod \
        logs destroy clean smoke-test load-test helm-install helm-upgrade \
        terraform-init terraform-plan terraform-apply docker-push release

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
SHELL := /bin/bash
.DEFAULT_GOAL := help

# Project settings
PROJECT_NAME := devops-platform-master
NAMESPACE := devops-platform
KIND_CLUSTER_NAME := devops-platform

# Docker settings
REGISTRY ?= ghcr.io
IMAGE_PREFIX ?= $(REGISTRY)/$(PROJECT_NAME)
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
COMMIT_SHA ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Paths
DOCKER_DIR := infra/docker
K8S_DIR := infra/k8s
HELM_DIR := infra/helm/$(PROJECT_NAME)
TERRAFORM_DIR := infra/terraform
SCRIPTS_DIR := ci/scripts

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# -----------------------------------------------------------------------------
# Help
# -----------------------------------------------------------------------------
help: ## Show this help message
	@echo ""
	@echo "$(BLUE)DEVOPS-PLATFORM-MASTER$(NC) - Makefile Commands"
	@echo ""
	@echo "$(YELLOW)Usage:$(NC) make $(GREEN)<target>$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# -----------------------------------------------------------------------------
# Development
# -----------------------------------------------------------------------------
dev: ## Start development environment with docker-compose
	@echo "$(BLUE)Starting development environment...$(NC)"
	@if [ ! -f .env ]; then cp .env.example .env; echo "$(YELLOW)Created .env from .env.example$(NC)"; fi
	docker compose -f $(DOCKER_DIR)/docker-compose.dev.yml up --build

dev-build: ## Rebuild and start development environment
	@echo "$(BLUE)Rebuilding development environment...$(NC)"
	docker compose -f $(DOCKER_DIR)/docker-compose.dev.yml up --build --force-recreate

dev-down: ## Stop development environment
	@echo "$(BLUE)Stopping development environment...$(NC)"
	docker compose -f $(DOCKER_DIR)/docker-compose.dev.yml down

dev-logs: ## Show development logs
	docker compose -f $(DOCKER_DIR)/docker-compose.dev.yml logs -f

# -----------------------------------------------------------------------------
# Testing
# -----------------------------------------------------------------------------
test: test-unit test-integration ## Run all tests

test-unit: ## Run unit tests
	@echo "$(BLUE)Running unit tests...$(NC)"
	@bash $(SCRIPTS_DIR)/test.sh unit

test-integration: ## Run integration tests
	@echo "$(BLUE)Running integration tests...$(NC)"
	@bash $(SCRIPTS_DIR)/test.sh integration

test-e2e: ## Run end-to-end tests
	@echo "$(BLUE)Running e2e tests...$(NC)"
	@bash $(SCRIPTS_DIR)/test.sh e2e

smoke-test: ## Run smoke tests against deployed environment
	@echo "$(BLUE)Running smoke tests...$(NC)"
	@bash $(SCRIPTS_DIR)/smoke_test.sh

load-test: ## Run load tests with k6
	@echo "$(BLUE)Running load tests...$(NC)"
	@bash $(SCRIPTS_DIR)/load_test.sh

# -----------------------------------------------------------------------------
# Linting & Code Quality
# -----------------------------------------------------------------------------
lint: ## Run all linters
	@echo "$(BLUE)Running linters...$(NC)"
	@bash $(SCRIPTS_DIR)/lint.sh

lint-fix: ## Run linters and fix issues
	@echo "$(BLUE)Running linters with auto-fix...$(NC)"
	@bash $(SCRIPTS_DIR)/lint.sh --fix

# -----------------------------------------------------------------------------
# Building
# -----------------------------------------------------------------------------
build: ## Build all Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	@bash $(SCRIPTS_DIR)/build.sh all $(VERSION) $(COMMIT_SHA)

build-frontend: ## Build frontend Docker image
	@echo "$(BLUE)Building frontend image...$(NC)"
	@bash $(SCRIPTS_DIR)/build.sh frontend $(VERSION) $(COMMIT_SHA)

build-api: ## Build API Docker image
	@echo "$(BLUE)Building API image...$(NC)"
	@bash $(SCRIPTS_DIR)/build.sh api $(VERSION) $(COMMIT_SHA)

build-worker: ## Build worker Docker image
	@echo "$(BLUE)Building worker image...$(NC)"
	@bash $(SCRIPTS_DIR)/build.sh worker $(VERSION) $(COMMIT_SHA)

# -----------------------------------------------------------------------------
# Security Scanning
# -----------------------------------------------------------------------------
scan: ## Run all security scans
	@echo "$(BLUE)Running security scans...$(NC)"
	@bash $(SCRIPTS_DIR)/scan.sh all

scan-images: ## Scan Docker images with Trivy
	@echo "$(BLUE)Scanning Docker images...$(NC)"
	@bash $(SCRIPTS_DIR)/scan.sh images

scan-deps: ## Scan dependencies for vulnerabilities
	@echo "$(BLUE)Scanning dependencies...$(NC)"
	@bash $(SCRIPTS_DIR)/scan.sh deps

scan-secrets: ## Scan for secrets in codebase
	@echo "$(BLUE)Scanning for secrets...$(NC)"
	@bash $(SCRIPTS_DIR)/scan.sh secrets

sbom: ## Generate Software Bill of Materials
	@echo "$(BLUE)Generating SBOM...$(NC)"
	@bash $(SCRIPTS_DIR)/scan.sh sbom

# -----------------------------------------------------------------------------
# Kubernetes - Local (kind)
# -----------------------------------------------------------------------------
kind-up: ## Create local Kubernetes cluster with kind
	@echo "$(BLUE)Creating kind cluster...$(NC)"
	@bash $(SCRIPTS_DIR)/deploy_kind.sh create

kind-down: ## Delete local kind cluster
	@echo "$(BLUE)Deleting kind cluster...$(NC)"
	@kind delete cluster --name $(KIND_CLUSTER_NAME)

kind-load: build ## Load Docker images into kind cluster
	@echo "$(BLUE)Loading images into kind...$(NC)"
	@bash $(SCRIPTS_DIR)/deploy_kind.sh load

# -----------------------------------------------------------------------------
# Kubernetes - Deployment
# -----------------------------------------------------------------------------
deploy: ## Deploy to local kind cluster
	@echo "$(BLUE)Deploying to kind cluster...$(NC)"
	@bash $(SCRIPTS_DIR)/deploy_k8s.sh dev

deploy-dev: ## Deploy to dev environment
	@echo "$(BLUE)Deploying to dev...$(NC)"
	@bash $(SCRIPTS_DIR)/deploy_k8s.sh dev

deploy-staging: ## Deploy to staging environment
	@echo "$(BLUE)Deploying to staging...$(NC)"
	@bash $(SCRIPTS_DIR)/deploy_k8s.sh staging

deploy-prod: ## Deploy to production environment
	@echo "$(YELLOW)WARNING: Deploying to production!$(NC)"
	@read -p "Are you sure? (y/N) " confirm && [ "$$confirm" = "y" ]
	@bash $(SCRIPTS_DIR)/deploy_k8s.sh prod

rollback: ## Rollback to previous deployment
	@echo "$(YELLOW)Rolling back deployment...$(NC)"
	@bash $(SCRIPTS_DIR)/rollback.sh

# -----------------------------------------------------------------------------
# Kubernetes - Utilities
# -----------------------------------------------------------------------------
logs: ## Tail logs from all pods
	@echo "$(BLUE)Tailing logs...$(NC)"
	kubectl logs -n $(NAMESPACE) -l app.kubernetes.io/part-of=$(PROJECT_NAME) -f --max-log-requests=10

logs-api: ## Tail API logs
	kubectl logs -n $(NAMESPACE) -l app=api -f

logs-worker: ## Tail worker logs
	kubectl logs -n $(NAMESPACE) -l app=worker -f

status: ## Show cluster status
	@echo "$(BLUE)Cluster Status:$(NC)"
	@kubectl get nodes
	@echo ""
	@echo "$(BLUE)Namespace Resources:$(NC)"
	@kubectl get all -n $(NAMESPACE)

port-forward: ## Forward ports for local access
	@echo "$(BLUE)Starting port forwards...$(NC)"
	@echo "Frontend: http://localhost:3000"
	@echo "API: http://localhost:8080"
	@echo "Grafana: http://localhost:3001"
	@kubectl port-forward -n $(NAMESPACE) svc/frontend 3000:80 &
	@kubectl port-forward -n $(NAMESPACE) svc/api 8080:8080 &
	@kubectl port-forward -n $(NAMESPACE) svc/grafana 3001:3000 &

# -----------------------------------------------------------------------------
# Helm
# -----------------------------------------------------------------------------
helm-lint: ## Lint Helm chart
	@echo "$(BLUE)Linting Helm chart...$(NC)"
	helm lint $(HELM_DIR)

helm-template: ## Render Helm templates locally
	@echo "$(BLUE)Rendering Helm templates...$(NC)"
	helm template $(PROJECT_NAME) $(HELM_DIR) --debug

helm-install: ## Install Helm chart
	@echo "$(BLUE)Installing Helm chart...$(NC)"
	helm upgrade --install $(PROJECT_NAME) $(HELM_DIR) \
		--namespace $(NAMESPACE) \
		--create-namespace \
		--wait

helm-uninstall: ## Uninstall Helm chart
	@echo "$(BLUE)Uninstalling Helm chart...$(NC)"
	helm uninstall $(PROJECT_NAME) --namespace $(NAMESPACE)

# -----------------------------------------------------------------------------
# Terraform
# -----------------------------------------------------------------------------
terraform-init: ## Initialize Terraform
	@echo "$(BLUE)Initializing Terraform...$(NC)"
	cd $(TERRAFORM_DIR)/envs/dev && terraform init

terraform-plan: ## Plan Terraform changes
	@echo "$(BLUE)Planning Terraform changes...$(NC)"
	cd $(TERRAFORM_DIR)/envs/dev && terraform plan

terraform-apply: ## Apply Terraform changes
	@echo "$(YELLOW)Applying Terraform changes...$(NC)"
	cd $(TERRAFORM_DIR)/envs/dev && terraform apply

terraform-destroy: ## Destroy Terraform resources
	@echo "$(RED)Destroying Terraform resources...$(NC)"
	cd $(TERRAFORM_DIR)/envs/dev && terraform destroy

# -----------------------------------------------------------------------------
# Docker Registry
# -----------------------------------------------------------------------------
docker-login: ## Login to container registry
	@echo "$(BLUE)Logging into container registry...$(NC)"
	@echo "$$REGISTRY_PASSWORD" | docker login $(REGISTRY) -u "$$REGISTRY_USERNAME" --password-stdin

docker-push: build ## Push images to container registry
	@echo "$(BLUE)Pushing images to registry...$(NC)"
	docker push $(IMAGE_PREFIX)/frontend:$(VERSION)
	docker push $(IMAGE_PREFIX)/api:$(VERSION)
	docker push $(IMAGE_PREFIX)/worker:$(VERSION)

# -----------------------------------------------------------------------------
# Release
# -----------------------------------------------------------------------------
release: ## Create a new release (usage: make release VERSION=v1.0.0)
	@if [ -z "$(VERSION)" ]; then echo "$(RED)VERSION is required. Usage: make release VERSION=v1.0.0$(NC)"; exit 1; fi
	@echo "$(BLUE)Creating release $(VERSION)...$(NC)"
	@git tag -a $(VERSION) -m "Release $(VERSION)"
	@git push origin $(VERSION)

changelog: ## Generate changelog
	@echo "$(BLUE)Generating changelog...$(NC)"
	@git log --oneline --no-decorate $(shell git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD

# -----------------------------------------------------------------------------
# Cleanup
# -----------------------------------------------------------------------------
destroy: ## Destroy all local resources
	@echo "$(RED)Destroying all resources...$(NC)"
	-docker compose -f $(DOCKER_DIR)/docker-compose.dev.yml down -v --remove-orphans
	-kind delete cluster --name $(KIND_CLUSTER_NAME)
	@echo "$(GREEN)Cleanup complete$(NC)"

clean: ## Clean build artifacts and caches
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -rf app/*/node_modules
	rm -rf app/*/dist
	rm -rf app/*/build
	rm -rf coverage
	rm -rf .cache
	docker system prune -f

clean-all: clean ## Deep clean including Docker images
	@echo "$(YELLOW)Deep cleaning (including Docker)...$(NC)"
	docker system prune -af --volumes

# -----------------------------------------------------------------------------
# Documentation
# -----------------------------------------------------------------------------
docs: ## Serve documentation locally
	@echo "$(BLUE)Starting documentation server...$(NC)"
	@echo "Documentation available at http://localhost:8000"
	@cd docs && python3 -m http.server 8000 2>/dev/null || python -m SimpleHTTPServer 8000

# -----------------------------------------------------------------------------
# Utilities
# -----------------------------------------------------------------------------
check-deps: ## Check if required tools are installed
	@echo "$(BLUE)Checking dependencies...$(NC)"
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)docker is not installed$(NC)"; exit 1; }
	@command -v kubectl >/dev/null 2>&1 || { echo "$(RED)kubectl is not installed$(NC)"; exit 1; }
	@command -v kind >/dev/null 2>&1 || { echo "$(RED)kind is not installed$(NC)"; exit 1; }
	@command -v helm >/dev/null 2>&1 || { echo "$(RED)helm is not installed$(NC)"; exit 1; }
	@echo "$(GREEN)All required tools are installed$(NC)"

version: ## Show version information
	@echo "Project: $(PROJECT_NAME)"
	@echo "Version: $(VERSION)"
	@echo "Commit:  $(COMMIT_SHA)"
