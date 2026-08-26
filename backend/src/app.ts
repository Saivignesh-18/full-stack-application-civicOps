import express, { type Express } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import {
  corsMiddleware,
  requestIdMiddleware,
  loggingMiddleware,
  getLimiter,
  writeLimiter,
  deleteLimiter,
  errorHandler,
  notFoundHandler,
} from './middleware/index.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import tenantRoutes from './routes/tenant.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import citizenRoutes from './routes/citizen.routes.js';
import complaintRoutes from './routes/complaint.routes.js';
import propertyRoutes from './routes/property.routes.js';
import licenseRoutes from './routes/license.routes.js';
import buildingRoutes from './routes/building.routes.js';
import projectRoutes from './routes/project.routes.js';
import documentRoutes from './routes/document.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import chatbotRoutes from './routes/chatbot.routes.js';

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS
  app.use(corsMiddleware);

  // Compression
  app.use(compression());

  // Request ID
  app.use(requestIdMiddleware);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Cookie parsing
  app.use(cookieParser());

  // Logging
  app.use(loggingMiddleware);

  // Method-based general rate limiting (applied to all API routes).
  // Each is method-aware (skips other methods), so chaining them is safe.
  app.use('/api', getLimiter, writeLimiter, deleteLimiter);

  // Health check (before auth)
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  });

  // API routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/tenants', tenantRoutes);
  app.use('/api/v1/employees', employeeRoutes);
  app.use('/api/v1/citizens', citizenRoutes);
  app.use('/api/v1/complaints', complaintRoutes);
  app.use('/api/v1/properties', propertyRoutes);
  app.use('/api/v1/licenses', licenseRoutes);
  app.use('/api/v1/building-permits', buildingRoutes);
  app.use('/api/v1/projects', projectRoutes);
  app.use('/api/v1/documents', documentRoutes);
  app.use('/api/v1/webhooks', webhookRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/chatbot', chatbotRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
