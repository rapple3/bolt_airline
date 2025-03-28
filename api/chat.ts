import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

// Initialize OpenAI client with API key from environment variable
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
  // More detailed API key logging
  const apiKeyStatus = !process.env.OPENAI_API_KEY 
    ? 'Not set' 
    : process.env.OPENAI_API_KEY.startsWith('sk-') 
      ? 'Valid format' 
      : 'Invalid format';
  
  console.log('OpenAI API key status:', apiKeyStatus);
  
  // Check if OpenAI API key is missing or invalid
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ 
      error: 'OpenAI API key is not configured', 
      details: 'The OPENAI_API_KEY environment variable is not set'
    });
  }
  
  if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    return res.status(500).json({ 
      error: 'OpenAI API key has invalid format', 
      details: 'The OPENAI_API_KEY environment variable does not have the expected format'
    });
  }
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    // Log OpenAI API key for debugging (first few characters)
    if (process.env.OPENAI_API_KEY) {
      const apiKeyPrefix = process.env.OPENAI_API_KEY.substring(0, 7);
      const apiKeyLength = process.env.OPENAI_API_KEY.length;
      console.log(`Using OpenAI API key with prefix ${apiKeyPrefix}... (${apiKeyLength} characters)`);
    }
    
    const { messages, contextData } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Add system message if not present
    if (!messages.some(m => m.role === 'system')) {
      messages.unshift({
        role: 'system',
        content: 'You are an AI assistant for an airline. Help users with their flight-related queries.'
      });
    }

    // Add context data to the last user message
    if (contextData && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        lastMessage.content = `Additional context:\n${JSON.stringify(contextData, null, 2)}\n\nUser's message: ${lastMessage.content}`;
      }
    }

    // Log that we're sending the request to OpenAI
    console.log('Sending request to OpenAI API with message count:', messages.length);
    
    const completion = await openai.chat.completions.create({
      messages,
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
    });

    console.log('Received response from OpenAI');
    
    if (!completion.choices[0].message.content) {
      throw new Error('No response from OpenAI');
    }

    return res.status(200).json({
      content: completion.choices[0].message.content,
      role: 'assistant'
    });

  } catch (error: any) {
    console.error('Error processing request:', error);
    
    // Ensure we have a clean error message
    let errorMessage = error.message || 'Unknown error occurred';
    let errorType = error.name || 'Error';
    
    // Check for specific OpenAI error types
    if (error.name === 'AuthenticationError') {
      errorType = 'AuthenticationError';
      errorMessage = 'OpenAI API key is invalid or not configured correctly';
    } else if (error.name === 'RateLimitError') {
      errorType = 'RateLimitError';
      errorMessage = 'OpenAI rate limit exceeded';
    }
    
    // Return a consistent error format
    return res.status(500).json({ 
      error: errorType,
      message: errorMessage
    });
  }
} 