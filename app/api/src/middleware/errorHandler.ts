/**
 * Global Error Handler Middleware
 *
 * Catches all errors and returns appropriate JSON responses
 * Logs errors with correlation IDs for debugging
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational ?? false;

  // Log the error
  logger.error({
    msg: err.message,
    requestId: req.id,
    method: req.method,
    path: req.path,
    statusCode,
    stack: config.nodeEnv !== 'production' ? err.stack : undefined,
    isOperational,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      requestId: req.id,
    });
    return;
  }

  // Standard error response
  const response: Record<string, unknown> = {
    error: statusCode >= 500 ? 'Internal Server Error' : err.name || 'Error',
    message: isOperational || config.nodeEnv !== 'production'
      ? err.message
      : 'An unexpected error occurred',
    requestId: req.id,
  };

  // Include stack trace in development
  if (config.nodeEnv === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

// Helper to create operational errors
export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string
): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  return error;
};

// Common error factories
export const errors = {
  notFound: (resource: string = 'Resource') =>
    createError(`${resource} not found`, 404, 'NOT_FOUND'),

  badRequest: (message: string = 'Bad request') =>
    createError(message, 400, 'BAD_REQUEST'),

  unauthorized: (message: string = 'Unauthorized') =>
    createError(message, 401, 'UNAUTHORIZED'),

  forbidden: (message: string = 'Forbidden') =>
    createError(message, 403, 'FORBIDDEN'),

  conflict: (message: string = 'Conflict') =>
    createError(message, 409, 'CONFLICT'),

  internal: (message: string = 'Internal server error') =>
    createError(message, 500, 'INTERNAL_ERROR'),
};
