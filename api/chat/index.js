// API handler for chat endpoint with OpenAI integration
import { OpenAI } from 'openai';

// Initialize OpenAI with API key from environment
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for airline assistant
const SYSTEM_PROMPT = `You are an AI assistant for an airline. Help users with their flight-related queries.
You can perform the following actions to help users:

1. Search for flights: [ACTION:SEARCH_FLIGHTS]from="New York" to="London" date="2023-12-25"[/ACTION]
2. Book a flight: [ACTION:BOOK_FLIGHT]flightNumber="FL123" seatClass="economy"[/ACTION]
3. Cancel a booking: [ACTION:CANCEL_BOOKING]bookingReference="BK12345"[/ACTION]
4. Change flight: [ACTION:CHANGE_FLIGHT]bookingReference="BK12345" newFlightNumber="FL456"[/ACTION]
5. Change seat: [ACTION:CHANGE_SEAT]bookingReference="BK12345" newSeatNumber="12A"[/ACTION]
6. Check-in: [ACTION:CHECK_IN]bookingReference="BK12345"[/ACTION]
7. Track baggage: [ACTION:TRACK_BAGGAGE]bookingReference="BK12345"[/ACTION]

When a user asks to book a flight, FIRST use SEARCH_FLIGHTS to show them options.
Only use BOOK_FLIGHT after they've selected a specific flight.
Place the action directive at the beginning of your message, followed by your regular response.`;

export default async function handler(req, res) {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Log received request
  console.log('API request received:', req.method);
  
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
    const { message, history, contextData } = req.body;
    
    if (!message) {
      return res.status(400).json({
        content: "I'm sorry, I didn't receive a message to respond to.",
        role: 'assistant'
      });
    }
    
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
    } else {
      // If no history, just add the current message
      messages.push({
        role: 'user',
        content: message
      });
    }
    
    // Add context to last user message if available
    if (contextData && messages.length > 1) {
      // Find the last user message
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          // Add context to this message
          messages[i].content = `Context: ${JSON.stringify(contextData)}\n\nUser message: ${messages[i].content}`;
          break;
        }
      }
    }
    
    console.log('Sending to OpenAI with messages:', messages.length);
    
    // Call OpenAI API
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
    });
    
    // Extract response
    const aiResponse = completion.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
    
    console.log('Received response from OpenAI');
    
    // Return response
    return res.status(200).json({
      content: aiResponse,
      role: 'assistant'
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