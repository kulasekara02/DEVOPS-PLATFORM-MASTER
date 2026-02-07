# Backup and Restore Runbook

## Backup Strategy

| Data Type | Frequency | Retention | Location |
|-----------|-----------|-----------|----------|
| PostgreSQL | Daily | 30 days | S3/Cloud Storage |
| PostgreSQL | Hourly (WAL) | 7 days | S3/Cloud Storage |
| Redis | On-demand | 3 days | Local/S3 |
| Configuration | On change | Forever | Git |

## PostgreSQL Backup

### Manual Backup

```bash
# Docker Compose
docker compose exec postgres pg_dump -U devops -d devops_platform > backup_$(date +%Y%m%d_%H%M%S).sql

# Kubernetes
kubectl exec -it postgres-0 -n devops-platform -- \
  pg_dump -U devops -d devops_platform > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
kubectl exec -it postgres-0 -n devops-platform -- \
  pg_dump -U devops -d devops_platform | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Automated Backup Script

```bash
#!/bin/bash
# backup_postgres.sh

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"

# Create backup
kubectl exec -it postgres-0 -n devops-platform -- \
  pg_dump -U devops -d devops_platform | gzip > "$BACKUP_FILE"

# Upload to S3 (optional)
# aws s3 cp "$BACKUP_FILE" s3://your-bucket/backups/

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

### Scheduled Backups with CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: devops-platform
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15-alpine
            command:
            - /bin/sh
            - -c
            - |
              pg_dump -h postgres -U devops -d devops_platform | gzip > /backups/backup_$(date +%Y%m%d).sql.gz
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: POSTGRES_PASSWORD
            volumeMounts:
            - name: backup-volume
              mountPath: /backups
          restartPolicy: OnFailure
          volumes:
          - name: backup-volume
            persistentVolumeClaim:
              claimName: backup-pvc
```

## PostgreSQL Restore

### From SQL Dump

```bash
# Docker Compose
cat backup.sql | docker compose exec -T postgres psql -U devops -d devops_platform

# Kubernetes
cat backup.sql | kubectl exec -i postgres-0 -n devops-platform -- psql -U devops -d devops_platform

# From compressed backup
gunzip -c backup.sql.gz | kubectl exec -i postgres-0 -n devops-platform -- psql -U devops -d devops_platform
```

### Full Database Restore

```bash
# 1. Stop application pods
kubectl scale deployment/api --replicas=0 -n devops-platform
kubectl scale deployment/worker --replicas=0 -n devops-platform

# 2. Drop and recreate database
kubectl exec -it postgres-0 -n devops-platform -- psql -U devops -c "DROP DATABASE IF EXISTS devops_platform;"
kubectl exec -it postgres-0 -n devops-platform -- psql -U devops -c "CREATE DATABASE devops_platform;"

# 3. Restore from backup
gunzip -c backup.sql.gz | kubectl exec -i postgres-0 -n devops-platform -- psql -U devops -d devops_platform

# 4. Run migrations (if newer than backup)
kubectl exec -it deployment/api -n devops-platform -- npx prisma migrate deploy

# 5. Restart application pods
kubectl scale deployment/api --replicas=3 -n devops-platform
kubectl scale deployment/worker --replicas=2 -n devops-platform
```

## Redis Backup

### Manual Backup

```bash
# Trigger save
docker compose exec redis redis-cli BGSAVE

# Wait for save to complete
docker compose exec redis redis-cli LASTSAVE

# Copy dump file
docker cp $(docker compose ps -q redis):/data/dump.rdb ./redis_backup.rdb
```

### Kubernetes

```bash
# Trigger save
kubectl exec -it redis-0 -n devops-platform -- redis-cli BGSAVE

# Copy dump
kubectl cp devops-platform/redis-0:/data/dump.rdb ./redis_backup.rdb
```

## Redis Restore

```bash
# Stop Redis
kubectl scale deployment/redis --replicas=0 -n devops-platform

# Copy dump file
kubectl cp ./redis_backup.rdb devops-platform/redis-0:/data/dump.rdb

# Start Redis
kubectl scale deployment/redis --replicas=1 -n devops-platform

# Verify
kubectl exec -it redis-0 -n devops-platform -- redis-cli INFO keyspace
```

## Disaster Recovery

### Complete System Recovery

1. **Provision Infrastructure**
   ```bash
   cd infra/terraform/envs/prod
   terraform init
   terraform apply
   ```

2. **Create Kubernetes Resources**
   ```bash
   kubectl apply -f infra/k8s/base/namespace.yaml
   kubectl create secret generic app-secrets --from-env-file=.env -n devops-platform
   ```

3. **Restore Database**
   ```bash
   # Deploy PostgreSQL
   kustomize build infra/k8s/overlays/prod | kubectl apply -f -

   # Wait for PostgreSQL to be ready
   kubectl wait --for=condition=ready pod -l app=postgres -n devops-platform --timeout=300s

   # Restore from latest backup
   gunzip -c /backups/latest.sql.gz | kubectl exec -i postgres-0 -n devops-platform -- psql -U devops -d devops_platform
   ```

4. **Deploy Applications**
   ```bash
   kustomize build infra/k8s/overlays/prod | kubectl apply -f -
   kubectl rollout status deployment -n devops-platform
   ```

5. **Verify**
   ```bash
   ./ci/scripts/smoke_test.sh
   ```

## Verification

### Verify Backup Integrity

```bash
# Test restore to temporary database
kubectl exec -it postgres-0 -n devops-platform -- psql -U devops -c "CREATE DATABASE test_restore;"
gunzip -c backup.sql.gz | kubectl exec -i postgres-0 -n devops-platform -- psql -U devops -d test_restore

# Verify row counts
kubectl exec -it postgres-0 -n devops-platform -- psql -U devops -d test_restore -c "SELECT COUNT(*) FROM items;"

# Clean up
kubectl exec -it postgres-0 -n devops-platform -- psql -U devops -c "DROP DATABASE test_restore;"
```

### Regular Backup Testing

Schedule monthly restore tests to verify backup integrity.

## Monitoring Backups

- Alert if backup job fails
- Alert if backup age > 25 hours
- Monitor backup storage usage
- Track backup duration trends
