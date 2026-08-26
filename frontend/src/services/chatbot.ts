import api from './api';
import type { ApiResponse } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
}

export async function getWelcomeMessage(): Promise<ChatResponse> {
  const response = await api.get<ApiResponse<ChatResponse>>('/chatbot/welcome');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to get welcome message');
}

export async function sendMessage(message: string): Promise<ChatResponse> {
  const response = await api.post<ApiResponse<ChatResponse>>('/chatbot/chat', { message });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to send message');
}

export async function clearHistory(): Promise<void> {
  const response = await api.delete<ApiResponse<void>>('/chatbot/history');
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to clear history');
  }
}
