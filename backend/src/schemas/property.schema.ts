import { z } from 'zod';

export const createPropertySchema = z.object({
  propertyNumber: z.string().min(1, 'Property number is required'),
  ownerId: z.string().min(1, 'Owner ID is required'),
  ownerName: z.string().min(2, 'Owner name is required'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  wardId: z.string().min(1, 'Ward is required'),
  zoneId: z.string().optional(),
  circleId: z.string().optional(),
  propertyType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'AGRICULTURAL', 'MIXED_USE']),
  builtUpArea: z.number().positive('Built-up area must be positive'),
  landArea: z.number().positive('Land area must be positive'),
  floors: z.number().min(1).optional(),
  constructionYear: z.number().min(1900).max(new Date().getFullYear()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const updatePropertySchema = z.object({
  ownerName: z.string().min(2).optional(),
  address: z.string().min(10).optional(),
  wardId: z.string().optional(),
  zoneId: z.string().optional(),
  circleId: z.string().optional(),
  propertyType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'AGRICULTURAL', 'MIXED_USE']).optional(),
  builtUpArea: z.number().positive().optional(),
  landArea: z.number().positive().optional(),
  floors: z.number().min(1).optional(),
  constructionYear: z.number().min(1900).max(new Date().getFullYear()).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISPUTED']).optional(),
});

export const payTaxSchema = z.object({
  financialYear: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid financial year format (YYYY-YY)'),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'NETBANKING', 'CHEQUE']),
});

export const calculateTaxSchema = z.object({
  propertyType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'AGRICULTURAL', 'MIXED_USE']),
  builtUpArea: z.number().positive(),
  landArea: z.number().positive(),
  floors: z.number().min(1).default(1),
  constructionYear: z.number().optional(),
  wardId: z.string(),
});

export const propertyQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  wardId: z.string().optional(),
  zoneId: z.string().optional(),
  propertyType: z.string().optional(),
  status: z.string().optional(),
  ownerId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PayTaxInput = z.infer<typeof payTaxSchema>;
export type PropertyQueryInput = z.infer<typeof propertyQuerySchema>;
