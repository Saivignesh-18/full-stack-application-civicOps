import { Request, Response, NextFunction } from 'express';
import { propertyService } from '../services/property.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.js';
import { prisma } from '../config/database.js';
import { BadRequestError } from '../errors/AppError.js';

export class PropertyController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const property = await propertyService.create(tenantId, req.body);
      sendCreated(res, property);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const result = await propertyService.findAll(tenantId, req.query as any);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const property = await propertyService.findById(tenantId, req.params.id);
      sendSuccess(res, property);
    } catch (error) {
      next(error);
    }
  }

  async findMyProperties(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      
      // Get citizen ID from user
      const citizen = await prisma.citizen.findUnique({
        where: { userId: req.user!.id },
      });

      if (!citizen) {
        throw new BadRequestError('Citizen profile not found');
      }

      const properties = await propertyService.findByOwner(tenantId, citizen.id);
      sendSuccess(res, properties);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const property = await propertyService.update(tenantId, req.params.id, req.body);
      sendSuccess(res, property);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      await propertyService.delete(tenantId, req.params.id);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async calculateTax(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tax = await propertyService.calculateTax(req.body);
      sendSuccess(res, { annualTax: tax });
    } catch (error) {
      next(error);
    }
  }

  async payTax(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const { financialYear, paymentMethod } = req.body;
      
      const payment = await propertyService.payTax(
        tenantId,
        req.params.id,
        financialYear,
        paymentMethod,
        req.user!.id
      );
      
      sendSuccess(res, payment);
    } catch (error) {
      next(error);
    }
  }

  async getTaxDue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const taxDue = await propertyService.getTaxDue(tenantId, req.params.id);
      sendSuccess(res, taxDue);
    } catch (error) {
      next(error);
    }
  }

  async getPaymentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const payments = await propertyService.getPaymentHistory(tenantId, req.params.id);
      sendSuccess(res, payments);
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const stats = await propertyService.getStatistics(tenantId);
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

export const propertyController = new PropertyController();
