import { Request, Response, NextFunction } from 'express';
import { chatbotService } from '../services/chatbot.service.js';
import { sendSuccess } from '../utils/response.js';
import { BadRequestError } from '../errors/AppError.js';

class ChatbotController {
  async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        throw new BadRequestError('Message is required');
      }

      if (message.length > 1000) {
        throw new BadRequestError('Message is too long (max 1000 characters)');
      }

      // Use user ID if authenticated, otherwise use session/IP
      const userId = (req as any).user?.id || req.ip || 'anonymous';

      const response = await chatbotService.chat(userId, message.trim());

      sendSuccess(res, response);
    } catch (error) {
      next(error);
    }
  }

  async clearHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id || req.ip || 'anonymous';
      chatbotService.clearHistory(userId);
      sendSuccess(res, null);
    } catch (error) {
      next(error);
    }
  }

  async getWelcome(req: Request, res: Response, next: NextFunction) {
    try {
      const welcomeMessage = {
        message: `Hello! I'm CivicBot, your AI assistant for municipal services. I can help you with:

• Filing and tracking complaints
• Property tax information and payments
• Trade license applications
• Building permits
• General civic services queries

How can I assist you today?`,
        suggestions: [
          'How do I file a complaint?',
          'What are the property tax rates?',
          'How to apply for trade license?',
        ],
      };

      sendSuccess(res, welcomeMessage);
    } catch (error) {
      next(error);
    }
  }
}

export const chatbotController = new ChatbotController();
