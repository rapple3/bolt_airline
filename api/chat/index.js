// API handler for chat endpoint with OpenAI integration
import { OpenAI } from 'openai';

// Initialize OpenAI with API key from environment
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt that includes instructions for action format
const SYSTEM_PROMPT = `You are an AI assistant for an airline. Help users with their flight-related queries.
You can perform the following actions to help users:

1. Search for flights: [ACTION:SEARCH_FLIGHTS]from="New York" to="London" date="2023-12-25"[/ACTION]
2. Book a flight: [ACTION:BOOK_FLIGHT]flightNumber="FL123" seatClass="economy"[/ACTION]
3. Cancel a booking: [ACTION:CANCEL_BOOKING]bookingReference="BK12345"[/ACTION]
4. Change flight: [ACTION:CHANGE_FLIGHT]bookingReference="BK12345" newFlightNumber="FL456"[/ACTION]
5. Change seat: [ACTION:CHANGE_SEAT]bookingReference="BK12345" newSeatNumber="12A"[/ACTION]
6. Check-in: [ACTION:CHECK_IN]bookingReference="BK12345"[/ACTION]
7. Track baggage: [ACTION:TRACK_BAGGAGE]bookingReference="BK12345"[/ACTION]

IMPORTANT BOOKING WORKFLOW:
1. First show available flight options via SEARCH_FLIGHTS
2. Ask the user to select a flight by number
3. When they select a flight, summarize its details and ask for confirmation
4. Only use BOOK_FLIGHT after the user confirms

When a user asks to book a flight, FIRST use SEARCH_FLIGHTS to show them options.
Only use BOOK_FLIGHT after they've selected a specific flight.
Place the action directive at the beginning of your message, followed by your regular response.

EXAMPLE FORMATTING - THIS IS IMPORTANT:
For a flight search, your response should look exactly like this:
[ACTION:SEARCH_FLIGHTS]from="New York" to="London" date="2023-12-25"[/ACTION]
I've found several flights from New York to London. Please review the options above.

The action directive MUST be at the very beginning, with NO spaces or characters before it.
`;

export default async function handler(req, res) {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // For GET requests, return a simple success response
  if (req.method === 'GET') {
    return res.status(200).json({
      content: "Hello from /api/chat! I'm your AI travel assistant. How can I help you today?",
      role: 'assistant'
    });
  }

  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key is missing');
    return res.status(500).json({
      content: "I'm sorry, the AI service is not properly configured. Please try again later.",
      role: 'assistant'
    });
  }
  
  try {
    // Extract data from request
    const { message, history, contextData } = req.body || {};
    
    if (!message) {
      return res.status(400).json({
        content: "I'm sorry, I didn't receive a message to respond to.",
        role: 'assistant'
      });
    }
    
    console.log(`API received message: "${message.substring(0, 50)}..."`);
    console.log('Context:', JSON.stringify({
      hasHistory: !!history && Array.isArray(history),
      historyLength: history?.length || 0,
      hasContext: !!contextData
    }, null, 2));
    
    // Prepare messages array with system prompt
    let messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      }
    ];
    
    // Add history if available
    if (history && Array.isArray(history)) {
      messages = [...messages, ...history];
    }
    
    // Always add the current message
    messages.push({
      role: 'user',
      content: message
    });
    
    // Add context to last user message if available
    if (contextData) {
      const lastMessage = messages[messages.length - 1];
      lastMessage.content = `Context: ${JSON.stringify(contextData)}\n\nUser message: ${lastMessage.content}`;
    }
    
    console.log(`Sending to OpenAI with ${messages.length} messages`);
    console.log('Last message:', messages[messages.length - 1].content.substring(0, 100));
    
    // Call OpenAI API
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
    });
    
    // Extract response
    const aiResponse = completion.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
    
    console.log(`Received from OpenAI: "${aiResponse.substring(0, 100)}..."`);
    
    // Check if the response contains an action directive at the start
    const actionDirectiveCheck = aiResponse.match(/^\s*\[ACTION:([A-Z_]+)\](.*?)\[\/ACTION\]/s);
    
    // Return response
    return res.status(200).json({
      content: aiResponse,
      role: 'assistant',
      hasActionDirective: !!actionDirectiveCheck
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    // Return a friendly error message
    return res.status(500).json({
      content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
      role: 'assistant'
    });
  }
} 