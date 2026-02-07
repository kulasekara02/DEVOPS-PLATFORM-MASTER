# Security Guide

## Overview

This document outlines security practices, configurations, and procedures for the DevOps Platform.

## Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal permissions required
3. **Zero Trust**: Verify everything, trust nothing
4. **Shift Left**: Security early in development

## Container Security

### Image Security

```dockerfile
# Use minimal base images
FROM node:20-alpine

# Run as non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser
USER appuser

# Read-only filesystem where possible
# Set in docker-compose or k8s
```

### Image Scanning

```bash
# Scan with Trivy
trivy image devops-platform/api:latest

# Scan for critical/high only
trivy image --severity CRITICAL,HIGH devops-platform/api:latest

# Scan in CI pipeline
trivy image --exit-code 1 --severity CRITICAL devops-platform/api:latest
```

### Container Runtime Security

```yaml
# Kubernetes security context
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
```

## Kubernetes Security

### RBAC

```yaml
# Minimal service account permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: api-role
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: api-rolebinding
subjects:
  - kind: ServiceAccount
    name: api-sa
roleRef:
  kind: Role
  name: api-role
  apiGroup: rbac.authorization.k8s.io
```

### Network Policies

```yaml
# Default deny all ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  podSelector: {}
  policyTypes:
    - Ingress

# Allow specific traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - port: 3000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - port: 5432
```

### Pod Security Standards

```yaml
# Enforce restricted pod security
apiVersion: v1
kind: Namespace
metadata:
  name: devops-platform
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

## Secrets Management

### Never Commit Secrets

```gitignore
# .gitignore
.env
.env.*
!.env.example
*.pem
*.key
secrets/
```

### Kubernetes Secrets

```bash
# Create secret from file
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password=$(openssl rand -base64 32)

# Create TLS secret
kubectl create secret tls tls-secret \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem
```

### External Secrets (Production)

```yaml
# Using External Secrets Operator with AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-credentials
  data:
    - secretKey: password
      remoteRef:
        key: devops-platform/db
        property: password
```

## Application Security

### Input Validation

```typescript
// Use Zod for validation
import { z } from 'zod';

const createItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  email: z.string().email(),
});

// Validate input
const result = createItemSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ error: result.error });
}
```

### SQL Injection Prevention

```typescript
// Use parameterized queries (Prisma does this automatically)
const user = await prisma.user.findUnique({
  where: { id: userId }, // Safe - parameterized
});

// NEVER do this:
// const user = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${userId}`;
```

### XSS Prevention

```typescript
// React escapes by default
// Be careful with dangerouslySetInnerHTML

// Sanitize if you must render HTML
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirtyHTML);
```

### Authentication

```typescript
// Use secure session cookies
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,        // HTTPS only
    httpOnly: true,      // No JS access
    sameSite: 'strict',  // CSRF protection
    maxAge: 3600000,     // 1 hour
  },
}));
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
```

## Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

## CI/CD Security

### Secret Scanning

```yaml
# GitHub Actions secret scanning
- name: Detect secrets
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: ${{ github.event.repository.default_branch }}
    head: HEAD
```

### Dependency Scanning

```yaml
# Check for vulnerable dependencies
- name: npm audit
  run: npm audit --audit-level=high

# Using Snyk
- name: Snyk scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### SAST (Static Analysis)

```yaml
# CodeQL analysis
- name: Initialize CodeQL
  uses: github/codeql-action/init@v2
  with:
    languages: javascript, typescript

- name: Perform CodeQL Analysis
  uses: github/codeql-action/analyze@v2
```

## Infrastructure Security

### AWS Security Best Practices

```hcl
# Encrypt EBS volumes
resource "aws_ebs_encryption_by_default" "enabled" {
  enabled = true
}

# Enable CloudTrail
resource "aws_cloudtrail" "main" {
  name                          = "main-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
}

# VPC Flow Logs
resource "aws_flow_log" "main" {
  vpc_id          = aws_vpc.main.id
  traffic_type    = "ALL"
  log_destination = aws_cloudwatch_log_group.flow_logs.arn
}
```

### Network Security

```hcl
# Security Group - minimal access
resource "aws_security_group" "api" {
  name        = "api-sg"
  description = "API security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Security Checklist

### Development

- [ ] No secrets in code or config files
- [ ] Input validation on all endpoints
- [ ] Parameterized database queries
- [ ] Dependencies scanned for vulnerabilities
- [ ] Security headers configured
- [ ] HTTPS enforced

### Container

- [ ] Minimal base images (alpine)
- [ ] Non-root user
- [ ] Read-only filesystem
- [ ] No unnecessary capabilities
- [ ] Images scanned for vulnerabilities
- [ ] Signed images (optional)

### Kubernetes

- [ ] RBAC configured
- [ ] Network policies in place
- [ ] Pod security standards enforced
- [ ] Secrets encrypted at rest
- [ ] Resource limits set
- [ ] Service mesh (optional)

### Infrastructure

- [ ] Encryption at rest
- [ ] Encryption in transit
- [ ] VPC flow logs enabled
- [ ] CloudTrail enabled
- [ ] Security groups minimal
- [ ] IAM least privilege

### CI/CD

- [ ] Secret scanning enabled
- [ ] Dependency scanning enabled
- [ ] SAST enabled
- [ ] Container scanning enabled
- [ ] Branch protection rules
- [ ] Signed commits (optional)

## Incident Response

See [Incident Response Runbook](../ops/runbooks/incident_response.md)

## Security Contacts

- Security Team: security@example.com
- On-Call: Use PagerDuty escalation
- Bug Bounty: security@example.com

## Compliance

### SOC 2 Considerations

- Access controls documented
- Audit logging enabled
- Encryption at rest and in transit
- Change management process
- Incident response procedures

### GDPR Considerations

- Data inventory maintained
- Consent mechanisms
- Data retention policies
- Right to erasure procedures
- Data processing agreements
