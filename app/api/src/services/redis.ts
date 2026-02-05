/**
 * Redis Service
 *
 * Redis connection for caching and job queue
 */

import Redis from 'ioredis';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { redisOperationsTotal, activeConnections } from '../utils/metrics.js';

let redis: Redis | null = null;

export const getRedis = (): Redis => {
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 10) {
          logger.error('Redis connection failed after 10 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
      activeConnections.inc({ type: 'redis' });
    });

    redis.on('error', (error) => {
      logger.error({ msg: 'Redis error', error: error.message });
    });

    redis.on('close', () => {
      logger.info('Redis connection closed');
      activeConnections.dec({ type: 'redis' });
    });
  }

  return redis;
};

export const connectRedis = async (): Promise<void> => {
  const client = getRedis();
  await client.connect();
};

export const disconnectRedis = async (): Promise<void> => {
  if (redis) {
    await redis.quit();
    redis = null;
  }
};

// Health check
export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const client = getRedis();
    const result = await client.ping();
    redisOperationsTotal.inc({ operation: 'ping' });
    return result === 'PONG';
  } catch (error) {
    logger.error({ msg: 'Redis health check failed', error });
    return false;
  }
};

// Cache helpers
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const client = getRedis();
    const value = await client.get(key);
    redisOperationsTotal.inc({ operation: 'get' });
    return value ? JSON.parse(value) : null;
  },

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const client = getRedis();
    const serialized = JSON.stringify(value);

    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
    redisOperationsTotal.inc({ operation: 'set' });
  },

  async del(key: string): Promise<void> {
    const client = getRedis();
    await client.del(key);
    redisOperationsTotal.inc({ operation: 'del' });
  },

  async exists(key: string): Promise<boolean> {
    const client = getRedis();
    const result = await client.exists(key);
    redisOperationsTotal.inc({ operation: 'exists' });
    return result === 1;
  },
};
