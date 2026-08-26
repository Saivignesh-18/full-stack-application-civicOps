import { Request, Response, NextFunction } from 'express';
import { licenseService } from '../services/license.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.js';

export class LicenseController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const license = await licenseService.create(tenantId, req.user!.id, req.user!.role, req.body);
      sendCreated(res, license);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const result = await licenseService.findAll(
        tenantId,
        req.query as any,
        req.user!.id,
        req.user!.role
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const license = await licenseService.findById(tenantId, req.params.id);
      sendSuccess(res, license);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const license = await licenseService.update(tenantId, req.params.id, req.body);
      sendSuccess(res, license);
    } catch (error) {
      next(error);
    }
  }

  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const license = await licenseService.submit(tenantId, req.params.id, req.user!.id);
      sendSuccess(res, license);
    } catch (error) {
      next(error);
    }
  }

  async startDocumentReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const license = await licenseService.startDocumentReview(tenantId, req.params.id, req.user!.id);
      sendSuccess(res, license);
    } catch (error) {
      next(error);
    }
  }

  async scheduleInspection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const { inspectionDate, inspectorId } = req.body;
      const license = await licenseService.scheduleInspection(
        tenantId,
        req.params.id,
        req.user!.id,
        inspectionDate,
        inspectorId
      );
      sendSuccess(res, license);
    } catch (error) {
      next(error);
    }
  }

  async completeInspection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const { passed, remarks } = req.body;
      const license = await licenseService.completeInspection(
        tenantId,
        req.params.id,
        req.user!.id,
        passed,
        remarks
      );
      sendSuccess(res, license);
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const license = await licenseService.approve(
        tenantId,
        req.params.id,
        req.user!.id,
        req.body.comments
      );
      sendSuccess(res, license);
    } catch (error) {
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const license = await licenseService.reject(
        tenantId,
        req.params.id,
        req.user!.id,
        req.body.reason
      );
      sendSuccess(res, license);
    } catch (error) {
      next(error);
    }
  }

  async payFee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const license = await licenseService.payFee(
        tenantId,
        req.params.id,
        req.user!.id,
        req.body.paymentMethod
      );
      sendSuccess(res, license);
    } catch (error) {
      next(error);
    }
  }

  async renew(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const license = await licenseService.renew(tenantId, req.params.id, req.user!.id);
      sendCreated(res, license);
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const license = await licenseService.cancel(
        tenantId,
        req.params.id,
        req.user!.id,
        req.body.reason
      );
      sendSuccess(res, license);
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const stats = await licenseService.getStatistics(tenantId);
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

export const licenseController = new LicenseController();
