import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware } from '../middleware/tenant.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { uploadRateLimiter } from '../middleware/rateLimit.middleware.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.js';
import { prisma } from '../config/database.js';
import { NotFoundError } from '../errors/AppError.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

router.use(authMiddleware);
router.use(tenantMiddleware);

// Upload document
router.post(
  '/',
  uploadRateLimiter,
  requirePermission('document:create'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new Error('No file uploaded');
      }

      const tenantId = req.tenant!.id;
      const {
        complaintId,
        propertyId,
        tradeLicenseId,
        buildingApplicationId,
        projectId,
        contractId,
      } = req.body;

      // TODO: In production, upload to Cloudflare R2 instead of local storage
      const storageKey = req.file.filename;
      const storageUrl = `/uploads/${req.file.filename}`;

      const document = await prisma.document.create({
        data: {
          tenantId,
          fileName: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          storageKey,
          storageUrl,
          uploadedById: req.user!.id,
          complaintId,
          propertyId,
          tradeLicenseId,
          buildingApplicationId,
          projectId,
          contractId,
        },
      });

      sendCreated(res, document);
    } catch (error) {
      next(error);
    }
  }
);

// List documents
router.get('/', requirePermission('document:read'), async (req, res, next) => {
  try {
    const tenantId = req.tenant!.id;

    const where: any = {
      tenantId,
      ...(req.query.complaintId && { complaintId: req.query.complaintId }),
      ...(req.query.propertyId && { propertyId: req.query.propertyId }),
      ...(req.query.tradeLicenseId && { tradeLicenseId: req.query.tradeLicenseId }),
      ...(req.query.projectId && { projectId: req.query.projectId }),
    };

    const documents = await prisma.document.findMany({
      where,
      include: {
        uploadedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, documents);
  } catch (error) {
    next(error);
  }
});

// Get single document
router.get('/:id', requirePermission('document:read'), async (req, res, next) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, tenantId: req.tenant!.id },
      include: {
        uploadedBy: { select: { name: true } },
      },
    });

    if (!document) {
      throw new NotFoundError('Document not found', 'DOCUMENT_NOT_FOUND');
    }

    sendSuccess(res, document);
  } catch (error) {
    next(error);
  }
});

// Delete document
router.delete('/:id', requirePermission('document:delete'), async (req, res, next) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, tenantId: req.tenant!.id },
    });

    if (!document) {
      throw new NotFoundError('Document not found', 'DOCUMENT_NOT_FOUND');
    }

    // TODO: Delete file from storage

    await prisma.document.delete({ where: { id: req.params.id } });
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});

export default router;
