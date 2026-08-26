import { Request, Response, NextFunction } from 'express';
import { complaintService } from '../services/complaint.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.js';
import { ForbiddenError, BadRequestError } from '../errors/AppError.js';
import { prisma } from '../config/database.js';

export class ComplaintController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const userId = req.user!.id;

      // Get citizen ID - if user is a citizen, use their citizen record
      let citizenId: string;

      if (req.user!.role === 'CITIZEN') {
        const citizen = await prisma.citizen.findUnique({
          where: { userId },
        });

        if (!citizen) {
          throw new BadRequestError('Citizen profile not found');
        }
        citizenId = citizen.id;
      } else {
        // Officers can create complaints on behalf of citizens
        citizenId = req.body.citizenId;
        if (!citizenId) {
          throw new BadRequestError('citizenId is required');
        }
      }

      const complaint = await complaintService.create(tenantId, citizenId, userId, req.body);
      sendCreated(res, complaint);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const result = await complaintService.findAll(tenantId, req.query as any);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const complaint = await complaintService.findById(tenantId, req.params.id);

      // Citizens can only view their own complaints
      if (req.user!.role === 'CITIZEN') {
        const citizen = await prisma.citizen.findUnique({
          where: { userId: req.user!.id },
        });
        if (!citizen || complaint.citizenId !== citizen.id) {
          throw new ForbiddenError('You can only view your own complaints');
        }
      }

      sendSuccess(res, complaint);
    } catch (error) {
      next(error);
    }
  }

  async findMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const citizen = await prisma.citizen.findUnique({
        where: { userId: req.user!.id },
      });

      if (!citizen) {
        throw new BadRequestError('Citizen profile not found');
      }

      const result = await complaintService.findByCitizen(tenantId, citizen.id, req.query as any);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const complaint = await complaintService.update(
        tenantId,
        req.params.id,
        req.user!.id,
        req.body
      );
      sendSuccess(res, complaint);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const complaint = await complaintService.updateStatus(
        tenantId,
        req.params.id,
        req.user!.id,
        req.body
      );
      sendSuccess(res, complaint);
    } catch (error) {
      next(error);
    }
  }

  async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const complaint = await complaintService.assign(
        tenantId,
        req.params.id,
        req.user!.id,
        req.body
      );
      sendSuccess(res, complaint);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      await complaintService.delete(tenantId, req.params.id);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const events = await complaintService.getTimeline(tenantId, req.params.id);
      sendSuccess(res, events);
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const { wardId, departmentId } = req.query as { wardId?: string; departmentId?: string };
      const stats = await complaintService.getStatistics(tenantId, { wardId, departmentId });
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }

  async escalate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const { reason } = req.body;
      const complaint = await complaintService.escalate(
        tenantId,
        req.params.id,
        req.user!.id,
        reason || 'No reason provided'
      );
      sendSuccess(res, complaint);
    } catch (error) {
      next(error);
    }
  }
}

export const complaintController = new ComplaintController();
