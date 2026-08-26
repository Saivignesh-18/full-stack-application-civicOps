import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createRequestLogger } from '../utils/logger.js';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use existing request ID from header or generate new one
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  
  req.requestId = requestId;
  req.logger = createRequestLogger(requestId);
  
  // Set response header
  res.setHeader('X-Request-ID', requestId);
  
  next();
}
