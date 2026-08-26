// Queue names
export const QUEUE_NAMES = {
  NOTIFICATION: 'notification',
  EMAIL: 'email',
  WEBHOOK: 'webhook',
  REPORT: 'report',
  DOCUMENT: 'document',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Job types
export interface NotificationJobData {
  userId: string;
  tenantId: string;
  type: 'COMPLAINT_UPDATE' | 'LICENSE_STATUS' | 'PROJECT_UPDATE' | 'PAYMENT_DUE' | 'GENERAL';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export interface WebhookJobData {
  webhookId: string;
  endpointUrl: string;
  event: string;
  payload: Record<string, unknown>;
  secret: string;
  attempt: number;
}

export interface ReportJobData {
  tenantId: string;
  reportType: 'COMPLAINTS' | 'LICENSES' | 'PROJECTS' | 'FINANCE';
  filters: Record<string, unknown>;
  requestedBy: string;
  format: 'PDF' | 'EXCEL' | 'CSV';
}

export interface DocumentJobData {
  documentId: string;
  operation: 'PROCESS' | 'GENERATE_THUMBNAIL' | 'VIRUS_SCAN';
}
