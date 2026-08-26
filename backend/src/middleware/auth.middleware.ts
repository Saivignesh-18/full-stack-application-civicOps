import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../auth/jwt.js';
import { UnauthorizedError, InvalidTokenError } from '../errors/AppError.js';
import { prisma } from '../config/database.js';

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Authorization header is required');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Invalid authorization format. Use: Bearer <token>');
    }

    const token = authHeader.substring(7);

    if (!token) {
      throw new UnauthorizedError('Token is required');
    }

    // Verify token
    const payload = verifyAccessToken(token);

    // Check if session is still valid
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
    });

    if (!session || !session.isValid) {
      throw new InvalidTokenError('Session has been revoked');
    }

    if (session.expiresAt < new Date()) {
      throw new InvalidTokenError('Session has expired');
    }

    // Attach user info to request
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role as any,
      tenantId: payload.tenantId,
    };
    req.sessionId = payload.sessionId;

    next();
  } catch (error) {
    next(error);
  }
}

// Optional auth - doesn't fail if no token
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    if (!token) {
      return next();
    }

    const payload = verifyAccessToken(token);

    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
    });

    if (session && session.isValid && session.expiresAt > new Date()) {
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role as any,
        tenantId: payload.tenantId,
      };
      req.sessionId = payload.sessionId;
    }

    next();
  } catch {
    // Ignore errors for optional auth
    next();
  }
}
