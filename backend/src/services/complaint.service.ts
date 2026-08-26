import { prisma } from '../config/database.js';
import { ComplaintNotFoundError, ForbiddenError, BadRequestError } from '../errors/AppError.js';
import { parsePaginationParams, getPaginationOffset, createPaginatedResult } from '../utils/pagination.js';
import type { Complaint, ComplaintStatus, Prisma } from '@prisma/client';
import type {
  CreateComplaintInput,
  UpdateComplaintInput,
  UpdateComplaintStatusInput,
  AssignComplaintInput,
  ComplaintQueryInput,
} from '../schemas/complaint.schema.js';

export class ComplaintService {
  async create(
    tenantId: string,
    citizenId: string,
    userId: string,
    input: CreateComplaintInput
  ): Promise<Complaint> {
    // Generate complaint number
    const complaintNumber = await this.generateComplaintNumber(tenantId);

    // Auto-detect department based on category
    const departmentId = await this.getDepartmentByCategory(tenantId, input.category);

    const complaint = await prisma.complaint.create({
      data: {
        tenantId,
        complaintNumber,
        citizenId,
        createdById: userId,
        category: input.category,
        subCategory: input.subCategory,
        description: input.description,
        address: input.address,
        landmark: input.landmark,
        latitude: input.latitude,
        longitude: input.longitude,
        wardId: input.wardId,
        departmentId,
        priority: input.priority,
        status: 'CREATED',
      },
      include: {
        citizen: { select: { name: true, email: true, phone: true } },
        ward: { select: { name: true, code: true } },
        department: { select: { name: true, code: true } },
      },
    });

    // Create initial event
    await this.createEvent(complaint.id, userId, 'CREATED', 'Complaint registered');

    return complaint;
  }

  async findById(tenantId: string, id: string): Promise<Complaint> {
    const complaint = await prisma.complaint.findFirst({
      where: { id, tenantId },
      include: {
        citizen: { select: { id: true, name: true, email: true, phone: true } },
        ward: { select: { id: true, name: true, code: true } },
        zone: { select: { id: true, name: true, code: true } },
        circle: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            performedBy: { select: { id: true, name: true } },
          },
        },
        documents: {
          select: { id: true, fileName: true, mimeType: true, size: true, createdAt: true },
        },
      },
    });

    if (!complaint) {
      throw new ComplaintNotFoundError(id);
    }

    return complaint;
  }

  async findAll(tenantId: string, query: ComplaintQueryInput) {
    const pagination = parsePaginationParams(query);
    const offset = getPaginationOffset(pagination);

    const where: Prisma.ComplaintWhereInput = {
      tenantId,
      ...(query.status && { status: query.status as ComplaintStatus }),
      ...(query.priority && { priority: query.priority as any }),
      ...(query.category && { category: query.category }),
      ...(query.wardId && { wardId: query.wardId }),
      ...(query.departmentId && { departmentId: query.departmentId }),
      ...(query.assignedToId && { assignedToId: query.assignedToId }),
      ...((query as any).citizenId && { citizenId: (query as any).citizenId }),
      ...(query.search && {
        OR: [
          { complaintNumber: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { address: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: Prisma.ComplaintOrderByWithRelationInput = {
      [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
    };

    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        orderBy,
        skip: offset,
        take: pagination.limit,
        include: {
          citizen: { select: { name: true } },
          ward: { select: { name: true, code: true } },
          department: { select: { name: true } },
          assignedTo: { select: { name: true } },
        },
      }),
      prisma.complaint.count({ where }),
    ]);

    return createPaginatedResult(complaints, total, pagination);
  }

  async findByCitizen(tenantId: string, citizenId: string, query: ComplaintQueryInput) {
    return this.findAll(tenantId, { ...query, citizenId } as any);
  }

  async update(
    tenantId: string,
    id: string,
    userId: string,
    input: UpdateComplaintInput
  ): Promise<Complaint> {
    const complaint = await this.findById(tenantId, id);

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });

    await this.createEvent(id, userId, 'UPDATED', 'Complaint details updated');

    return updated;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    userId: string,
    input: UpdateComplaintStatusInput
  ): Promise<Complaint> {
    const complaint = await this.findById(tenantId, id);
    const previousStatus = complaint.status;

    // Validate status transition
    this.validateStatusTransition(previousStatus, input.status);

    const updateData: Prisma.ComplaintUpdateInput = {
      status: input.status,
      updatedAt: new Date(),
    };

    if (input.status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    if (input.status === 'CLOSED') {
      updateData.closedAt = new Date();
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: updateData,
    });

    await this.createEvent(
      id,
      userId,
      'STATUS_CHANGE',
      input.comment || `Status changed from ${previousStatus} to ${input.status}`,
      previousStatus,
      input.status
    );

    return updated;
  }

  async assign(
    tenantId: string,
    id: string,
    userId: string,
    input: AssignComplaintInput
  ): Promise<Complaint> {
    const complaint = await this.findById(tenantId, id);

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        assignedToId: input.assignedToId,
        departmentId: input.departmentId || complaint.departmentId,
        status: complaint.status === 'CREATED' ? 'ASSIGNED' : complaint.status,
        updatedAt: new Date(),
      },
      include: {
        assignedTo: { select: { name: true, email: true } },
      },
    });

    const assignee = updated.assignedTo;
    await this.createEvent(
      id,
      userId,
      'ASSIGNED',
      input.comment || `Complaint assigned to ${assignee?.name || 'officer'}`
    );

    return updated;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const complaint = await this.findById(tenantId, id);

    await prisma.complaint.delete({ where: { id } });
  }

  async getTimeline(tenantId: string, id: string) {
    await this.findById(tenantId, id); // Verify exists

    return prisma.complaintEvent.findMany({
      where: { complaintId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        performedBy: { select: { id: true, name: true } },
      },
    });
  }

  private async createEvent(
    complaintId: string,
    performedById: string,
    action: string,
    description: string,
    previousStatus?: ComplaintStatus,
    newStatus?: ComplaintStatus
  ) {
    return prisma.complaintEvent.create({
      data: {
        complaintId,
        performedById,
        action,
        description,
        previousStatus,
        newStatus,
      },
    });
  }

  private async generateComplaintNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `GRV-${year}`;

    const lastComplaint = await prisma.complaint.findFirst({
      where: {
        tenantId,
        complaintNumber: { startsWith: prefix },
      },
      orderBy: { complaintNumber: 'desc' },
    });

    let sequence = 1;
    if (lastComplaint) {
      const lastSequence = parseInt(lastComplaint.complaintNumber.split('-').pop() || '0', 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  private async getDepartmentByCategory(tenantId: string, category: string): Promise<string | undefined> {
    const categoryDepartmentMap: Record<string, string> = {
      'Garbage Collection': 'SANITATION',
      'Street Light': 'ELECTRICAL',
      'Road Damage': 'ROADS',
      'Drainage Problem': 'WATER',
      'Water Supply': 'WATER',
    };

    const deptCode = categoryDepartmentMap[category];
    if (!deptCode) return undefined;

    const department = await prisma.department.findFirst({
      where: { tenantId, code: deptCode },
    });

    return department?.id;
  }

  private validateStatusTransition(from: ComplaintStatus, to: ComplaintStatus): void {
    const validTransitions: Record<ComplaintStatus, ComplaintStatus[]> = {
      CREATED: ['ASSIGNED', 'REJECTED'],
      ASSIGNED: ['IN_PROGRESS', 'REJECTED'],
      IN_PROGRESS: ['INSPECTION', 'RESOLVED', 'ON_HOLD' as any],
      INSPECTION: ['IN_PROGRESS', 'RESOLVED'],
      RESOLVED: ['CITIZEN_VERIFICATION', 'CLOSED', 'REOPENED'],
      CITIZEN_VERIFICATION: ['CLOSED', 'REOPENED'],
      CLOSED: ['REOPENED'],
      REOPENED: ['ASSIGNED', 'IN_PROGRESS'],
      REJECTED: [],
    };

    if (!validTransitions[from]?.includes(to)) {
      throw new BadRequestError(
        `Invalid status transition from ${from} to ${to}`,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

  async getStatistics(tenantId: string, filters?: { wardId?: string; departmentId?: string }) {
    const where: Prisma.ComplaintWhereInput = {
      tenantId,
      ...(filters?.wardId && { wardId: filters.wardId }),
      ...(filters?.departmentId && { departmentId: filters.departmentId }),
    };

    const [total, byStatus, byPriority, byCategoryRaw, avgResolutionTime] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      prisma.complaint.groupBy({
        by: ['priority'],
        where,
        _count: { id: true },
      }),
      prisma.complaint.groupBy({
        by: ['category'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.complaint.aggregate({
        where: {
          ...where,
          resolvedAt: { not: null },
        },
        _avg: {
          // Calculate from resolved complaints
        },
      }),
    ]);

    // Calculate resolution metrics
    const resolvedComplaints = await prisma.complaint.findMany({
      where: {
        ...where,
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    });

    let avgResolutionHours = 0;
    if (resolvedComplaints.length > 0) {
      const totalHours = resolvedComplaints.reduce((sum, c) => {
        const diff = (c.resolvedAt!.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60);
        return sum + diff;
      }, 0);
      avgResolutionHours = Math.round(totalHours / resolvedComplaints.length);
    }

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byCategory: byCategoryRaw.map((item) => ({
        category: item.category,
        count: item._count.id,
      })),
      metrics: {
        avgResolutionHours,
        resolvedCount: resolvedComplaints.length,
        pendingCount: total - resolvedComplaints.length,
      },
    };
  }

  async escalate(tenantId: string, id: string, userId: string, reason: string): Promise<Complaint> {
    const complaint = await this.findById(tenantId, id);

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        priority: 'URGENT',
        escalatedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await this.createEvent(id, userId, 'ESCALATED', `Complaint escalated: ${reason}`);

    return updated;
  }
}

export const complaintService = new ComplaintService();
