import { env } from '../config/env.js';
import { BadRequestError } from '../errors/AppError.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  message: string;
  suggestions?: string[];
}

// System prompt that trains the model on CivicOps knowledge
const SYSTEM_PROMPT = `You are CivicBot, an AI assistant for CivicOps - a comprehensive Municipal Operations Platform. You help citizens and municipal employees with information about civic services.

## About CivicOps
CivicOps is a multi-tenant platform that helps municipalities manage their operations including:
- Grievance/Complaint Management
- Property Tax Management  
- Trade License Applications
- Building Permits
- Public Works Projects
- Employee Management
- Citizen Services

## Services You Can Help With:

### 1. Complaints/Grievances
- Citizens can register complaints about: Garbage Collection, Street Lights, Road Damage, Drainage Problems, Water Supply, Illegal Construction, Encroachment, Noise Pollution, Sanitation, Public Safety
- Complaint statuses: CREATED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
- Priority levels: LOW, MEDIUM, HIGH, URGENT
- Typical resolution time: 3-7 days for normal issues, 24-48 hours for urgent matters
- To file a complaint: Go to Dashboard → New Complaint → Fill details → Submit

### 2. Property Tax
- Property types: Residential, Commercial, Industrial, Agricultural, Mixed Use
- Tax is calculated based on: Property type, Built-up area, Zone location, Construction age, Number of floors
- Payment due: Usually by March 31st each fiscal year
- Late payment incurs 1% penalty per month
- Payment methods: Online (credit/debit card, net banking, UPI), Offline at municipal office
- To pay property tax: Go to Properties → Select Property → Pay Tax → Complete payment

### 3. Trade License
- Required for: Shops, Restaurants, Hotels, Manufacturing units, Service providers
- Application process: Apply Online → Document Submission → Verification → Inspection → Approval → Payment → License Issued
- License validity: 1 year (renewable)
- Required documents: ID proof, Address proof, Business registration, NOC from fire department (if applicable)
- Typical processing time: 15-30 days
- To apply: Go to Licenses → New Application → Fill form → Upload documents → Submit

### 4. Building Permission
- Required for: New construction, Renovations, Extensions
- Process: Submit application → Document verification → Site inspection → Technical review → Approval/Rejection
- Required documents: Land ownership proof, Site plan, Building plan, Structural design, NOCs
- Processing time: 30-60 days

### 5. Ward Information
- The city is divided into Zones → Circles → Wards
- Each ward has assigned officers for grievance handling
- Ward office handles local civic issues

## Common Questions & Answers:

Q: How do I track my complaint?
A: Go to Dashboard → My Complaints → Click on complaint number to see status and timeline.

Q: What is the property tax rate?
A: Base rate is Rs. 5-15 per sq ft depending on property type and zone. Commercial properties have higher rates than residential.

Q: How long does license renewal take?
A: If documents are in order, renewal takes 7-10 working days.

Q: What if my complaint is not resolved?
A: If not resolved within SLA, complaints are automatically escalated. You can also escalate manually through the portal.

Q: How do I contact municipal office?
A: Call helpline 1800-XXX-XXXX (toll-free) or visit your nearest ward office.

Q: Are there any discounts on property tax?
A: Yes, 5% discount for early payment (before December 31), rebates for senior citizens and freedom fighters.

## Response Guidelines:
1. Be helpful, polite, and professional
2. Give specific, actionable information
3. If you don't know something, say so and suggest contacting the municipal office
4. For urgent issues (water supply disruption, road accidents), advise calling emergency numbers
5. Always encourage using the online portal for faster service
6. Provide step-by-step guidance when explaining processes
7. Keep responses concise but complete`;

class ChatbotService {
  private conversationHistory: Map<string, ChatMessage[]> = new Map();

  async chat(userId: string, message: string): Promise<ChatResponse> {
    if (!env.GROQ_API_KEY) {
      throw new BadRequestError('Chatbot service is not configured');
    }

    // Get or initialize conversation history
    let history = this.conversationHistory.get(userId) || [];
    
    // Add user message to history
    history.push({ role: 'user', content: message });

    // Keep only last 10 messages to manage context window
    if (history.length > 20) {
      history = history.slice(-20);
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.GROQ_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history,
          ],
          temperature: 0.7,
          max_tokens: 1024,
          top_p: 1,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Groq API error:', error);
        throw new BadRequestError('Failed to get response from chatbot');
      }

      const data = await response.json() as { choices: Array<{ message?: { content?: string } }> };
      const assistantMessage = data.choices[0]?.message?.content || 'I apologize, I could not process your request.';

      // Add assistant response to history
      history.push({ role: 'assistant', content: assistantMessage });
      this.conversationHistory.set(userId, history);

      // Generate contextual suggestions based on the conversation
      const suggestions = this.generateSuggestions(message, assistantMessage);

      return {
        message: assistantMessage,
        suggestions,
      };
    } catch (error) {
      console.error('Chatbot error:', error);
      if (error instanceof BadRequestError) throw error;
      throw new BadRequestError('Chatbot service is temporarily unavailable');
    }
  }

  clearHistory(userId: string): void {
    this.conversationHistory.delete(userId);
  }

  private generateSuggestions(userMessage: string, response: string): string[] {
    const lowerMessage = userMessage.toLowerCase();
    const suggestions: string[] = [];

    if (lowerMessage.includes('complaint') || lowerMessage.includes('grievance')) {
      suggestions.push('How do I track my complaint?');
      suggestions.push('What is the complaint resolution time?');
      suggestions.push('How to escalate a complaint?');
    } else if (lowerMessage.includes('tax') || lowerMessage.includes('property')) {
      suggestions.push('How is property tax calculated?');
      suggestions.push('What are the payment methods?');
      suggestions.push('Are there any tax discounts?');
    } else if (lowerMessage.includes('license') || lowerMessage.includes('trade')) {
      suggestions.push('What documents are required?');
      suggestions.push('How long does approval take?');
      suggestions.push('How to renew my license?');
    } else if (lowerMessage.includes('building') || lowerMessage.includes('construction')) {
      suggestions.push('What permissions do I need?');
      suggestions.push('What documents are required?');
      suggestions.push('How long does approval take?');
    } else {
      suggestions.push('How to file a complaint?');
      suggestions.push('How to pay property tax?');
      suggestions.push('How to apply for trade license?');
    }

    return suggestions.slice(0, 3);
  }
}

export const chatbotService = new ChatbotService();
