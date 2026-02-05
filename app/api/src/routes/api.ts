/**
 * Main API Routes
 *
 * REST API endpoints for the application
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPrisma } from '../services/database.js';
import { cache } from '../services/redis.js';
import { logger } from '../utils/logger.js';
import { errors } from '../middleware/errorHandler.js';
import { httpRequestsTotal, httpRequestDuration } from '../utils/metrics.js';

const router = Router();

// Request timing middleware
router.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const path = req.route?.path || req.path;

    httpRequestsTotal.inc({
      method: req.method,
      path,
      status: res.statusCode.toString(),
    });

    httpRequestDuration.observe({
      method: req.method,
      path,
      status: res.statusCode.toString(),
    }, duration);
  });

  next();
});

// =============================================================================
// Schema Definitions
// =============================================================================

const createItemSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateItemSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/v1/
 * API root - returns API information
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'DevOps Platform Master API',
    version: '1.0.0',
    endpoints: {
      items: '/api/v1/items',
      jobs: '/api/v1/jobs',
      health: '/health',
      metrics: '/metrics',
    },
  });
});

/**
 * GET /api/v1/items
 * List all items with pagination
 */
router.get('/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search, sortBy, sortOrder } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    // Try cache first
    const cacheKey = `items:${page}:${limit}:${search || ''}:${sortBy}:${sortOrder}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      logger.debug({ msg: 'Cache hit', key: cacheKey });
      res.json(cached);
      return;
    }

    const prisma = getPrisma();

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.item.count({ where }),
    ]);

    const response = {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };

    // Cache for 30 seconds
    await cache.set(cacheKey, response, 30);

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/items/:id
 * Get a single item by ID
 */
router.get('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Try cache first
    const cacheKey = `item:${id}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      res.json(cached);
      return;
    }

    const prisma = getPrisma();
    const item = await prisma.item.findUnique({ where: { id } });

    if (!item) {
      throw errors.notFound('Item');
    }

    // Cache for 60 seconds
    await cache.set(cacheKey, item, 60);

    res.json(item);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/items
 * Create a new item
 */
router.post('/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createItemSchema.parse(req.body);
    const prisma = getPrisma();

    const item = await prisma.item.create({
      data: {
        id: uuidv4(),
        ...data,
        status: 'active',
      },
    });

    logger.info({ msg: 'Item created', itemId: item.id, requestId: req.id });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/items/:id
 * Update an existing item
 */
router.patch('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateItemSchema.parse(req.body);
    const prisma = getPrisma();

    const item = await prisma.item.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    await cache.del(`item:${id}`);

    logger.info({ msg: 'Item updated', itemId: item.id, requestId: req.id });

    res.json(item);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/items/:id
 * Delete an item
 */
router.delete('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const prisma = getPrisma();

    await prisma.item.delete({ where: { id } });

    // Invalidate cache
    await cache.del(`item:${id}`);

    logger.info({ msg: 'Item deleted', itemId: id, requestId: req.id });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/stats
 * Get application statistics
 */
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();

    const [totalItems, activeItems, recentItems] = await Promise.all([
      prisma.item.count(),
      prisma.item.count({ where: { status: 'active' } }),
      prisma.item.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    res.json({
      items: {
        total: totalItems,
        active: activeItems,
        createdLast24h: recentItems,
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as apiRoutes };
