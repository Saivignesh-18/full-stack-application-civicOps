import { Router } from 'express';
import { chatbotController } from '../controllers/chatbot.controller.js';
import { chatbotRateLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

// Get welcome message (no auth required)
router.get('/welcome', chatbotController.getWelcome);

// Send message to chatbot (with rate limiting)
router.post('/chat', chatbotRateLimiter, chatbotController.chat);

// Clear conversation history
router.delete('/history', chatbotController.clearHistory);

export default router;
