import { Job } from 'bullmq';
import crypto from 'crypto';
import type { WebhookJobData } from '../queues/index.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export async function processWebhook(job: Job<WebhookJobData>): Promise<void> {
  const { webhookId, endpointUrl, event, payload, secret, attempt } = job.data;

  logger.info(`Processing webhook delivery`, {
    jobId: job.id,
    webhookId,
    event,
    attempt,
  });

  try {
    // Generate signature
    const timestamp = Date.now();
    const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');

    // Make HTTP request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.WEBHOOK_TIMEOUT);

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CivicOps-Event': event,
          'X-CivicOps-Signature': `v1=${signature}`,
          'X-CivicOps-Timestamp': String(timestamp),
          'X-CivicOps-Delivery-ID': job.id || 'unknown',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
      }

      logger.info(`Webhook delivered successfully`, {
        jobId: job.id,
        webhookId,
        statusCode: response.status,
      });

      // TODO: Update webhook delivery status in database
    } catch (fetchError) {
      clearTimeout(timeout);
      throw fetchError;
    }
  } catch (error) {
    logger.error(`Webhook delivery failed`, {
      jobId: job.id,
      webhookId,
      attempt,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // TODO: Update webhook delivery status in database

    // Re-throw to trigger retry
    if (attempt < env.WEBHOOK_MAX_RETRIES) {
      throw error;
    }

    logger.error(`Webhook delivery permanently failed after ${attempt} attempts`, {
      jobId: job.id,
      webhookId,
    });
  }
}
