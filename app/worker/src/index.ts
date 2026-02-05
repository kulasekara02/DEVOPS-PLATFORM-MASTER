/**
 * DevOps Platform Master - Worker Service
 *
 * Background job processor using BullMQ
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';
import dotenv from 'dotenv';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import http from 'http';

import { processDataJob } from './jobs/processData.js';
import { sendNotificationJob } from './jobs/sendNotification.js';
import { generateReportJob } from './jobs/generateReport.js';
import { cleanupJob } from './jobs/cleanup.js';

dotenv.config();

// =============================================================================
// Configuration
// =============================================================================

const config = {
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379/0',
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  metricsPort: parseInt(process.env.METRICS_PORT || '9091', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
};

// =============================================================================
// Logger
// =============================================================================

const logger = pino({
  level: config.logLevel,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'devops-platform-worker',
    version: process.env.npm_package_version || '1.0.0',
  },
});

// =============================================================================
// Metrics
// =============================================================================

collectDefaultMetrics({ prefix: 'devops_worker_' });

const jobsProcessed = new Counter({
  name: 'devops_worker_jobs_processed_total',
  help: 'Total number of jobs processed',
  labelNames: ['job_type', 'status'],
});

const jobDuration = new Histogram({
  name: 'devops_worker_job_duration_seconds',
  help: 'Job processing duration in seconds',
  labelNames: ['job_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
});

const activeJobs = new Gauge({
  name: 'devops_worker_active_jobs',
  help: 'Number of currently active jobs',
});

// =============================================================================
// Job Handlers
// =============================================================================

type JobHandler = (job: Job) => Promise<unknown>;

const jobHandlers: Record<string, JobHandler> = {
  'process-data': processDataJob,
  'send-notification': sendNotificationJob,
  'generate-report': generateReportJob,
  'cleanup': cleanupJob,
};

// =============================================================================
// Worker
// =============================================================================

const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  'default',
  async (job: Job) => {
    const startTime = Date.now();
    const handler = jobHandlers[job.name];

    if (!handler) {
      throw new Error(`Unknown job type: ${job.name}`);
    }

    activeJobs.inc();

    try {
      logger.info({
        msg: 'Processing job',
        jobId: job.id,
        jobType: job.name,
        attempt: job.attemptsMade + 1,
      });

      const result = await handler(job);

      const duration = (Date.now() - startTime) / 1000;
      jobsProcessed.inc({ job_type: job.name, status: 'completed' });
      jobDuration.observe({ job_type: job.name }, duration);

      logger.info({
        msg: 'Job completed',
        jobId: job.id,
        jobType: job.name,
        duration,
      });

      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      jobsProcessed.inc({ job_type: job.name, status: 'failed' });
      jobDuration.observe({ job_type: job.name }, duration);

      logger.error({
        msg: 'Job failed',
        jobId: job.id,
        jobType: job.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      throw error;
    } finally {
      activeJobs.dec();
    }
  },
  {
    connection,
    concurrency: config.concurrency,
  }
);

// =============================================================================
// Event Handlers
// =============================================================================

worker.on('ready', () => {
  logger.info('Worker is ready');
});

worker.on('completed', (job) => {
  logger.debug({ msg: 'Job completed', jobId: job.id });
});

worker.on('failed', (job, error) => {
  logger.error({
    msg: 'Job failed',
    jobId: job?.id,
    error: error.message,
  });
});

worker.on('error', (error) => {
  logger.error({ msg: 'Worker error', error: error.message });
});

// =============================================================================
// Metrics Server
// =============================================================================

const metricsServer = http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  } else if (req.url === '/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'healthy' }));
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

metricsServer.listen(config.metricsPort, () => {
  logger.info(`Metrics server listening on port ${config.metricsPort}`);
});

// =============================================================================
// Graceful Shutdown
// =============================================================================

const shutdown = async (signal: string) => {
  logger.info({ msg: 'Shutdown signal received', signal });

  await worker.close();
  await connection.quit();
  metricsServer.close();

  logger.info('Worker shut down gracefully');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

logger.info({
  msg: 'Worker started',
  concurrency: config.concurrency,
  queues: ['default'],
});
