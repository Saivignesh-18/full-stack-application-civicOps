import { prisma } from '../config/database.js';
import { hashPassword } from '../auth/password.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../errors/AppError.js';
import { parsePaginationParams, getPaginationOffset, createPaginatedResult } from '../utils/pagination.js';
import type { Citizen, Prisma } from '@prisma/client';

export interface CreateCitizenInput {
  email: string;
  password?: string;
  name: string;
  phone?: string;
  address?: string;
  wardId?: string;
  aadharNumber?: string;
  dateOfBirth?: Date;
}

export interface UpdateCitizenInput {
  name?: string;
  phone?: string;
  address?: string;
  wardId?: string;
  aadharNumber?: string;
  dateOfBirth?: Date;
}

export interface CitizenQueryInput {
  page?: string;
  limit?: string;
  search?: string;
  wardId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class CitizenService {
  async create(tenantId: string, input: CreateCitizenInput): Promise<Citizen> {
    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      const passwordHash = await hashPassword(input.password || 'Citizen@123');

      user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
          phone: input.phone,
          role: 'CITIZEN',
          status: 'ACTIVE',
          emailVerified: false,
          tenantId,
        },
      });
    }

    // Check if citizen profile exists
    const existingCitizen = await prisma.citizen.findUnique({
      where: { userId: user.id },
    });

    if (existingCitizen) {
      throw new ConflictError('Citizen profile already exists');
    }

    // Create membership
    await prisma.membership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId } },
      update: {},
      create: { userId: user.id, tenantId, role: 'CITIZEN', isDefault: true },
    });

    // Create citizen profile
    const citizen = await prisma.citizen.create({
      data: {
        tenantId,
        userId: user.id,
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        wardId: input.wardId,
        aadharNumber: input.aadharNumber,
      },
      include: {
        ward: { select: { id: true, name: true, code: true } },
      },
    });

    return citizen;
  }

  async findById(tenantId: string, id: string): Promise<Citizen> {
    const citizen = await prisma.citizen.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { id: true, email: true, status: true, lastLoginAt: true } },
        ward: true,
        _count: {
          select: { complaints: true, properties: true, tradeLicenses: true },
        },
      },
    });

    if (!citizen) {
      throw new NotFoundError('Citizen not found', 'CITIZEN_NOT_FOUND');
    }

    return citizen;
  }

  async findByUserId(tenantId: string, userId: string): Promise<Citizen> {
    const citizen = await prisma.citizen.findFirst({
      where: { userId, tenantId },
      include: {
        ward: { select: { id: true, name: true, code: true } },
        _count: {
          select: { complaints: true, properties: true, tradeLicenses: true },
        },
      },
    });

    if (!citizen) {
      throw new NotFoundError('Citizen profile not found', 'CITIZEN_NOT_FOUND');
    }

    return citizen;
  }

  async findAll(tenantId: string, query: CitizenQueryInput) {
    const pagination = parsePaginationParams(query);
    const offset = getPaginationOffset(pagination);

    const where: Prisma.CitizenWhereInput = {
      tenantId,
      ...(query.wardId && { wardId: query.wardId }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: Prisma.CitizenOrderByWithRelationInput = {
      [query.sortBy || 'name']: query.sortOrder || 'asc',
    };

    const [citizens, total] = await Promise.all([
      prisma.citizen.findMany({
        where,
        orderBy,
        skip: offset,
        take: pagination.limit,
        include: {
          ward: { select: { id: true, name: true, code: true } },
          _count: {
            select: { complaints: true, properties: true },
          },
        },
      }),
      prisma.citizen.count({ where }),
    ]);

    return createPaginatedResult(citizens, total, pagination);
  }

  async update(tenantId: string, id: string, input: UpdateCitizenInput): Promise<Citizen> {
    await this.findById(tenantId, id);

    const updated = await prisma.citizen.update({
      where: { id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
      include: {
        ward: { select: { id: true, name: true, code: true } },
      },
    });

    return updated;
  }

  async updateProfile(tenantId: string, userId: string, input: UpdateCitizenInput): Promise<Citizen> {
    const citizen = await this.findByUserId(tenantId, userId);

    const updated = await prisma.citizen.update({
      where: { id: citizen.id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
      include: {
        ward: { select: { id: true, name: true, code: true } },
      },
    });

    // Also update user name/phone if changed
    if (input.name || input.phone) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.phone && { phone: input.phone }),
        },
      });
    }

    return updated;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.findById(tenantId, id);
    await prisma.citizen.delete({ where: { id } });
  }

  async getProfile(tenantId: string, userId: string) {
    const citizen = await prisma.citizen.findFirst({
      where: { userId, tenantId },
      include: {
        ward: { select: { id: true, name: true, code: true } },
        complaints: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            complaintNumber: true,
            category: true,
            status: true,
            createdAt: true,
          },
        },
        properties: {
          take: 5,
          select: {
            id: true,
            propertyNumber: true,
            address: true,
            propertyType: true,
          },
        },
        tradeLicenses: {
          take: 5,
          select: {
            id: true,
            licenseNumber: true,
            businessName: true,
            status: true,
          },
        },
        _count: {
          select: { complaints: true, properties: true, tradeLicenses: true },
        },
      },
    });

    if (!citizen) {
      throw new NotFoundError('Citizen profile not found', 'CITIZEN_NOT_FOUND');
    }

    return citizen;
  }

  async getStatistics(tenantId: string) {
    const [total, byWard, recentRegistrations] = await Promise.all([
      prisma.citizen.count({ where: { tenantId } }),
      prisma.citizen.groupBy({
        by: ['wardId'],
        where: { tenantId },
        _count: { id: true },
      }),
      prisma.citizen.count({
        where: {
          tenantId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Get ward names
    const wards = await prisma.ward.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });
    const wardMap = new Map(wards.map((w) => [w.id, w.name]));

    return {
      total,
      recentRegistrations,
      byWard: byWard.map((item) => ({
        wardId: item.wardId,
        wardName: item.wardId ? wardMap.get(item.wardId) || 'Unknown' : 'Unassigned',
        count: item._count.id,
      })),
    };
  }
}

export const citizenService = new CitizenService();
