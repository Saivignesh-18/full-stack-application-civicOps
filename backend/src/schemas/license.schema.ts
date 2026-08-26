import { z } from 'zod';

export const createLicenseSchema = z.object({
  applicantId: z.string().optional(),
  businessName: z.string().min(2, 'Business name is required'),
  businessType: z.string().min(1, 'Business type is required'),
  businessCategory: z.string().min(1, 'Business category is required'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  wardId: z.string().min(1, 'Ward is required'),
  employeeCount: z.number().min(0).optional(),
  annualTurnover: z.number().min(0).optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

export const updateLicenseSchema = z.object({
  businessName: z.string().min(2).optional(),
  businessType: z.string().optional(),
  businessCategory: z.string().optional(),
  address: z.string().min(10).optional(),
  wardId: z.string().optional(),
  employeeCount: z.number().min(0).optional(),
  annualTurnover: z.number().min(0).optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

export const reviewLicenseSchema = z.object({
  action: z.enum(['approve', 'reject']),
  comments: z.string().optional(),
});

export const scheduleInspectionSchema = z.object({
  inspectionDate: z.string().transform((val) => new Date(val)),
  inspectorId: z.string().min(1, 'Inspector is required'),
});

export const completeInspectionSchema = z.object({
  passed: z.boolean(),
  remarks: z.string().min(10, 'Remarks are required'),
});

export const rejectLicenseSchema = z.object({
  reason: z.string().min(10, 'Rejection reason is required'),
});

export const payFeeSchema = z.object({
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'NETBANKING', 'CHEQUE']),
});

export const cancelLicenseSchema = z.object({
  reason: z.string().min(10, 'Cancellation reason is required'),
});

export const licenseQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  wardId: z.string().optional(),
  businessType: z.string().optional(),
  applicantId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateLicenseInput = z.infer<typeof createLicenseSchema>;
export type UpdateLicenseInput = z.infer<typeof updateLicenseSchema>;
export type LicenseQueryInput = z.infer<typeof licenseQuerySchema>;
