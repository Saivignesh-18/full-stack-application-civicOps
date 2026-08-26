import { prisma } from '../config/database.js';
import { NotFoundError, ConflictError, BadRequestError } from '../errors/AppError.js';
import { parsePaginationParams, getPaginationOffset, createPaginatedResult } from '../utils/pagination.js';
import type { Property, PropertyType, Prisma } from '@prisma/client';

export interface CreatePropertyInput {
  propertyNumber: string;
  ownerId: string;
  ownerName: string;
  address: string;
  wardId: string;
  zoneId?: string;
  circleId?: string;
  propertyType: PropertyType;
  builtUpArea: number;
  landArea: number;
  floors?: number;
  constructionYear?: number;
  latitude?: number;
  longitude?: number;
}

export interface UpdatePropertyInput {
  ownerName?: string;
  address?: string;
  wardId?: string;
  zoneId?: string;
  circleId?: string;
  propertyType?: PropertyType;
  builtUpArea?: number;
  landArea?: number;
  floors?: number;
  constructionYear?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'DISPUTED';
}

export interface PropertyQueryInput {
  page?: string;
  limit?: string;
  search?: string;
  wardId?: string;
  zoneId?: string;
  propertyType?: string;
  status?: string;
  ownerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TaxCalculationInput {
  propertyType: PropertyType;
  builtUpArea: number;
  landArea: number;
  floors: number;
  constructionYear?: number;
  wardId: string;
}

// Tax rates per sq ft by property type
const TAX_RATES: Record<PropertyType, number> = {
  RESIDENTIAL: 2.5,
  COMMERCIAL: 5.0,
  INDUSTRIAL: 4.0,
  AGRICULTURAL: 0.5,
  MIXED_USE: 3.5,
};

// Zone multipliers (premium areas pay more)
const ZONE_MULTIPLIERS: Record<string, number> = {
  'ZONE-1': 1.2, // Premium
  'ZONE-2': 1.0, // Standard
  default: 1.0,
};

export class PropertyService {
  async create(tenantId: string, input: CreatePropertyInput): Promise<Property> {
    // Check for duplicate property number
    const existing = await prisma.property.findFirst({
      where: { tenantId, propertyNumber: input.propertyNumber },
    });

    if (existing) {
      throw new ConflictError('Property number already exists', 'DUPLICATE_PROPERTY_NUMBER');
    }

    // Calculate annual tax
    const annualTax = await this.calculateTax({
      propertyType: input.propertyType,
      builtUpArea: input.builtUpArea,
      landArea: input.landArea,
      floors: input.floors || 1,
      constructionYear: input.constructionYear,
      wardId: input.wardId,
    });

    const property = await prisma.property.create({
      data: {
        tenantId,
        propertyId: input.propertyNumber,
        ownerId: input.ownerId,
        ownerName: input.ownerName,
        address: input.address,
        wardId: input.wardId,
        zoneId: input.zoneId,
        circleId: input.circleId,
        propertyType: input.propertyType,
        builtUpArea: input.builtUpArea,
        landArea: input.landArea,
        floors: input.floors || 1,
        constructionYear: input.constructionYear,
        annualTax,
        status: 'ACTIVE',
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        ward: { select: { id: true, name: true, code: true } },
      },
    });

    return property;
  }

  async findById(tenantId: string, id: string): Promise<Property> {
    const property = await prisma.property.findFirst({
      where: { id, tenantId },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        ward: true,
        zone: true,
        circle: true,
        taxPayments: {
          orderBy: { financialYear: 'desc' },
          take: 10,
        },
      },
    });

    if (!property) {
      throw new NotFoundError('Property not found', 'PROPERTY_NOT_FOUND');
    }

    return property;
  }

  async findAll(tenantId: string, query: PropertyQueryInput) {
    const pagination = parsePaginationParams(query);
    const offset = getPaginationOffset(pagination);

    const where: Prisma.PropertyWhereInput = {
      tenantId,
      ...(query.wardId && { wardId: query.wardId }),
      ...(query.zoneId && { zoneId: query.zoneId }),
      ...(query.propertyType && { propertyType: query.propertyType as PropertyType }),
      ...(query.status && { status: query.status as any }),
      ...(query.ownerId && { ownerId: query.ownerId }),
      ...(query.search && {
        OR: [
          { propertyNumber: { contains: query.search, mode: 'insensitive' } },
          { address: { contains: query.search, mode: 'insensitive' } },
          { ownerName: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: Prisma.PropertyOrderByWithRelationInput = {
      [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
    };

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy,
        skip: offset,
        take: pagination.limit,
        include: {
          owner: { select: { id: true, name: true } },
          ward: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.property.count({ where }),
    ]);

    return createPaginatedResult(properties, total, pagination);
  }

  async findByOwner(tenantId: string, ownerId: string) {
    return prisma.property.findMany({
      where: { tenantId, ownerId },
      include: {
        ward: { select: { name: true, code: true } },
        taxPayments: {
          where: { financialYear: this.getCurrentFinancialYear() },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(tenantId: string, id: string, input: UpdatePropertyInput): Promise<Property> {
    const property = await this.findById(tenantId, id);

    // Recalculate tax if area or type changed
    let annualTax = property.annualTax;
    if (input.builtUpArea || input.landArea || input.propertyType) {
      annualTax = await this.calculateTax({
        propertyType: input.propertyType || property.propertyType,
        builtUpArea: input.builtUpArea || property.builtUpArea,
        landArea: input.landArea || property.landArea,
        floors: property.floors || 1,
        wardId: input.wardId || property.wardId!,
      });
    }

    const updated = await prisma.property.update({
      where: { id },
      data: {
        ...input,
        annualTax,
        updatedAt: new Date(),
      },
      include: {
        owner: { select: { id: true, name: true } },
        ward: { select: { id: true, name: true } },
      },
    });

    return updated;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.findById(tenantId, id);
    await prisma.property.delete({ where: { id } });
  }

  async calculateTax(input: TaxCalculationInput): Promise<number> {
    const baseRate = TAX_RATES[input.propertyType] || TAX_RATES.RESIDENTIAL;

    // Get zone code for multiplier
    let zoneMultiplier = ZONE_MULTIPLIERS.default;
    if (input.wardId) {
      const ward = await prisma.ward.findUnique({
        where: { id: input.wardId },
        include: { zone: true },
      });
      if (ward?.zone) {
        zoneMultiplier = ZONE_MULTIPLIERS[ward.zone.code] || ZONE_MULTIPLIERS.default;
      }
    }

    // Age depreciation (older buildings pay less)
    let ageMultiplier = 1.0;
    if (input.constructionYear) {
      const age = new Date().getFullYear() - input.constructionYear;
      if (age > 50) ageMultiplier = 0.7;
      else if (age > 30) ageMultiplier = 0.8;
      else if (age > 15) ageMultiplier = 0.9;
    }

    // Floor multiplier (each additional floor adds 10%)
    const floorMultiplier = 1 + (Math.max(0, input.floors - 1) * 0.1);

    // Calculate total
    const builtUpTax = input.builtUpArea * baseRate * zoneMultiplier * ageMultiplier * floorMultiplier;
    const landTax = input.landArea * 0.5 * zoneMultiplier; // Land taxed at flat rate

    return Math.round((builtUpTax + landTax) * 100) / 100;
  }

  async payTax(
    tenantId: string,
    propertyId: string,
    financialYear: string,
    paymentMethod: string,
    paidById: string
  ) {
    const property = await this.findById(tenantId, propertyId);

    // Check if already paid
    const existingPayment = await prisma.propertyTaxPayment.findUnique({
      where: {
        propertyId_financialYear: { propertyId, financialYear },
      },
    });

    if (existingPayment?.status === 'COMPLETED') {
      throw new ConflictError('Tax already paid for this financial year');
    }

    // Calculate penalty if past due date (June 30th)
    const dueDate = this.getDueDate(financialYear);
    const penalty = new Date() > dueDate ? Math.round(property.annualTax * 0.1) : 0;
    const totalAmount = property.annualTax + penalty;

    // Create or update payment
    const payment = await prisma.propertyTaxPayment.upsert({
      where: {
        propertyId_financialYear: { propertyId, financialYear },
      },
      update: {
        status: 'COMPLETED',
        paymentDate: new Date(),
        paymentMethod,
        paidById,
        receiptNumber: this.generateReceiptNumber(),
      },
      create: {
        propertyId,
        financialYear,
        amount: property.annualTax,
        penalty,
        totalAmount,
        status: 'COMPLETED',
        paymentDate: new Date(),
        paymentMethod,
        paidById,
        receiptNumber: this.generateReceiptNumber(),
      },
    });

    return payment;
  }

  async getTaxDue(tenantId: string, propertyId: string) {
    const property = await this.findById(tenantId, propertyId);
    const financialYear = this.getCurrentFinancialYear();

    const existingPayment = await prisma.propertyTaxPayment.findUnique({
      where: {
        propertyId_financialYear: { propertyId, financialYear },
      },
    });

    if (existingPayment?.status === 'COMPLETED') {
      return {
        status: 'PAID',
        financialYear,
        amount: existingPayment.amount,
        paidOn: existingPayment.paymentDate,
        receiptNumber: existingPayment.receiptNumber,
      };
    }

    const dueDate = this.getDueDate(financialYear);
    const penalty = new Date() > dueDate ? Math.round(property.annualTax * 0.1) : 0;

    return {
      status: 'PENDING',
      financialYear,
      amount: property.annualTax,
      penalty,
      totalDue: property.annualTax + penalty,
      dueDate,
      isOverdue: new Date() > dueDate,
    };
  }

  async getPaymentHistory(tenantId: string, propertyId: string) {
    await this.findById(tenantId, propertyId);

    return prisma.propertyTaxPayment.findMany({
      where: { propertyId },
      orderBy: { financialYear: 'desc' },
    });
  }

  async getStatistics(tenantId: string) {
    const currentFY = this.getCurrentFinancialYear();

    const [
      totalProperties,
      byType,
      byStatus,
      totalTaxCollected,
      pendingTax,
    ] = await Promise.all([
      prisma.property.count({ where: { tenantId } }),
      prisma.property.groupBy({
        by: ['propertyType'],
        where: { tenantId },
        _count: { id: true },
        _sum: { annualTax: true },
      }),
      prisma.property.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
      prisma.propertyTaxPayment.aggregate({
        where: {
          property: { tenantId },
          financialYear: currentFY,
          status: 'COMPLETED',
        },
        _sum: { totalAmount: true },
      }),
      prisma.property.aggregate({
        where: {
          tenantId,
          taxPayments: {
            none: {
              financialYear: currentFY,
              status: 'COMPLETED',
            },
          },
        },
        _sum: { annualTax: true },
        _count: { id: true },
      }),
    ]);

    return {
      totalProperties,
      byType: byType.map((item) => ({
        type: item.propertyType,
        count: item._count.id,
        totalTax: item._sum.annualTax || 0,
      })),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      taxCollection: {
        financialYear: currentFY,
        collected: totalTaxCollected._sum.totalAmount || 0,
        pending: pendingTax._sum.annualTax || 0,
        pendingCount: pendingTax._count.id,
      },
    };
  }

  private getCurrentFinancialYear(): string {
    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }

  private getDueDate(financialYear: string): Date {
    const year = parseInt(financialYear.split('-')[0]!);
    return new Date(year, 5, 30); // June 30th
  }

  private generateReceiptNumber(): string {
    return `PTX-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }
}

export const propertyService = new PropertyService();
