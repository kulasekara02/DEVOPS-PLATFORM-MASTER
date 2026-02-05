/**
 * Application Configuration
 *
 * Centralized configuration management using environment variables
 * with type-safe defaults and validation
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration schema
const configSchema = z.object({
  // App settings
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  host: z.string().default('0.0.0.0'),
  port: z.coerce.number().default(8080),
  version: z.string().default('1.0.0'),

  // Database
  databaseUrl: z.string().default('postgresql://devops:devops_secret@postgres:5432/devops_platform'),

  // Redis
  redisUrl: z.string().default('redis://redis:6379/0'),

  // CORS
  corsOrigins: z.string().transform((val) => val.split(',')).default('http://localhost:3000'),

  // Rate limiting
  rateLimitWindowMs: z.coerce.number().default(900000), // 15 minutes
  rateLimitMaxRequests: z.coerce.number().default(100),

  // Logging
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  logFormat: z.enum(['json', 'pretty']).default('json'),

  // OpenTelemetry
  otelEnabled: z.coerce.boolean().default(true),
  otelServiceName: z.string().default('devops-platform-api'),
  otelExporterEndpoint: z.string().default('http://jaeger:4318'),

  // JWT
  jwtSecret: z.string().default('change-me-in-production'),
  jwtExpiresIn: z.string().default('1h'),
});

// Parse and validate configuration
const parseConfig = () => {
  const result = configSchema.safeParse({
    nodeEnv: process.env.NODE_ENV,
    host: process.env.API_HOST,
    port: process.env.API_PORT,
    version: process.env.npm_package_version || process.env.APP_VERSION,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    corsOrigins: process.env.CORS_ORIGINS,
    rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
    rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
    logLevel: process.env.LOG_LEVEL,
    logFormat: process.env.LOG_FORMAT,
    otelEnabled: process.env.OTEL_ENABLED,
    otelServiceName: process.env.OTEL_SERVICE_NAME,
    otelExporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  });

  if (!result.success) {
    console.error('Configuration validation failed:', result.error.format());
    process.exit(1);
  }

  return result.data;
};

export const config = parseConfig();

export type Config = typeof config;
