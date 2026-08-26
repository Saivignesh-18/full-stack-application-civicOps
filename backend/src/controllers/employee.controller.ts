import { Request, Response, NextFunction } from 'express';
import { employeeService } from '../services/employee.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.js';

export class EmployeeController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const employee = await employeeService.create(tenantId, req.user!.id, req.body);
      sendCreated(res, employee);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const result = await employeeService.findAll(tenantId, req.query as any);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const employee = await employeeService.findById(tenantId, req.params.id);
      sendSuccess(res, employee);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const employee = await employeeService.update(tenantId, req.params.id, req.body);
      sendSuccess(res, employee);
    } catch (error) {
      next(error);
    }
  }

  async assignDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const employee = await employeeService.assignDepartment(
        tenantId,
        req.params.id,
        req.body.departmentId
      );
      sendSuccess(res, employee);
    } catch (error) {
      next(error);
    }
  }

  async assignArea(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const employee = await employeeService.assignArea(tenantId, req.params.id, req.body);
      sendSuccess(res, employee);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const employee = await employeeService.updateStatus(
        tenantId,
        req.params.id,
        req.body.status
      );
      sendSuccess(res, employee);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      await employeeService.delete(tenantId, req.params.id);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async getByDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const employees = await employeeService.getByDepartment(tenantId, req.params.departmentId);
      sendSuccess(res, employees);
    } catch (error) {
      next(error);
    }
  }

  async getByWard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const employees = await employeeService.getByWard(tenantId, req.params.wardId);
      sendSuccess(res, employees);
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.tenant!.id;
      const stats = await employeeService.getStatistics(tenantId);
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

export const employeeController = new EmployeeController();
