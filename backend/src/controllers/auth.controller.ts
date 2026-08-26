import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.js';
import type { 
  RegisterInput, 
  LoginInput, 
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  VerifyEmailInput,
} from '../schemas/auth.schema.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: RegisterInput = req.body;
      const deviceInfo = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      };

      const result = await authService.register(input, deviceInfo);
      sendCreated(res, result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: LoginInput = req.body;
      const deviceInfo = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      };

      const result = await authService.login(input, deviceInfo);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken }: RefreshTokenInput = req.body;
      const tokens = await authService.refresh(refreshToken);
      sendSuccess(res, tokens);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.sessionId) {
        await authService.logout(req.sessionId);
      }
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await authService.logoutAll(req.user.id);
      }
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getCurrentUser(req.user!.id);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  async sessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await authService.getSessions(req.user!.id);
      
      // Remove sensitive data
      const safeSessions = sessions.map(({ refreshToken, ...session }) => ({
        ...session,
        isCurrent: session.id === req.sessionId,
      }));

      sendSuccess(res, safeSessions);
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email }: ForgotPasswordInput = req.body;
      await authService.forgotPassword(email);
      // Always return success to prevent email enumeration
      sendSuccess(res, { message: 'If an account exists with this email, a password reset link will be sent.' });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password }: ResetPasswordInput = req.body;
      await authService.resetPassword(token, password);
      sendSuccess(res, { message: 'Password has been reset successfully. Please login with your new password.' });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: ChangePasswordInput = req.body;
      await authService.changePassword(req.user!.id, input);
      sendSuccess(res, { message: 'Password changed successfully.' });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token }: VerifyEmailInput = req.body;
      await authService.verifyEmail(token);
      sendSuccess(res, { message: 'Email verified successfully.' });
    } catch (error) {
      next(error);
    }
  }

  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.resendVerificationEmail(req.user!.id);
      sendSuccess(res, { message: 'Verification email sent.' });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
