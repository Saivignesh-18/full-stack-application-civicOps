import { Request, Response, NextFunction } from 'express';
import { citizenService } from '../services/citizen.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.js';

export class CitizenController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const citizen = await citizenService.create(tenantId, req.body);
      sendCreated(res, citizen);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const result = await citizenService.findAll(tenantId, req.query as any);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const citizen = await citizenService.findById(tenantId, req.params.id);
      sendSuccess(res, citizen);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const citizen = await citizenService.update(tenantId, req.params.id, req.body);
      sendSuccess(res, citizen);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      await citizenService.delete(tenantId, req.params.id);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  // Profile management for logged-in citizen
  async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const profile = await citizenService.getProfile(tenantId, req.user!.id);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async updateMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const citizen = await citizenService.updateProfile(tenantId, req.user!.id, req.body);
      sendSuccess(res, citizen);
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const stats = await citizenService.getStatistics(tenantId);
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

export const citizenController = new CitizenController();
