import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError, ValidationError, ConflictError, NotFoundError, InternalServerError } from '../errors/AppError.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId;

  // Log error
  if (error instanceof AppError) {
    if (!error.isOperational) {
      logger.error('Non-operational error', {
        requestId,
        error: error.message,
        stack: error.stack,
        code: error.code,
      });
    } else {
      logger.warn('Operational error', {
        requestId,
        error: error.message,
        code: error.code,
      });
    }
  } else {
    logger.error('Unhandled error', {
      requestId,
      error: error.message,
      stack: error.stack,
    });
  }

  // Handle AppError
  if (error instanceof AppError) {
    sendError(
      res,
      error.statusCode,
      error.code,
      error.message,
      requestId,
      error.details
    );
    return;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = error.errors.reduce(
      (acc, err) => {
        const path = err.path.join('.');
        acc[path] = err.message;
        return acc;
      },
      {} as Record<string, string>
    );

    sendError(res, 422, 'VALIDATION_ERROR', 'Validation failed', requestId, details);
    return;
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(error, res, requestId);
    return;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request data', requestId);
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    sendError(res, 401, 'INVALID_TOKEN', 'Invalid token', requestId);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    sendError(res, 401, 'TOKEN_EXPIRED', 'Token has expired', requestId);
    return;
  }

  // Handle syntax errors (invalid JSON)
  if (error instanceof SyntaxError && 'body' in error) {
    sendError(res, 400, 'INVALID_JSON', 'Invalid JSON in request body', requestId);
    return;
  }

  // Default to 500 Internal Server Error
  const message = env.NODE_ENV === 'production' 
    ? 'An unexpected error occurred' 
    : error.message;

  sendError(res, 500, 'INTERNAL_SERVER_ERROR', message, requestId);
}

function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError,
  res: Response,
  requestId: string
): void {
  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = (error.meta?.target as string[])?.join(', ') || 'field';
      sendError(
        res,
        409,
        'DUPLICATE_ENTRY',
        `A record with this ${target} already exists`,
        requestId
      );
      break;
    }

    case 'P2003': {
      // Foreign key constraint violation
      sendError(
        res,
        400,
        'FOREIGN_KEY_ERROR',
        'Referenced record does not exist',
        requestId
      );
      break;
    }

    case 'P2025': {
      // Record not found
      sendError(
        res,
        404,
        'NOT_FOUND',
        'Record not found',
        requestId
      );
      break;
    }

    case 'P2014': {
      // Required relation violation
      sendError(
        res,
        400,
        'RELATION_ERROR',
        'Required relation violation',
        requestId
      );
      break;
    }

    default:
      sendError(
        res,
        500,
        'DATABASE_ERROR',
        'A database error occurred',
        requestId
      );
  }
}

// Handle 404 for undefined routes
export function notFoundHandler(req: Request, res: Response): void {
  sendError(
    res,
    404,
    'NOT_FOUND',
    `Route ${req.method} ${req.path} not found`,
    req.requestId
  );
}
