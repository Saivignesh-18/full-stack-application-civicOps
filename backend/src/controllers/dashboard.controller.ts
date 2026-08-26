import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service.js';
import { sendSuccess } from '../utils/response.js';

export class DashboardController {
  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const stats = await dashboardService.getOverviewStats(tenantId);
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }

  async getComplaintAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const months = parseInt(req.query.months as string) || 6;
      const analytics = await dashboardService.getComplaintAnalytics(tenantId, months);
      sendSuccess(res, analytics);
    } catch (error) {
      next(error);
    }
  }

  async getRevenueAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const analytics = await dashboardService.getRevenueAnalytics(tenantId);
      sendSuccess(res, analytics);
    } catch (error) {
      next(error);
    }
  }

  async getBudgetAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const analytics = await dashboardService.getBudgetAnalytics(tenantId);
      sendSuccess(res, analytics);
    } catch (error) {
      next(error);
    }
  }

  async getRecentActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await dashboardService.getRecentActivity(tenantId, limit);
      sendSuccess(res, activities);
    } catch (error) {
      next(error);
    }
  }

  async getWardWiseStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const stats = await dashboardService.getWardWiseStats(tenantId);
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
