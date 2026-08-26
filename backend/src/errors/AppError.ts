export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 Bad Request
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST', details?: Record<string, unknown>) {
    super(message, 400, code, true, details);
  }
}

// 401 Unauthorized
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

// 403 Forbidden
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

// 404 Not Found
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

// 409 Conflict
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', code = 'CONFLICT') {
    super(message, 409, code);
  }
}

// 422 Validation Error
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super(message, 422, 'VALIDATION_ERROR', true, details);
  }
}

// 429 Too Many Requests
export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'TOO_MANY_REQUESTS', true, retryAfter ? { retryAfter } : undefined);
  }
}

// 500 Internal Server Error
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR', false);
  }
}

// Domain-specific errors
export class UserNotFoundError extends NotFoundError {
  constructor(userId?: string) {
    super(userId ? `User with ID ${userId} not found` : 'User not found', 'USER_NOT_FOUND');
  }
}

export class TenantNotFoundError extends NotFoundError {
  constructor(tenantId?: string) {
    super(tenantId ? `Tenant with ID ${tenantId} not found` : 'Tenant not found', 'TENANT_NOT_FOUND');
  }
}

export class EmployeeNotFoundError extends NotFoundError {
  constructor(employeeId?: string) {
    super(employeeId ? `Employee with ID ${employeeId} not found` : 'Employee not found', 'EMPLOYEE_NOT_FOUND');
  }
}

export class ComplaintNotFoundError extends NotFoundError {
  constructor(complaintId?: string) {
    super(complaintId ? `Complaint with ID ${complaintId} not found` : 'Complaint not found', 'COMPLAINT_NOT_FOUND');
  }
}

export class DuplicateEmailError extends ConflictError {
  constructor(email?: string) {
    super(email ? `Email ${email} is already registered` : 'Email is already registered', 'DUPLICATE_EMAIL');
  }
}

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS');
  }
}

export class InvalidTokenError extends UnauthorizedError {
  constructor(message = 'Invalid or expired token') {
    super(message, 'INVALID_TOKEN');
  }
}

export class TokenExpiredError extends UnauthorizedError {
  constructor() {
    super('Token has expired', 'TOKEN_EXPIRED');
  }
}

export class InsufficientPermissionsError extends ForbiddenError {
  constructor(permission?: string) {
    super(
      permission ? `Missing required permission: ${permission}` : 'Insufficient permissions',
      'INSUFFICIENT_PERMISSIONS'
    );
  }
}

export class TenantAccessDeniedError extends ForbiddenError {
  constructor() {
    super('Access to this tenant is denied', 'TENANT_ACCESS_DENIED');
  }
}
