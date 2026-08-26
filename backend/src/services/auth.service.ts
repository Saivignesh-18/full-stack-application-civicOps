import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, parseExpiration } from '../auth/jwt.js';
import { env } from '../config/env.js';
import {
  InvalidCredentialsError,
  DuplicateEmailError,
  InvalidTokenError,
  UserNotFoundError,
  BadRequestError,
  AppError,
} from '../errors/AppError.js';
import type { User, Session } from '@prisma/client';
import type { RegisterInput, LoginInput, ChangePasswordInput } from '../schemas/auth.schema.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  tokens: AuthTokens;
}

export class AuthService {
  async register(input: RegisterInput, deviceInfo?: { userAgent?: string; ipAddress?: string }): Promise<AuthResult> {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new DuplicateEmailError(input.email);
    }

    // Determine which tenant (municipality) the citizen belongs to.
    // Use the provided tenantId if valid, otherwise default to the earliest active tenant.
    let tenant = null;
    if (input.tenantId) {
      tenant = await prisma.tenant.findFirst({
        where: { id: input.tenantId, status: 'ACTIVE' },
      });
    }
    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      });
    }
    if (!tenant) {
      throw new BadRequestError('No municipality is available for registration');
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user, citizen profile, and tenant membership in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
          phone: input.phone,
          role: 'CITIZEN',
          status: 'ACTIVE',
          emailVerified: false,
          verificationToken,
          verificationExpiry,
          tenantId: tenant!.id,
        },
      });

      // Citizen profile so the user can file complaints, own properties, etc.
      await tx.citizen.create({
        data: {
          tenantId: tenant!.id,
          userId: created.id,
          name: created.name,
          email: created.email,
          phone: created.phone,
        },
      });

      // Membership so tenant access checks pass
      await tx.membership.create({
        data: {
          userId: created.id,
          tenantId: tenant!.id,
          role: 'CITIZEN',
          isDefault: true,
        },
      });

      return created;
    });

    // TODO: Send verification email
    console.log(`[DEV] Email verification token for ${user.email}: ${verificationToken}`);

    // Create session and generate tokens
    const tokens = await this.createSession(user, deviceInfo);

    const { passwordHash: _, verificationToken: __, ...userWithoutSensitive } = user;
    return { user: userWithoutSensitive as Omit<User, 'passwordHash'>, tokens };
  }

  async login(input: LoginInput, deviceInfo?: { userAgent?: string; ipAddress?: string }): Promise<AuthResult> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new InvalidCredentialsError();
    }

    // Verify password
    const isValidPassword = await verifyPassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new InvalidCredentialsError();
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new AppError('Your account is inactive. Please contact support.', 403, 'ACCOUNT_INACTIVE');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session and generate tokens
    const tokens = await this.createSession(user, deviceInfo);

    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Find session
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (!session || !session.isValid) {
      throw new InvalidTokenError('Session has been revoked');
    }

    if (session.refreshToken !== refreshToken) {
      // Token reuse detected - invalidate all sessions for security
      await prisma.session.updateMany({
        where: { userId: session.userId },
        data: { isValid: false },
      });
      throw new InvalidTokenError('Token reuse detected');
    }

    if (session.expiresAt < new Date()) {
      throw new InvalidTokenError('Session has expired');
    }

    // Generate new tokens
    const newRefreshToken = generateRefreshToken({
      sub: session.userId,
      userId: session.userId,
      sessionId: session.id,
    });

    const accessToken = generateAccessToken({
      sub: session.userId,
      userId: session.userId,
      email: session.user.email,
      role: session.user.role,
      tenantId: session.user.tenantId ?? undefined,
      sessionId: session.id,
    });

    // Update session with new refresh token
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        updatedAt: new Date(),
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { isValid: false },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { userId },
      data: { isValid: false },
    });
  }

  async getCurrentUser(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            tenant: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getSessions(userId: string): Promise<Session[]> {
    return prisma.session.findMany({
      where: {
        userId,
        isValid: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists
    if (!user) {
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry: resetExpiry,
      },
    });

    // TODO: Send password reset email
    console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new InvalidTokenError('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Invalidate all sessions for security
    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { isValid: false },
    });
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    // Verify current password
    const isValidPassword = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
    }

    const passwordHash = await hashPassword(input.newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new InvalidTokenError('Invalid or expired verification token');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationExpiry: null,
      },
    });
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    if (user.emailVerified) {
      throw new AppError('Email is already verified', 400, 'ALREADY_VERIFIED');
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationExpiry,
      },
    });

    // TODO: Send verification email
    console.log(`[DEV] Email verification token for ${user.email}: ${verificationToken}`);
  }

  private async createSession(
    user: User,
    deviceInfo?: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthTokens> {
    const sessionId = uuidv4();
    const refreshTokenExpiry = parseExpiration(env.JWT_REFRESH_EXPIRES);
    const expiresAt = new Date(Date.now() + refreshTokenExpiry);

    const refreshToken = generateRefreshToken({
      sub: user.id,
      userId: user.id,
      sessionId,
    });

    const accessToken = generateAccessToken({
      sub: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId ?? undefined,
      sessionId,
    });

    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken,
        userAgent: deviceInfo?.userAgent,
        ipAddress: deviceInfo?.ipAddress,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
