/**
 * Request ID Middleware
 *
 * Adds a unique request ID to each request for tracing
 * Uses X-Request-ID header if provided, otherwise generates one
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  // Use existing request ID from header or generate new one
  const id = (req.headers['x-request-id'] as string) || uuidv4();

  // Attach to request object
  req.id = id;

  // Set response header for tracing
  res.setHeader('X-Request-ID', id);

  next();
};
