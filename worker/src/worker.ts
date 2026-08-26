import { Worker, Queue } from 'bullmq';
import { createRedisConnection } from './config/redis.js';
import { QUEUE_NAMES } from './queues/index.js';
import { processNotification } from './processors/notification.processor.js';
import { processEmail } from './processors/email.processor.js';
import { processWebhook } from './processors/webhook.processor.js';
import { processReport } from './processors/report.processor.js';
import { processDocument } from './processors/document.processor.js';
import { logger } from './utils/logger.js';

// Create Redis connection
const connection = createRedisConnection();

// Store workers for graceful shutdown
const workers: Worker[] = [];

function createWorker(
  queueName: string,
  processor: (job: any) => Promise<void>,
  concurrency = 5
): Worker {
  const worker = new Worker(queueName, processor, {
    connection,
    concurrency,
    removeOnComplete: { count: 1000, age: 24 * 3600 }, // Keep last 1000 or 24h
    removeOnFail: { count: 5000, age: 7 * 24 * 3600 }, // Keep last 5000 or 7 days
  });

  worker.on('completed', (job) => {
    logger.info(`Job completed`, {
      queue: queueName,
      jobId: job.id,
      jobName: job.name,
    });
  });

  worker.on('failed', (job, error) => {
    logger.error(`Job failed`, {
      queue: queueName,
      jobId: job?.id,
      jobName: job?.name,
      error: error.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on('error', (error) => {
    logger.error(`Worker error`, {
      queue: queueName,
      error: error.message,
    });
  });

  workers.push(worker);
  return worker;
}

async function main(): Promise<void> {
  logger.info('Starting CivicOps Worker...');

  // Create workers for each queue
  createWorker(QUEUE_NAMES.NOTIFICATION, processNotification, 10);
  createWorker(QUEUE_NAMES.EMAIL, processEmail, 5);
  createWorker(QUEUE_NAMES.WEBHOOK, processWebhook, 5);
  createWorker(QUEUE_NAMES.REPORT, processReport, 2);
  createWorker(QUEUE_NAMES.DOCUMENT, processDocument, 3);

  logger.info('All workers started', {
    queues: Object.values(QUEUE_NAMES),
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down workers...`);

    await Promise.all(workers.map((worker) => worker.close()));
    await connection.quit();

    logger.info('Workers shut down gracefully');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('Failed to start worker', { error: error.message });
  process.exit(1);
});
