import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  forgotPasswordLimiter,
} from '../middleware/rateLimit.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
} from '../schemas/auth.schema.js';

const router = Router();

// Public routes (with auth rate limiting)
router.post(
  '/register',
  registerLimiter,
  validateBody(registerSchema),
  authController.register.bind(authController)
);

router.post(
  '/login',
  loginLimiter,
  validateBody(loginSchema),
  authController.login.bind(authController)
);

router.post(
  '/refresh',
  refreshLimiter,
  validateBody(refreshTokenSchema),
  authController.refresh.bind(authController)
);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword.bind(authController)
);

router.post(
  '/reset-password',
  forgotPasswordLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword.bind(authController)
);

router.post(
  '/verify-email',
  validateBody(verifyEmailSchema),
  authController.verifyEmail.bind(authController)
);

// Protected routes
router.post('/logout', authMiddleware, authController.logout.bind(authController));

router.post('/logout-all', authMiddleware, authController.logoutAll.bind(authController));

router.get('/me', authMiddleware, authController.me.bind(authController));

router.get('/sessions', authMiddleware, authController.sessions.bind(authController));

router.post(
  '/change-password',
  authMiddleware,
  validateBody(changePasswordSchema),
  authController.changePassword.bind(authController)
);

router.post(
  '/resend-verification',
  authMiddleware,
  authController.resendVerification.bind(authController)
);

export default router;
