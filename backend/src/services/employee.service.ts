import { prisma } from '../config/database.js';
import { hashPassword } from '../auth/password.js';
import { EmployeeNotFoundError, ConflictError, BadRequestError } from '../errors/AppError.js';
import { parsePaginationParams, getPaginationOffset, createPaginatedResult } from '../utils/pagination.js';
import type { Employee, Prisma, Role } from '@prisma/client';

export interface CreateEmployeeInput {
  email: string;
  password?: string;
  name: string;
  employeeCode: string;
  designation: string;
  phone?: string;
  departmentId: string;
  zoneId?: string;
  circleId?: string;
  wardId?: string;
  joiningDate?: Date;
  role?: Role;
}

export interface UpdateEmployeeInput {
  name?: string;
  designation?: string;
  phone?: string;
  departmentId?: string;
  zoneId?: string;
  circleId?: string;
  wardId?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
}

export interface EmployeeQueryInput {
  page?: string;
  limit?: string;
  search?: string;
  departmentId?: string;
  zoneId?: string;
  circleId?: string;
  wardId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class EmployeeService {
  async create(tenantId: string, createdById: string, input: CreateEmployeeInput): Promise<Employee> {
    // Check for duplicate employee code
    const existing = await prisma.employee.findFirst({
      where: { tenantId, employeeCode: input.employeeCode },
    });

    if (existing) {
      throw new ConflictError('Employee code already exists', 'DUPLICATE_EMPLOYEE_CODE');
    }

    // Check if user with email exists
    let user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      const passwordHash = await hashPassword(input.password || 'TempPass@123');

      user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
          role: input.role || 'EMPLOYEE',
          status: 'ACTIVE',
          emailVerified: false,
          tenantId,
        },
      });
    }

    // Create or update membership
    await prisma.membership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId } },
      update: { role: input.role || 'EMPLOYEE' },
      create: { userId: user.id, tenantId, role: input.role || 'EMPLOYEE', isDefault: true },
    });

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        tenantId,
        userId: user.id,
        employeeCode: input.employeeCode,
        name: input.name,
        email: input.email,
        phone: input.phone,
        designation: input.designation,
        departmentId: input.departmentId,
        zoneId: input.zoneId,
        circleId: input.circleId,
        wardId: input.wardId,
        joiningDate: input.joiningDate || new Date(),
        createdBy: createdById,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        ward: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
      },
    });

    return employee;
  }

  async findById(tenantId: string, id: string): Promise<Employee> {
    const employee = await prisma.employee.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { id: true, email: true, status: true, lastLoginAt: true, role: true } },
        department: true,
        ward: true,
        zone: true,
        circle: true,
      },
    });

    if (!employee) {
      throw new EmployeeNotFoundError(id);
    }

    return employee;
  }

  async findAll(tenantId: string, query: EmployeeQueryInput) {
    const pagination = parsePaginationParams(query);
    const offset = getPaginationOffset(pagination);

    const where: Prisma.EmployeeWhereInput = {
      tenantId,
      ...(query.departmentId && { departmentId: query.departmentId }),
      ...(query.zoneId && { zoneId: query.zoneId }),
      ...(query.circleId && { circleId: query.circleId }),
      ...(query.wardId && { wardId: query.wardId }),
      ...(query.status && { status: query.status as any }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { employeeCode: { contains: query.search, mode: 'insensitive' } },
          { designation: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: Prisma.EmployeeOrderByWithRelationInput = {
      [query.sortBy || 'name']: query.sortOrder || 'asc',
    };

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        orderBy,
        skip: offset,
        take: pagination.limit,
        include: {
          department: { select: { id: true, name: true, code: true } },
          ward: { select: { id: true, name: true, code: true } },
          zone: { select: { id: true, name: true } },
          user: { select: { status: true, lastLoginAt: true } },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return createPaginatedResult(employees, total, pagination);
  }

  async update(tenantId: string, id: string, input: UpdateEmployeeInput): Promise<Employee> {
    await this.findById(tenantId, id);

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        ward: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
      },
    });

    return updated;
  }

  async assignDepartment(tenantId: string, id: string, departmentId: string): Promise<Employee> {
    await this.findById(tenantId, id);

    // Verify department exists in tenant
    const department = await prisma.department.findFirst({
      where: { id: departmentId, tenantId },
    });

    if (!department) {
      throw new BadRequestError('Department not found');
    }

    return prisma.employee.update({
      where: { id },
      data: { departmentId },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async assignArea(
    tenantId: string,
    id: string,
    assignment: { zoneId?: string; circleId?: string; wardId?: string }
  ): Promise<Employee> {
    await this.findById(tenantId, id);

    return prisma.employee.update({
      where: { id },
      data: assignment,
      include: {
        zone: { select: { id: true, name: true } },
        circle: { select: { id: true, name: true } },
        ward: { select: { id: true, name: true } },
      },
    });
  }

  async updateStatus(tenantId: string, id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED'): Promise<Employee> {
    const employee = await this.findById(tenantId, id);

    // Also update user status
    if (employee.userId) {
      const userStatus = status === 'TERMINATED' ? 'INACTIVE' : status;
      await prisma.user.update({
        where: { id: employee.userId },
        data: { status: userStatus as any },
      });
    }

    return prisma.employee.update({
      where: { id },
      data: { status },
    });
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.findById(tenantId, id);
    await prisma.employee.delete({ where: { id } });
  }

  async getByDepartment(tenantId: string, departmentId: string) {
    return prisma.employee.findMany({
      where: { tenantId, departmentId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        designation: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getByWard(tenantId: string, wardId: string) {
    return prisma.employee.findMany({
      where: { tenantId, wardId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        designation: true,
        department: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getStatistics(tenantId: string) {
    const [total, byDepartment, byStatus] = await Promise.all([
      prisma.employee.count({ where: { tenantId } }),
      prisma.employee.groupBy({
        by: ['departmentId'],
        where: { tenantId },
        _count: { id: true },
      }),
      prisma.employee.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
    ]);

    // Get department names
    const departments = await prisma.department.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });

    const deptMap = new Map(departments.map((d) => [d.id, d.name]));

    return {
      total,
      byDepartment: byDepartment.map((item) => ({
        departmentId: item.departmentId,
        departmentName: item.departmentId ? deptMap.get(item.departmentId) || 'Unknown' : 'Unassigned',
        count: item._count.id,
      })),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const employeeService = new EmployeeService();
