import { prisma } from '../config/database.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../errors/AppError.js';
import { parsePaginationParams, getPaginationOffset, createPaginatedResult } from '../utils/pagination.js';
import type { TradeLicense, LicenseStatus, Prisma } from '@prisma/client';

export interface CreateLicenseInput {
  applicantId?: string;
  businessName: string;
  businessType: string;
  businessCategory: string;
  address: string;
  wardId: string;
  employeeCount?: number;
  annualTurnover?: number;
  contactPhone?: string;
  contactEmail?: string;
}

export interface UpdateLicenseInput {
  businessName?: string;
  businessType?: string;
  businessCategory?: string;
  address?: string;
  wardId?: string;
  employeeCount?: number;
  annualTurnover?: number;
  contactPhone?: string;
  contactEmail?: string;
}

export interface LicenseQueryInput {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  wardId?: string;
  businessType?: string;
  applicantId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Fee structure by business type
const LICENSE_FEES: Record<string, number> = {
  'RETAIL': 2000,
  'WHOLESALE': 5000,
  'MANUFACTURING': 10000,
  'FOOD_BEVERAGE': 3000,
  'SERVICES': 2500,
  'HEALTHCARE': 5000,
  'EDUCATION': 1500,
  'IT_SOFTWARE': 3000,
  'CONSTRUCTION': 7500,
  'default': 2500,
};

// Turnover-based additional fee
const TURNOVER_SLABS = [
  { min: 0, max: 500000, multiplier: 1 },
  { min: 500001, max: 2500000, multiplier: 1.5 },
  { min: 2500001, max: 10000000, multiplier: 2 },
  { min: 10000001, max: Infinity, multiplier: 3 },
];

export class LicenseService {
  async create(tenantId: string, userId: string, userRole: string, input: CreateLicenseInput): Promise<TradeLicense> {
    // Determine applicant
    let applicantId: string;
    if (userRole === 'CITIZEN') {
      const citizen = await prisma.citizen.findUnique({ where: { userId } });
      if (!citizen) throw new BadRequestError('Citizen profile not found');
      applicantId = citizen.id;
    } else {
      if (!input.applicantId) throw new BadRequestError('applicantId is required');
      applicantId = input.applicantId;
    }

    const applicationNumber = await this.generateApplicationNumber(tenantId);

    const license = await prisma.tradeLicense.create({
      data: {
        tenantId,
        applicationNumber,
        applicantId,
        businessName: input.businessName,
        businessType: input.businessType,
        businessCategory: input.businessCategory,
        address: input.address,
        wardId: input.wardId,
        employeeCount: input.employeeCount,
        annualTurnover: input.annualTurnover,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        status: 'DRAFT',
      },
      include: {
        applicant: { select: { id: true, name: true, email: true } },
        ward: { select: { id: true, name: true } },
      },
    });

    return license;
  }

  async findById(tenantId: string, id: string): Promise<TradeLicense> {
    const license = await prisma.tradeLicense.findFirst({
      where: { id, tenantId },
      include: {
        applicant: { select: { id: true, name: true, email: true, phone: true } },
        ward: true,
        workflow: {
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          select: { id: true, fileName: true, mimeType: true, size: true, createdAt: true },
        },
      },
    });

    if (!license) {
      throw new NotFoundError('Trade license not found', 'LICENSE_NOT_FOUND');
    }

    return license;
  }

  async findAll(tenantId: string, query: LicenseQueryInput, userId?: string, userRole?: string) {
    const pagination = parsePaginationParams(query);
    const offset = getPaginationOffset(pagination);

    const where: Prisma.TradeLicenseWhereInput = {
      tenantId,
      ...(query.status && { status: query.status as LicenseStatus }),
      ...(query.wardId && { wardId: query.wardId }),
      ...(query.businessType && { businessType: query.businessType }),
      ...(query.applicantId && { applicantId: query.applicantId }),
      ...(query.search && {
        OR: [
          { applicationNumber: { contains: query.search, mode: 'insensitive' } },
          { businessName: { contains: query.search, mode: 'insensitive' } },
          { licenseNumber: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    // Citizens can only see their own licenses
    if (userRole === 'CITIZEN' && userId) {
      const citizen = await prisma.citizen.findUnique({ where: { userId } });
      if (citizen) where.applicantId = citizen.id;
    }

    const orderBy: Prisma.TradeLicenseOrderByWithRelationInput = {
      [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
    };

    const [licenses, total] = await Promise.all([
      prisma.tradeLicense.findMany({
        where,
        orderBy,
        skip: offset,
        take: pagination.limit,
        include: {
          applicant: { select: { id: true, name: true } },
          ward: { select: { id: true, name: true } },
        },
      }),
      prisma.tradeLicense.count({ where }),
    ]);

    return createPaginatedResult(licenses, total, pagination);
  }

  async update(tenantId: string, id: string, input: UpdateLicenseInput): Promise<TradeLicense> {
    const license = await this.findById(tenantId, id);

    if (!['DRAFT', 'SUBMITTED'].includes(license.status)) {
      throw new BadRequestError('Cannot update license in current status');
    }

    const updated = await prisma.tradeLicense.update({
      where: { id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
      include: {
        applicant: { select: { id: true, name: true } },
        ward: { select: { id: true, name: true } },
      },
    });

    return updated;
  }

  async submit(tenantId: string, id: string, userId: string): Promise<TradeLicense> {
    const license = await this.findById(tenantId, id);

    if (license.status !== 'DRAFT') {
      throw new BadRequestError('Only draft applications can be submitted');
    }

    const updated = await prisma.tradeLicense.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        applicationDate: new Date(),
      },
    });

    await this.createWorkflowStep(id, 'APPLICATION_SUBMITTED', 'COMPLETED', userId, 'Application submitted for review');

    return updated;
  }

  async startDocumentReview(tenantId: string, id: string, userId: string): Promise<TradeLicense> {
    const license = await this.findById(tenantId, id);

    if (license.status !== 'SUBMITTED') {
      throw new BadRequestError('License must be in submitted status');
    }

    const updated = await prisma.tradeLicense.update({
      where: { id },
      data: { status: 'DOCUMENT_REVIEW' },
    });

    await this.createWorkflowStep(id, 'DOCUMENT_REVIEW', 'IN_PROGRESS', userId, 'Document review started');

    return updated;
  }

  async scheduleInspection(
    tenantId: string,
    id: string,
    userId: string,
    inspectionDate: Date,
    inspectorId: string
  ): Promise<TradeLicense> {
    const license = await this.findById(tenantId, id);

    if (!['DOCUMENT_REVIEW', 'SUBMITTED'].includes(license.status)) {
      throw new BadRequestError('Invalid status for scheduling inspection');
    }

    const updated = await prisma.tradeLicense.update({
      where: { id },
      data: {
        status: 'INSPECTION',
        inspectionDate,
      },
    });

    await this.createWorkflowStep(
      id,
      'INSPECTION_SCHEDULED',
      'PENDING',
      userId,
      `Inspection scheduled for ${inspectionDate.toLocaleDateString()}`,
      inspectorId
    );

    return updated;
  }

  async completeInspection(
    tenantId: string,
    id: string,
    userId: string,
    passed: boolean,
    remarks: string
  ): Promise<TradeLicense> {
    const license = await this.findById(tenantId, id);

    if (license.status !== 'INSPECTION') {
      throw new BadRequestError('License must be in inspection status');
    }

    const updated = await prisma.tradeLicense.update({
      where: { id },
      data: {
        status: passed ? 'APPROVED' : 'SUBMITTED',
        inspectionDate: new Date(),
      },
    });

    await this.createWorkflowStep(
      id,
      'INSPECTION',
      passed ? 'COMPLETED' : 'REJECTED',
      userId,
      remarks
    );

    return updated;
  }

  async approve(
    tenantId: string,
    id: string,
    userId: string,
    comments?: string
  ): Promise<TradeLicense> {
    const license = await this.findById(tenantId, id);

    if (!['SUBMITTED', 'DOCUMENT_REVIEW', 'OFFICER_REVIEW', 'INSPECTION'].includes(license.status)) {
      throw new BadRequestError('License cannot be approved in current status');
    }

    // Calculate fee
    const fee = this.calculateFee(license.businessType, license.annualTurnover || 0);
    const licenseNumber = this.generateLicenseNumber();
    const validFrom = new Date();
    const validUntil = new Date(validFrom.getFullYear() + 1, 2, 31); // Valid until March 31 next year

    const updated = await prisma.tradeLicense.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvalDate: new Date(),
        approvedById: userId,
        licenseNumber,
        fee,
        issueDate: validFrom,
        validUntil,
      },
    });

    await this.createWorkflowStep(id, 'APPROVAL', 'APPROVED', userId, comments || 'License approved');

    return updated;
  }

  async reject(
    tenantId: string,
    id: string,
    userId: string,
    reason: string
  ): Promise<TradeLicense> {
    const license = await this.findById(tenantId, id);

    if (['ISSUED', 'CANCELLED', 'REJECTED'].includes(license.status)) {
      throw new BadRequestError('License cannot be rejected in current status');
    }

    const updated = await prisma.tradeLicense.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        rejectedById: userId,
      },
    });

    await this.createWorkflowStep(id, 'REJECTION', 'REJECTED', userId, reason);

    return updated;
  }

  async payFee(
    tenantId: string,
    id: string,
    userId: string,
    paymentMethod: string
  ): Promise<TradeLicense> {
    const license = await this.findById(tenantId, id);

    if (license.status !== 'APPROVED') {
      throw new BadRequestError('License must be approved before payment');
    }

    const updated = await prisma.tradeLicense.update({
      where: { id },
      data: {
        status: 'ISSUED',
        paymentDate: new Date(),
        paymentStatus: 'COMPLETED',
        issueDate: new Date(),
      },
    });

    await this.createWorkflowStep(id, 'PAYMENT', 'COMPLETED', userId, `Payment received via ${paymentMethod}`);
    await this.createWorkflowStep(id, 'ISSUANCE', 'COMPLETED', userId, 'License issued');

    return updated;
  }

  async renew(tenantId: string, id: string, userId: string): Promise<TradeLicense> {
    const license = await this.findById(tenantId, id);

    if (!['ISSUED', 'EXPIRED'].includes(license.status)) {
      throw new BadRequestError('Only issued or expired licenses can be renewed');
    }

    // Create a new license application for renewal
    const applicationNumber = await this.generateApplicationNumber(tenantId);

    const renewalLicense = await prisma.tradeLicense.create({
      data: {
        tenantId,
        applicationNumber,
        applicantId: license.applicantId,
        businessName: license.businessName,
        businessType: license.businessType,
        businessCategory: license.businessCategory,
        address: license.address,
        wardId: license.wardId,
        employeeCount: license.employeeCount,
        annualTurnover: license.annualTurnover,
        contactPhone: license.contactPhone,
        contactEmail: license.contactEmail,
        status: 'SUBMITTED',
        applicationDate: new Date(),
      },
    });

    await this.createWorkflowStep(renewalLicense.id, 'RENEWAL_APPLICATION', 'COMPLETED', userId, `Renewal of license ${license.licenseNumber}`);

    return renewalLicense;
  }

  async cancel(tenantId: string, id: string, userId: string, reason: string): Promise<TradeLicense> {
    const license = await this.findById(tenantId, id);

    if (license.status !== 'ISSUED') {
      throw new BadRequestError('Only issued licenses can be cancelled');
    }

    const updated = await prisma.tradeLicense.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason,
      },
    });

    await this.createWorkflowStep(id, 'CANCELLATION', 'COMPLETED', userId, reason);

    return updated;
  }

  async getStatistics(tenantId: string) {
    const [total, byStatus, byType, revenueThisYear, expiringLicenses] = await Promise.all([
      prisma.tradeLicense.count({ where: { tenantId } }),
      prisma.tradeLicense.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
      prisma.tradeLicense.groupBy({
        by: ['businessType'],
        where: { tenantId },
        _count: { id: true },
      }),
      prisma.tradeLicense.aggregate({
        where: {
          tenantId,
          status: 'ISSUED',
          paymentDate: {
            gte: new Date(new Date().getFullYear(), 0, 1),
          },
        },
        _sum: { fee: true },
      }),
      prisma.tradeLicense.count({
        where: {
          tenantId,
          status: 'ISSUED',
          validUntil: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            gte: new Date(),
          },
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byType: byType.map((item) => ({
        type: item.businessType,
        count: item._count.id,
      })),
      revenue: {
        thisYear: revenueThisYear._sum.fee || 0,
      },
      expiringInNext30Days: expiringLicenses,
    };
  }

  private async generateApplicationNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TL-${year}`;

    const last = await prisma.tradeLicense.findFirst({
      where: { tenantId, applicationNumber: { startsWith: prefix } },
      orderBy: { applicationNumber: 'desc' },
    });

    let sequence = 1;
    if (last) {
      sequence = parseInt(last.applicationNumber.split('-').pop() || '0', 10) + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  private generateLicenseNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `LIC-${year}-${random}`;
  }

  private calculateFee(businessType: string, annualTurnover: number): number {
    const baseFee = LICENSE_FEES[businessType] || LICENSE_FEES.default;

    // Find turnover multiplier
    const slab = TURNOVER_SLABS.find((s) => annualTurnover >= s.min && annualTurnover <= s.max);
    const multiplier = slab?.multiplier || 1;

    return Math.round(baseFee * multiplier);
  }

  private async createWorkflowStep(
    licenseId: string,
    step: string,
    status: string,
    userId: string,
    comments?: string,
    assignedTo?: string
  ) {
    return prisma.licenseWorkflowStep.create({
      data: {
        licenseId,
        step,
        status,
        performedById: userId,
        assignedTo,
        comments,
        completedAt: status === 'COMPLETED' || status === 'APPROVED' || status === 'REJECTED' ? new Date() : null,
      },
    });
  }
}

export const licenseService = new LicenseService();
