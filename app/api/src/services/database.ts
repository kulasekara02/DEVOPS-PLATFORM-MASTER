/**
 * Database Service
 *
 * PostgreSQL connection using Prisma ORM
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { dbQueriesTotal, dbQueryDuration } from '../utils/metrics.js';

// Singleton Prisma client
let prisma: PrismaClient | null = null;

export const getPrisma = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Query logging and metrics
    prisma.$on('query' as never, (e: { query: string; duration: number }) => {
      const operation = e.query.split(' ')[0].toLowerCase();
      dbQueriesTotal.inc({ operation, table: 'unknown' });
      dbQueryDuration.observe({ operation, table: 'unknown' }, e.duration / 1000);

      logger.debug({
        msg: 'Database query',
        query: e.query,
        duration: e.duration,
      });
    });
  }

  return prisma;
};

export const connectDatabase = async (): Promise<void> => {
  const client = getPrisma();
  await client.$connect();
  logger.info('Connected to PostgreSQL database');
};

export const disconnectDatabase = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    logger.info('Disconnected from PostgreSQL database');
  }
};

// Health check
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const client = getPrisma();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error({ msg: 'Database health check failed', error });
    return false;
  }
};
