/**
 * DevOps Platform Master - API Service
 *
 * Main entry point for the Express REST API server
 * Includes OpenTelemetry instrumentation, structured logging,
 * and Prometheus metrics
 */

import './instrumentation.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { register as metricsRegister } from 'prom-client';

import { config } from './config.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestId } from './middleware/requestId.js';
import { healthRoutes } from './routes/health.js';
import { apiRoutes } from './routes/api.js';
import { jobsRoutes } from './routes/jobs.js';
import { setupMetrics } from './utils/metrics.js';
import { connectDatabase } from './services/database.js';
import { connectRedis } from './services/redis.js';

const app = express();

// =============================================================================
// Middleware Setup
// =============================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production',
}));

// CORS configuration
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware (for tracing)
app.use(requestId);

// Structured logging
app.use(pinoHttp({
  logger,
  customProps: (req) => ({
    requestId: req.id,
  }),
  redact: ['req.headers.authorization', 'req.headers.cookie'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// =============================================================================
// Routes
// =============================================================================

// Health check routes (no auth required)
app.use('/health', healthRoutes);

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', metricsRegister.contentType);
    res.end(await metricsRegister.metrics());
  } catch (error) {
    res.status(500).end(String(error));
  }
});

// API routes
app.use('/api/v1', apiRoutes);
app.use('/api/v1/jobs', jobsRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist',
  });
});

// Error handler (must be last)
app.use(errorHandler);

// =============================================================================
// Server Startup
// =============================================================================

async function startServer(): Promise<void> {
  try {
    // Initialize metrics
    setupMetrics();

    // Connect to database
    await connectDatabase();
    logger.info('Database connected');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected');

    // Start HTTP server
    const server = app.listen(config.port, config.host, () => {
      logger.info({
        msg: 'API server started',
        host: config.host,
        port: config.port,
        env: config.nodeEnv,
        version: config.version,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ msg: 'Shutdown signal received', signal });

      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force exit after timeout
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error({ msg: 'Failed to start server', error });
    process.exit(1);
  }
}

startServer();

export { app };
