# Architecture Overview

## System Architecture

```
                                 ┌─────────────────┐
                                 │   CDN/Edge      │
                                 └────────┬────────┘
                                          │
                                 ┌────────▼────────┐
                                 │   Load Balancer │
                                 │   (Nginx/ALB)   │
                                 └────────┬────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
     ┌────────▼────────┐        ┌────────▼────────┐        ┌─────────▼────────┐
     │    Frontend     │        │      API        │        │    API (replica) │
     │    (React)      │        │   (Node.js)     │        │    (Node.js)     │
     │    Port 80      │        │   Port 8080     │        │    Port 8080     │
     └─────────────────┘        └────────┬────────┘        └──────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
     ┌────────▼────────┐        ┌────────▼────────┐        ┌─────────▼────────┐
     │   PostgreSQL    │        │     Redis       │        │     Worker       │
     │   Port 5432     │        │   Port 6379     │        │   (Background)   │
     └─────────────────┘        └─────────────────┘        └──────────────────┘
```

## Components

### Frontend (React + Vite)

**Purpose**: Web UI dashboard for managing the platform

**Key Features**:
- React 18 with TypeScript
- TanStack Query for data fetching
- Tailwind CSS for styling
- Vite for fast development

**Endpoints**:
- `/` - Dashboard
- `/items` - Items management
- `/jobs` - Background jobs
- `/health` - System health

### API Service (Node.js + Express)

**Purpose**: REST API backend

**Key Features**:
- Express.js framework
- Prisma ORM for database
- OpenTelemetry for tracing
- Prometheus metrics
- Rate limiting
- Input validation with Zod

**Endpoints**:
- `GET /health/*` - Health checks
- `GET /metrics` - Prometheus metrics
- `GET/POST /api/v1/items` - Items CRUD
- `GET/POST /api/v1/jobs` - Job management
- `GET /api/v1/stats` - Statistics

### Worker Service

**Purpose**: Background job processing

**Key Features**:
- BullMQ for job queue
- Prometheus metrics
- Graceful shutdown
- Retry logic

**Job Types**:
- `process-data` - Data processing
- `send-notification` - Notifications
- `generate-report` - Report generation
- `cleanup` - Maintenance tasks

### PostgreSQL

**Purpose**: Primary data store

**Configuration**:
- Version: 15
- Extensions: uuid-ossp, pg_trgm
- Connection pooling via Prisma

**Tables**:
- `items` - Main entity
- `users` - User accounts
- `audit_logs` - Audit trail
- `settings` - Configuration

### Redis

**Purpose**: Caching and job queue

**Usage**:
- API response caching
- Session storage
- BullMQ job queue
- Rate limiting

## Data Flow

### Request Flow

```
User Request
    │
    ▼
┌─────────┐
│  Nginx  │ ─── Rate Limiting, TLS
└────┬────┘
     │
     ▼
┌─────────┐
│   API   │ ─── Authentication, Validation
└────┬────┘
     │
     ├──────────┐
     │          │
     ▼          ▼
┌─────────┐ ┌─────────┐
│  Redis  │ │Postgres │
│ (Cache) │ │  (DB)   │
└─────────┘ └─────────┘
```

### Job Processing Flow

```
API Request
    │
    ▼
┌─────────┐
│   API   │ ─── Create Job
└────┬────┘
     │
     ▼
┌─────────┐
│  Redis  │ ─── Job Queue (BullMQ)
└────┬────┘
     │
     ▼
┌─────────┐
│ Worker  │ ─── Process Job
└────┬────┘
     │
     ▼
Result / Notification
```

## Observability Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Observability                             │
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │Prometheus│   │ Grafana  │   │   Loki   │   │  Jaeger  │ │
│  │ Metrics  │   │Dashboards│   │   Logs   │   │ Tracing  │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘ │
│       ▲              ▲              ▲              ▲        │
│       │              │              │              │        │
│       └──────────────┴──────────────┴──────────────┘        │
│                          │                                   │
│                    ┌─────┴─────┐                            │
│                    │Application│                            │
│                    │ Services  │                            │
│                    └───────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

## Kubernetes Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                 Namespace: devops-platform              │ │
│  │                                                         │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │ │
│  │  │Frontend │  │   API   │  │ Worker  │  │Postgres │   │ │
│  │  │  x2     │  │   x3    │  │   x2    │  │  x1     │   │ │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘   │ │
│  │       │            │            │            │         │ │
│  │  ┌────▼────────────▼────────────▼────────────▼────┐   │ │
│  │  │              Services (ClusterIP)              │   │ │
│  │  └─────────────────────┬──────────────────────────┘   │ │
│  │                        │                               │ │
│  │  ┌─────────────────────▼──────────────────────────┐   │ │
│  │  │                  Ingress                        │   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Security Architecture

### Network Security

- Network policies isolate pods
- Only required ports exposed
- TLS for external traffic
- Internal traffic encrypted (mTLS optional)

### Authentication & Authorization

- JWT tokens for API auth
- Service accounts in Kubernetes
- Secrets managed externally
- RBAC for cluster access

### Container Security

- Non-root containers
- Read-only filesystems
- Dropped capabilities
- Resource limits enforced

## Scalability

### Horizontal Scaling

| Component | Min | Max | Scaling Metric |
|-----------|-----|-----|----------------|
| Frontend | 2 | 10 | CPU 70% |
| API | 3 | 20 | CPU 60% |
| Worker | 2 | 10 | CPU 70% |

### Vertical Scaling

- PostgreSQL: Scale up for more connections
- Redis: Scale up for more memory

## Disaster Recovery

- Multi-AZ deployment
- Database backups (daily)
- WAL archiving (continuous)
- Documented recovery procedures
- RTO: 1 hour, RPO: 15 minutes
