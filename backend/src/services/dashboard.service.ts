import { prisma } from '../config/database.js';
import { getRedisClient, isRedisAvailable } from '../config/redis.js';

export class DashboardService {
  private async getFromCache<T>(key: string): Promise<T | null> {
    if (!isRedisAvailable()) return null;
    try {
      const redis = getRedisClient();
      if (!redis) return null;
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  private async setCache(key: string, value: any, ttl = 300): Promise<void> {
    if (!isRedisAvailable()) return;
    try {
      const redis = getRedisClient();
      if (!redis) return;
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch {
      // Ignore cache errors
    }
  }

  async getOverviewStats(tenantId: string) {
    const cacheKey = `tenant:${tenantId}:dashboard:overview`;
    const cached = await this.getFromCache<any>(cacheKey);
    if (cached) return cached;

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7);

    const [
      totalComplaints,
      pendingComplaints,
      resolvedComplaints,
      complaintsThisMonth,
      complaintsThisWeek,
      totalCitizens,
      totalEmployees,
      totalProperties,
      licensesSubmitted,
      licensesIssued,
      budgetData,
      taxCollected,
    ] = await Promise.all([
      prisma.complaint.count({ where: { tenantId } }),
      prisma.complaint.count({
        where: { tenantId, status: { in: ['CREATED', 'ASSIGNED', 'IN_PROGRESS', 'INSPECTION'] } },
      }),
      prisma.complaint.count({
        where: { tenantId, status: { in: ['RESOLVED', 'CLOSED'] } },
      }),
      prisma.complaint.count({
        where: { tenantId, createdAt: { gte: startOfMonth } },
      }),
      prisma.complaint.count({
        where: { tenantId, createdAt: { gte: startOfWeek } },
      }),
      prisma.citizen.count({ where: { tenantId } }),
      prisma.employee.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.property.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.tradeLicense.count({
        where: { tenantId, status: { in: ['SUBMITTED', 'DOCUMENT_REVIEW', 'INSPECTION', 'APPROVED'] } },
      }),
      prisma.tradeLicense.count({
        where: { tenantId, status: 'ISSUED' },
      }),
      prisma.budget.aggregate({
        where: { tenantId },
        _sum: { allocatedAmount: true, spentAmount: true },
      }),
      prisma.propertyTaxPayment.aggregate({
        where: {
          property: { tenantId },
          status: 'COMPLETED',
          paymentDate: { gte: startOfMonth },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const stats = {
      complaints: {
        total: totalComplaints,
        pending: pendingComplaints,
        resolved: resolvedComplaints,
        thisMonth: complaintsThisMonth,
        thisWeek: complaintsThisWeek,
        resolutionRate: totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0,
      },
      citizens: totalCitizens,
      employees: totalEmployees,
      properties: totalProperties,
      licenses: {
        pending: licensesSubmitted,
        issued: licensesIssued,
      },
      budget: {
        allocated: budgetData._sum.allocatedAmount || 0,
        spent: budgetData._sum.spentAmount || 0,
        utilization: budgetData._sum.allocatedAmount
          ? Math.round(((budgetData._sum.spentAmount || 0) / budgetData._sum.allocatedAmount) * 100)
          : 0,
      },
      taxCollection: {
        thisMonth: taxCollected._sum.totalAmount || 0,
      },
    };

    await this.setCache(cacheKey, stats, 300);
    return stats;
  }

  async getComplaintAnalytics(tenantId: string, months = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const [byStatus, byPriority, byDepartment, byCategory, trend] = await Promise.all([
      // By status
      prisma.complaint.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),

      // By priority
      prisma.complaint.groupBy({
        by: ['priority'],
        where: { tenantId },
        _count: { id: true },
      }),

      // By department
      this.getComplaintsByDepartment(tenantId),

      // By category (top 10)
      prisma.complaint.groupBy({
        by: ['category'],
        where: { tenantId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      // Monthly trend
      this.getComplaintTrend(tenantId, months),
    ]);

    return {
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byDepartment,
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.id })),
      trend,
    };
  }

  private async getComplaintsByDepartment(tenantId: string) {
    const data = await prisma.complaint.groupBy({
      by: ['departmentId'],
      where: { tenantId, departmentId: { not: null } },
      _count: { id: true },
    });

    const departmentIds = data.map((d) => d.departmentId).filter(Boolean) as string[];
    const departments = await prisma.department.findMany({
      where: { id: { in: departmentIds } },
      select: { id: true, name: true },
    });

    const deptMap = new Map(departments.map((d) => [d.id, d.name]));

    return data.map((d) => ({
      department: deptMap.get(d.departmentId!) || 'Unknown',
      departmentId: d.departmentId,
      count: d._count.id,
    }));
  }

  private async getComplaintTrend(tenantId: string, months: number) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const complaints = await prisma.complaint.findMany({
      where: { tenantId, createdAt: { gte: startDate } },
      select: { createdAt: true, status: true },
    });

    const monthlyData: Record<string, { created: number; resolved: number }> = {};

    // Initialize months
    for (let i = 0; i <= months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { created: 0, resolved: 0 };
    }

    complaints.forEach((c) => {
      const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) {
        monthlyData[key].created++;
        if (['RESOLVED', 'CLOSED'].includes(c.status)) {
          monthlyData[key].resolved++;
        }
      }
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .reverse();
  }

  async getRevenueAnalytics(tenantId: string) {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const [propertyTax, licenseFees, monthlyRevenue] = await Promise.all([
      // Property tax collected this year
      prisma.propertyTaxPayment.aggregate({
        where: {
          property: { tenantId },
          status: 'COMPLETED',
          paymentDate: { gte: startOfYear },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),

      // License fees collected this year
      prisma.tradeLicense.aggregate({
        where: {
          tenantId,
          status: 'ISSUED',
          paymentDate: { gte: startOfYear },
        },
        _sum: { fee: true },
        _count: { id: true },
      }),

      // Monthly revenue trend
      this.getMonthlyRevenue(tenantId),
    ]);

    return {
      propertyTax: {
        collected: propertyTax._sum.totalAmount || 0,
        count: propertyTax._count.id,
      },
      licenseFees: {
        collected: licenseFees._sum.fee || 0,
        count: licenseFees._count.id,
      },
      totalRevenue: (propertyTax._sum.totalAmount || 0) + (licenseFees._sum.fee || 0),
      monthlyTrend: monthlyRevenue,
    };
  }

  private async getMonthlyRevenue(tenantId: string) {
    const months = 6;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const [taxPayments, licensePayments] = await Promise.all([
      prisma.propertyTaxPayment.findMany({
        where: {
          property: { tenantId },
          status: 'COMPLETED',
          paymentDate: { gte: startDate },
        },
        select: { paymentDate: true, totalAmount: true },
      }),
      prisma.tradeLicense.findMany({
        where: {
          tenantId,
          status: 'ISSUED',
          paymentDate: { gte: startDate },
        },
        select: { paymentDate: true, fee: true },
      }),
    ]);

    const monthlyData: Record<string, { propertyTax: number; licenseFees: number }> = {};

    for (let i = 0; i <= months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { propertyTax: 0, licenseFees: 0 };
    }

    taxPayments.forEach((p) => {
      if (p.paymentDate) {
        const key = `${p.paymentDate.getFullYear()}-${String(p.paymentDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData[key]) {
          monthlyData[key].propertyTax += p.totalAmount;
        }
      }
    });

    licensePayments.forEach((p) => {
      if (p.paymentDate) {
        const key = `${p.paymentDate.getFullYear()}-${String(p.paymentDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData[key] && p.fee) {
          monthlyData[key].licenseFees += p.fee;
        }
      }
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        ...data,
        total: data.propertyTax + data.licenseFees,
      }))
      .reverse();
  }

  async getBudgetAnalytics(tenantId: string) {
    const budgets = await prisma.budget.findMany({
      where: { tenantId },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    const totalAllocated = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);

    const byDepartment = budgets.map((b) => ({
      department: b.department.name,
      departmentCode: b.department.code,
      allocated: b.allocatedAmount,
      spent: b.spentAmount,
      remaining: b.allocatedAmount - b.spentAmount,
      utilization: b.allocatedAmount > 0 ? Math.round((b.spentAmount / b.allocatedAmount) * 100) : 0,
    }));

    return {
      summary: {
        totalAllocated,
        totalSpent,
        totalRemaining: totalAllocated - totalSpent,
        overallUtilization: totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0,
      },
      byDepartment,
    };
  }

  async getRecentActivity(tenantId: string, limit = 10) {
    const [complaints, licenses, auditLogs] = await Promise.all([
      prisma.complaint.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          complaintNumber: true,
          category: true,
          status: true,
          updatedAt: true,
          citizen: { select: { name: true } },
        },
      }),
      prisma.tradeLicense.findMany({
        where: { tenantId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          applicationNumber: true,
          businessName: true,
          status: true,
          updatedAt: true,
        },
      }),
      prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const activities = [
      ...complaints.map((c) => ({
        type: 'complaint' as const,
        id: c.id,
        title: `${c.complaintNumber}: ${c.category}`,
        description: `Complaint ${c.status.toLowerCase().replace('_', ' ')}`,
        status: c.status,
        timestamp: c.updatedAt,
        actor: c.citizen?.name,
      })),
      ...licenses.map((l) => ({
        type: 'license' as const,
        id: l.id,
        title: l.businessName,
        description: `Application ${l.applicationNumber} ${l.status.toLowerCase().replace('_', ' ')}`,
        status: l.status,
        timestamp: l.updatedAt,
      })),
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return activities;
  }

  async getWardWiseStats(tenantId: string) {
    const [complaints, properties, citizens] = await Promise.all([
      prisma.complaint.groupBy({
        by: ['wardId'],
        where: { tenantId, wardId: { not: null } },
        _count: { id: true },
      }),
      prisma.property.groupBy({
        by: ['wardId'],
        where: { tenantId, wardId: { not: null } },
        _count: { id: true },
        _sum: { annualTax: true },
      }),
      prisma.citizen.groupBy({
        by: ['wardId'],
        where: { tenantId, wardId: { not: null } },
        _count: { id: true },
      }),
    ]);

    // Get ward names
    const wardIds = [
      ...new Set([
        ...complaints.map((c) => c.wardId),
        ...properties.map((p) => p.wardId),
        ...citizens.map((c) => c.wardId),
      ]),
    ].filter(Boolean) as string[];

    const wards = await prisma.ward.findMany({
      where: { id: { in: wardIds } },
      select: { id: true, name: true, code: true },
    });

    const wardMap = new Map(wards.map((w) => [w.id, w]));
    const complaintMap = new Map(complaints.map((c) => [c.wardId, c._count.id]));
    const propertyMap = new Map(properties.map((p) => [p.wardId, { count: p._count.id, tax: p._sum.annualTax || 0 }]));
    const citizenMap = new Map(citizens.map((c) => [c.wardId, c._count.id]));

    return wardIds.map((wardId) => {
      const ward = wardMap.get(wardId);
      const propData = propertyMap.get(wardId) || { count: 0, tax: 0 };
      return {
        wardId,
        wardName: ward?.name || 'Unknown',
        wardCode: ward?.code,
        complaints: complaintMap.get(wardId) || 0,
        properties: propData.count,
        expectedTax: propData.tax,
        citizens: citizenMap.get(wardId) || 0,
      };
    });
  }
}

export const dashboardService = new DashboardService();
