import { User, Tenant, Role } from '@prisma/client';
import { Logger } from 'winston';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      logger: Logger;
      user?: {
        id: string;
        email: string;
        role: Role;
        tenantId?: string;
      };
      tenant?: {
        id: string;
        name: string;
        code: string;
      };
      sessionId?: string;
    }
  }
}

export {};
