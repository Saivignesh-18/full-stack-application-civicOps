import { Job } from 'bullmq';
import nodemailer from 'nodemailer';
import type { EmailJobData } from '../queues/index.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Create reusable transporter (lazy initialization)
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } else {
      // Use ethereal for development/testing
      logger.warn('SMTP not configured, using console transport');
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }
  return transporter;
}

export async function processEmail(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, template, data } = job.data;

  logger.info(`Processing email job`, {
    jobId: job.id,
    to,
    subject,
    template,
  });

  try {
    // TODO: Load template and render with data
    const html = renderTemplate(template, data);

    const transport = getTransporter();
    const info = await transport.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
    });

    logger.info(`Email sent successfully`, {
      jobId: job.id,
      messageId: info.messageId,
      to,
    });
  } catch (error) {
    logger.error(`Failed to send email`, {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

function renderTemplate(template: string, data: Record<string, unknown>): string {
  // Simple template rendering - replace placeholders
  let html = getTemplateContent(template);
  
  for (const [key, value] of Object.entries(data)) {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  
  return html;
}

function getTemplateContent(template: string): string {
  // TODO: Load templates from files
  const templates: Record<string, string> = {
    'complaint-created': `
      <h1>Complaint Registered</h1>
      <p>Your complaint #{{complaintNumber}} has been registered successfully.</p>
      <p><strong>Category:</strong> {{category}}</p>
      <p><strong>Status:</strong> {{status}}</p>
      <p>You can track your complaint at: {{trackingUrl}}</p>
    `,
    'complaint-updated': `
      <h1>Complaint Status Updated</h1>
      <p>Your complaint #{{complaintNumber}} has been updated.</p>
      <p><strong>New Status:</strong> {{status}}</p>
      <p>{{message}}</p>
    `,
    'license-approved': `
      <h1>License Approved</h1>
      <p>Your trade license application #{{applicationNumber}} has been approved.</p>
      <p>Please complete the payment to receive your license.</p>
    `,
    'password-reset': `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="{{resetUrl}}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
    `,
  };

  return templates[template] || `<p>Template "${template}" not found</p>`;
}
