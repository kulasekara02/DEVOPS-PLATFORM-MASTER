/**
 * Prometheus Metrics
 *
 * Defines application metrics for monitoring and alerting
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();

// Collect default Node.js metrics
export const setupMetrics = () => {
  collectDefaultMetrics({
    register,
    prefix: 'devops_api_',
  });
};

// HTTP request counter
export const httpRequestsTotal = new Counter({
  name: 'devops_api_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

// HTTP request duration histogram
export const httpRequestDuration = new Histogram({
  name: 'devops_api_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Database query counter
export const dbQueriesTotal = new Counter({
  name: 'devops_api_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table'],
  registers: [register],
});

// Database query duration
export const dbQueryDuration = new Histogram({
  name: 'devops_api_db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

// Redis operations counter
export const redisOperationsTotal = new Counter({
  name: 'devops_api_redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation'],
  registers: [register],
});

// Active connections gauge
export const activeConnections = new Gauge({
  name: 'devops_api_active_connections',
  help: 'Number of active connections',
  labelNames: ['type'],
  registers: [register],
});

// Job queue metrics
export const jobsTotal = new Counter({
  name: 'devops_api_jobs_total',
  help: 'Total number of jobs processed',
  labelNames: ['queue', 'status'],
  registers: [register],
});

export const jobsActive = new Gauge({
  name: 'devops_api_jobs_active',
  help: 'Number of currently active jobs',
  labelNames: ['queue'],
  registers: [register],
});

export const jobDuration = new Histogram({
  name: 'devops_api_job_duration_seconds',
  help: 'Job processing duration in seconds',
  labelNames: ['queue', 'job_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [register],
});
