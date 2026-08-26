import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../auth/jwt.js';
import { logger } from '../utils/logger.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  role?: string;
}

// Max simultaneous WebSocket connections per user (rate-limit rule).
const MAX_WS_CONNECTIONS_PER_USER = 5;
const RATE_LIMIT_DISABLED = process.env.DISABLE_RATE_LIMIT === 'true';
// Tracks active connection counts keyed by userId.
const activeConnections = new Map<string, number>();

export function setupWebSocket(io: SocketIOServer): void {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.userId;
      socket.tenantId = payload.tenantId;
      socket.role = payload.role;

      // Enforce max active connections per user
      if (!RATE_LIMIT_DISABLED && socket.userId) {
        const current = activeConnections.get(socket.userId) || 0;
        if (current >= MAX_WS_CONNECTIONS_PER_USER) {
          return next(new Error('Too many active connections'));
        }
      }

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    // Track active connection count for this user
    if (socket.userId) {
      activeConnections.set(socket.userId, (activeConnections.get(socket.userId) || 0) + 1);
    }

    logger.info('WebSocket client connected', {
      socketId: socket.id,
      userId: socket.userId,
      tenantId: socket.tenantId,
    });

    // Join tenant room
    if (socket.tenantId) {
      socket.join(`tenant:${socket.tenantId}`);
    }

    // Join user room (for private notifications)
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Handle joining specific rooms (wards, departments, etc.)
    socket.on('join:ward', (wardId: string) => {
      if (socket.tenantId) {
        socket.join(`tenant:${socket.tenantId}:ward:${wardId}`);
        logger.debug('User joined ward room', { userId: socket.userId, wardId });
      }
    });

    socket.on('join:department', (departmentId: string) => {
      if (socket.tenantId) {
        socket.join(`tenant:${socket.tenantId}:department:${departmentId}`);
        logger.debug('User joined department room', { userId: socket.userId, departmentId });
      }
    });

    socket.on('join:complaint', (complaintId: string) => {
      if (socket.tenantId) {
        socket.join(`tenant:${socket.tenantId}:complaint:${complaintId}`);
        logger.debug('User joined complaint room', { userId: socket.userId, complaintId });
      }
    });

    // Handle leaving rooms
    socket.on('leave:ward', (wardId: string) => {
      if (socket.tenantId) {
        socket.leave(`tenant:${socket.tenantId}:ward:${wardId}`);
      }
    });

    socket.on('leave:department', (departmentId: string) => {
      if (socket.tenantId) {
        socket.leave(`tenant:${socket.tenantId}:department:${departmentId}`);
      }
    });

    socket.on('leave:complaint', (complaintId: string) => {
      if (socket.tenantId) {
        socket.leave(`tenant:${socket.tenantId}:complaint:${complaintId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      // Release the active connection slot for this user
      if (socket.userId) {
        const current = activeConnections.get(socket.userId) || 0;
        if (current <= 1) {
          activeConnections.delete(socket.userId);
        } else {
          activeConnections.set(socket.userId, current - 1);
        }
      }

      logger.info('WebSocket client disconnected', {
        socketId: socket.id,
        userId: socket.userId,
        reason,
      });
    });

    socket.on('error', (error) => {
      logger.error('WebSocket error', {
        socketId: socket.id,
        userId: socket.userId,
        error: error.message,
      });
    });
  });
}

// Helper functions to emit events
export function emitToTenant(io: SocketIOServer, tenantId: string, event: string, data: unknown): void {
  io.to(`tenant:${tenantId}`).emit(event, data);
}

export function emitToUser(io: SocketIOServer, userId: string, event: string, data: unknown): void {
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToWard(io: SocketIOServer, tenantId: string, wardId: string, event: string, data: unknown): void {
  io.to(`tenant:${tenantId}:ward:${wardId}`).emit(event, data);
}

export function emitToDepartment(io: SocketIOServer, tenantId: string, departmentId: string, event: string, data: unknown): void {
  io.to(`tenant:${tenantId}:department:${departmentId}`).emit(event, data);
}

export function emitToComplaint(io: SocketIOServer, tenantId: string, complaintId: string, event: string, data: unknown): void {
  io.to(`tenant:${tenantId}:complaint:${complaintId}`).emit(event, data);
}
