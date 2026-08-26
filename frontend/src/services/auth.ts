import api, { setTokens, clearTokens } from './api';
import type { ApiResponse, AuthTokens, LoginRequest, RegisterRequest, User } from '../types';

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
  
  if (response.data.success && response.data.data) {
    setTokens(response.data.data.tokens);
    return response.data.data;
  }
  
  throw new Error(response.data.error?.message || 'Login failed');
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
  
  if (response.data.success && response.data.data) {
    setTokens(response.data.data.tokens);
    return response.data.data;
  }
  
  throw new Error(response.data.error?.message || 'Registration failed');
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    clearTokens();
  }
}

export async function logoutAll(): Promise<void> {
  try {
    await api.post('/auth/logout-all');
  } finally {
    clearTokens();
  }
}

export async function getCurrentUser(): Promise<User> {
  const response = await api.get<ApiResponse<User>>('/auth/me');
  
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  
  throw new Error(response.data.error?.message || 'Failed to get current user');
}

export async function refreshTokens(): Promise<AuthTokens> {
  const refreshToken = localStorage.getItem('civicops_refresh_token');
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const response = await api.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken });
  
  if (response.data.success && response.data.data) {
    setTokens(response.data.data);
    return response.data.data;
  }
  
  throw new Error(response.data.error?.message || 'Token refresh failed');
}

export async function forgotPassword(email: string): Promise<void> {
  const response = await api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email });
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to send reset email');
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const response = await api.post<ApiResponse<{ message: string }>>('/auth/reset-password', { token, password });
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to reset password');
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const response = await api.post<ApiResponse<{ message: string }>>('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to change password');
  }
}

export async function verifyEmail(token: string): Promise<void> {
  const response = await api.post<ApiResponse<{ message: string }>>('/auth/verify-email', { token });
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to verify email');
  }
}

export async function resendVerification(): Promise<void> {
  const response = await api.post<ApiResponse<{ message: string }>>('/auth/resend-verification');
  
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to resend verification email');
  }
}
