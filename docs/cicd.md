# CI/CD Documentation

## Overview

This project uses GitHub Actions for continuous integration and deployment.

## Pipelines

### CI Pipeline (`ci.yml`)

**Triggers**: Push to any branch, PRs to main

**Jobs**:
1. **Lint**: Code quality checks
2. **Test**: Unit and integration tests
3. **Build**: Docker image builds

```yaml
Jobs:
  lint → test → build → summary
```

### Security Pipeline (`security.yml`)

**Triggers**: Push to main, daily schedule

**Jobs**:
1. **Dependency Scan**: npm audit
2. **Container Scan**: Trivy
3. **Secret Scan**: Gitleaks/TruffleHog
4. **SBOM**: Software Bill of Materials
5. **CodeQL**: Static analysis

### CD Pipeline (`cd.yml`)

**Triggers**: Push to main (after CI passes)

**Jobs**:
1. **Deploy**: Deploy to kind cluster
2. **Smoke Test**: Verify deployment
3. **Rollback**: Auto-rollback on failure

### Release Pipeline (`release.yml`)

**Triggers**: Tags matching `v*.*.*`

**Jobs**:
1. **Build Images**: Multi-platform builds
2. **Push to Registry**: Version-tagged images
3. **Create Release**: GitHub release with notes

### Cleanup Pipeline (`cleanup.yml`)

**Triggers**: Weekly schedule

**Jobs**:
1. **Clean Artifacts**: Remove old workflow runs
2. **Clean Images**: Remove old container versions
3. **Clean Branches**: Remove stale branches

## Image Tagging Strategy

| Trigger | Tag Format | Example |
|---------|------------|---------|
| Push to branch | `<branch>-<sha>` | `main-abc1234` |
| Pull request | `pr-<number>` | `pr-42` |
| Main branch | `latest`, `<sha>` | `latest`, `abc1234` |
| Version tag | `v<semver>`, `<major>.<minor>` | `v1.2.3`, `1.2` |

## Required Secrets

| Secret | Description | Required For |
|--------|-------------|--------------|
| `GITHUB_TOKEN` | Auto-provided | Image push |
| `DATABASE_URL` | Production DB | CD pipeline |
| `JWT_SECRET` | JWT signing | CD pipeline |

## Running Locally

### Prerequisites

```bash
# Install act (GitHub Actions local runner)
brew install act

# Or with Go
go install github.com/nektos/act@latest
```

### Run Workflows

```bash
# Run CI workflow
act push -W .github/workflows/ci.yml

# Run specific job
act push -j build -W .github/workflows/ci.yml

# With secrets
act push --secret-file .secrets
```

## Workflow Customization

### Adding a New Service

1. Add build job in `ci.yml`:
```yaml
build:
  strategy:
    matrix:
      service: [frontend, api, worker, new-service]
```

2. Create Dockerfile: `infra/docker/Dockerfile.new-service`

3. Add to deployment manifests

### Custom Test Commands

```yaml
- name: Run tests
  run: |
    cd app/api
    npm run test:custom
```

### Parallel Jobs

```yaml
jobs:
  job1:
    runs-on: ubuntu-latest
  job2:
    runs-on: ubuntu-latest
  # job1 and job2 run in parallel

  job3:
    needs: [job1, job2]  # Waits for both
```

## Caching

### npm Dependencies

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
    cache-dependency-path: '**/package-lock.json'
```

### Docker Layers

```yaml
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

## Notifications

### Slack Notification

```yaml
- name: Notify Slack
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Debugging

### Enable Debug Logging

```bash
# In GitHub Actions
ACTIONS_RUNNER_DEBUG=true
ACTIONS_STEP_DEBUG=true
```

### View Workflow Logs

```bash
# Using GitHub CLI
gh run view --log

# Watch runs
gh run watch
```

## Best Practices

1. **Use specific action versions**: `uses: actions/checkout@v4`
2. **Cache dependencies**: Faster builds
3. **Fail fast**: `fail-fast: true` in matrix
4. **Limit concurrency**: Prevent resource conflicts
5. **Use environments**: Control deployments
6. **Require approvals**: For production deploys
