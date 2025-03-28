import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { ActionResult } from '../src/utils/actionHandler';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;
const requestCounts = new Map<string, { count: number; timestamp: number }>();

// Rate limiting middleware
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userRequests = requestCounts.get(ip) || { count: 0, timestamp: now };

  if (now - userRequests.timestamp > RATE_LIMIT_WINDOW) {
    // Reset if window has passed
    userRequests.count = 1;
    userRequests.timestamp = now;
  } else if (userRequests.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  } else {
    userRequests.count++;
  }

  requestCounts.set(ip, userRequests);
  return true;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get client IP for rate limiting
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  
  // Check rate limit
  if (!checkRateLimit(clientIp.toString())) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const { messages, contextData } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Add system message if not present
    if (!messages.some(m => m.role === 'system')) {
      messages.unshift({
        role: 'system',
        content: `You are an AI assistant for an airline. Help users with their flight-related queries.
You can perform the following actions to help users:

1. Search for flights: [ACTION:SEARCH_FLIGHTS]from="New York" to="London" date="2023-12-25"[/ACTION]
2. Book a flight: [ACTION:BOOK_FLIGHT]flightNumber="FL123" seatClass="economy"[/ACTION]
3. Cancel a booking: [ACTION:CANCEL_BOOKING]bookingReference="BK12345"[/ACTION]
4. Change flight: [ACTION:CHANGE_FLIGHT]bookingReference="BK12345" newFlightNumber="FL456"[/ACTION]
5. Change seat: [ACTION:CHANGE_SEAT]bookingReference="BK12345" newSeatNumber="12A"[/ACTION]
6. Check-in: [ACTION:CHECK_IN]bookingReference="BK12345"[/ACTION]
7. Track baggage: [ACTION:TRACK_BAGGAGE]bookingReference="BK12345"[/ACTION]

Use these actions when users request these specific services.
Only include the action directive when you're performing an action.`
      });
    }

    // Add context data to the last user message
    if (contextData && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        lastMessage.content = `Additional context:\n${JSON.stringify(contextData, null, 2)}\n\nUser's message: ${lastMessage.content}`;
      }
    }

    const completion = await openai.chat.completions.create({
      messages,
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
    });

    if (!completion.choices[0].message.content) {
      throw new Error('No response from OpenAI');
    }

    return res.status(200).json({
      content: completion.choices[0].message.content,
      role: 'assistant'
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 