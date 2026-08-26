import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Log request
  req.logger?.info('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Capture response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMethod = res.statusCode >= 400 ? 'warn' : 'info';

    (req.logger || logger)[logMethod]('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
    });
  });

  next();
}
