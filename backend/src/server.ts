import 'dotenv/config';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { logger } from './utils/logger.js';
import { setupWebSocket } from './websocket/socket.js';

async function main() {
  // Connect to database
  await connectDatabase();

  // Connect to Redis
  await connectRedis();

  // Create Express app
  const app = createApp();

  // Create HTTP server
  const server = http.createServer(app);

  // Setup WebSocket
  const io = new SocketIOServer(server, {
    cors: {
      origin: env.CORS_ORIGIN.split(','),
      credentials: true,
    },
  });

  setupWebSocket(io);

  // Start server
  server.listen(env.PORT, env.HOST, () => {
    logger.info(`Server started`, {
      host: env.HOST,
      port: env.PORT,
      environment: env.NODE_ENV,
    });
    logger.info(`Health check: http://${env.HOST}:${env.PORT}/health`);
    logger.info(`API base: http://${env.HOST}:${env.PORT}/api/v1`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    server.close(async () => {
      logger.info('HTTP server closed');

      await disconnectDatabase();
      await disconnectRedis();

      logger.info('Shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
  });
}

main().catch((error) => {
  logger.error('Failed to start server', { error: error.message });
  process.exit(1);
});
