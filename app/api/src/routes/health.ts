/**
 * Health Check Routes
 *
 * Provides liveness and readiness probes for Kubernetes
 */

import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../services/database.js';
import { checkRedisHealth } from '../services/redis.js';
import { config } from '../config.js';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks?: Record<string, { status: string; message?: string }>;
}

/**
 * GET /health
 * Basic liveness probe - returns 200 if the service is running
 */
router.get('/', (_req: Request, res: Response) => {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: config.version,
    uptime: process.uptime(),
  };

  res.status(200).json(health);
});

/**
 * GET /health/live
 * Kubernetes liveness probe
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

/**
 * GET /health/ready
 * Kubernetes readiness probe - checks all dependencies
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; message?: string }> = {};
  let isReady = true;

  // Check database
  try {
    const dbHealthy = await checkDatabaseHealth();
    checks.database = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
    };
    if (!dbHealthy) isReady = false;
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    isReady = false;
  }

  // Check Redis
  try {
    const redisHealthy = await checkRedisHealth();
    checks.redis = {
      status: redisHealthy ? 'healthy' : 'unhealthy',
    };
    if (!redisHealthy) isReady = false;
  } catch (error) {
    checks.redis = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    isReady = false;
  }

  const health: HealthStatus = {
    status: isReady ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: config.version,
    uptime: process.uptime(),
    checks,
  };

  res.status(isReady ? 200 : 503).json(health);
});

/**
 * GET /health/startup
 * Kubernetes startup probe
 */
router.get('/startup', async (_req: Request, res: Response) => {
  // Same as readiness for now
  const dbHealthy = await checkDatabaseHealth();
  const redisHealthy = await checkRedisHealth();

  if (dbHealthy && redisHealthy) {
    res.status(200).json({ status: 'started' });
  } else {
    res.status(503).json({ status: 'starting' });
  }
});

export { router as healthRoutes };
