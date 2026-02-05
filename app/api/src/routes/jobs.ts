/**
 * Job Queue Routes
 *
 * Endpoints for managing background jobs
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Queue } from 'bullmq';
import { z } from 'zod';
import { getRedis } from '../services/redis.js';
import { logger } from '../utils/logger.js';
import { errors } from '../middleware/errorHandler.js';

const router = Router();

// Job queue instance
let jobQueue: Queue | null = null;

const getJobQueue = (): Queue => {
  if (!jobQueue) {
    jobQueue = new Queue('default', {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }
  return jobQueue;
};

// =============================================================================
// Schema Definitions
// =============================================================================

const createJobSchema = z.object({
  type: z.enum(['process-data', 'send-notification', 'generate-report', 'cleanup']),
  data: z.record(z.unknown()),
  priority: z.number().int().min(1).max(10).default(5),
  delay: z.number().int().min(0).default(0),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/v1/jobs
 * List recent jobs
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const queue = getJobQueue();

    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(0, 10),
      queue.getActive(0, 10),
      queue.getCompleted(0, 10),
      queue.getFailed(0, 10),
    ]);

    const counts = await queue.getJobCounts();

    res.json({
      counts,
      jobs: {
        waiting: waiting.map(formatJob),
        active: active.map(formatJob),
        completed: completed.map(formatJob),
        failed: failed.map(formatJob),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/jobs
 * Create a new job
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, data, priority, delay } = createJobSchema.parse(req.body);
    const queue = getJobQueue();

    const job = await queue.add(type, data, {
      priority,
      delay,
    });

    logger.info({
      msg: 'Job created',
      jobId: job.id,
      type,
      requestId: req.id,
    });

    res.status(201).json({
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      timestamp: job.timestamp,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/jobs/:id
 * Get job details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const queue = getJobQueue();
    const job = await queue.getJob(id);

    if (!job) {
      throw errors.notFound('Job');
    }

    const state = await job.getState();
    const progress = job.progress;
    const logs = await queue.getJobLogs(id);

    res.json({
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      state,
      progress,
      logs: logs.logs,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/jobs/:id
 * Remove a job
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const queue = getJobQueue();
    const job = await queue.getJob(id);

    if (!job) {
      throw errors.notFound('Job');
    }

    await job.remove();

    logger.info({ msg: 'Job removed', jobId: id, requestId: req.id });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/jobs/:id/retry
 * Retry a failed job
 */
router.post('/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const queue = getJobQueue();
    const job = await queue.getJob(id);

    if (!job) {
      throw errors.notFound('Job');
    }

    const state = await job.getState();
    if (state !== 'failed') {
      throw errors.badRequest('Only failed jobs can be retried');
    }

    await job.retry();

    logger.info({ msg: 'Job retried', jobId: id, requestId: req.id });

    res.json({ message: 'Job queued for retry', id: job.id });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/jobs/clean
 * Clean old jobs
 */
router.post('/clean', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const queue = getJobQueue();
    const grace = 60 * 60 * 1000; // 1 hour

    const [completed, failed] = await Promise.all([
      queue.clean(grace, 100, 'completed'),
      queue.clean(grace, 100, 'failed'),
    ]);

    logger.info({
      msg: 'Jobs cleaned',
      completedRemoved: completed.length,
      failedRemoved: failed.length,
    });

    res.json({
      cleaned: {
        completed: completed.length,
        failed: failed.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to format job for response
function formatJob(job: { id?: string; name: string; data: unknown; timestamp?: number }) {
  return {
    id: job.id,
    name: job.name,
    data: job.data,
    timestamp: job.timestamp,
  };
}

export { router as jobsRoutes };
