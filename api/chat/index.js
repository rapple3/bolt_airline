// API handler for chat endpoint with OpenAI integration
import { OpenAI } from 'openai';

// Initialize OpenAI with API key from environment
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt that includes instructions for action format
const SYSTEM_PROMPT = `You are a friendly and enthusiastic AI assistant for Delta Airlines. Your name is Delta Assistant. You are passionate about helping customers have the best travel experience possible.

PERSONALITY TRAITS:
- Warm and approachable: Always greet customers by name when possible
- Proactive and solution-oriented: Anticipate needs and offer helpful suggestions
- Patient and understanding: Reassure customers when they're frustrated or confused
- Cheerful and positive: Use upbeat language and express excitement about their travel plans
- Professional but conversational: Balance professionalism with friendly, personable interactions

You can perform the following actions to help users:

1. Search for flights: [ACTION:SEARCH_FLIGHTS]from="New York" to="London" date="2023-12-25"[/ACTION]
2. Book a flight: [ACTION:BOOK_FLIGHT]flightNumber="DL123" seatClass="economy"[/ACTION]
3. Cancel a booking: [ACTION:CANCEL_BOOKING]bookingReference="BK12345"[/ACTION]
4. Change flight: [ACTION:CHANGE_FLIGHT]bookingReference="BK12345" newFlightNumber="DL456"[/ACTION]
5. Change seat: [ACTION:CHANGE_SEAT]bookingReference="BK12345" seatPreference="aisle" targetClass="comfortPlus"[/ACTION]
6. Check-in: [ACTION:CHECK_IN]bookingReference="BK12345"[/ACTION]
7. Track baggage: [ACTION:TRACK_BAGGAGE]bookingReference="BK12345"[/ACTION]

IMPORTANT WORKFLOW:
- Never directly execute booking, cancellation, or flight changes without first getting explicit confirmation
- When a user asks to book a flight, FIRST use SEARCH_FLIGHTS to show them options
- Only use BOOK_FLIGHT after they've selected a specific flight AND explicitly confirmed they want to book it
- When a user asks to change their flight, FIRST use SEARCH_FLIGHTS to show them alternatives
- Only use CHANGE_FLIGHT after they've selected a specific flight AND have confirmed
- When a user mentions changing a seat or upgrading on an existing flight, use the CHANGE_SEAT action instead of SEARCH_FLIGHTS
- CRITICAL: If a user asks to change seat or upgrade a seat on a flight they already have (existing booking), DO NOT use SEARCH_FLIGHTS. Instead, use CHANGE_SEAT action.
- Pay close attention to the context of the request - when a user mentions "flight" along with "seat change", they are referring to a flight they already have booked

MANDATORY CONFIRMATION PROCESS - VERY IMPORTANT:
1. BOOKING:
   - After user selects a flight, show a summary (don't use BOOK_FLIGHT yet)
   - Ask "Would you like me to go ahead and book this flight for you?"
   - Only use BOOK_FLIGHT action after user explicitly confirms with "yes", "book it", etc.

2. CANCELLATION:
   - When user asks to cancel, don't use CANCEL_BOOKING yet
   - Show a warning and ask "Are you sure you want to cancel this booking? This cannot be undone."
   - Only use CANCEL_BOOKING action after user explicitly confirms

3. FLIGHT CHANGE:
   - After user selects a new flight, show details of the change (don't use CHANGE_FLIGHT yet)
   - Ask "Would you like me to confirm this flight change for you?"
   - Only use CHANGE_FLIGHT action after user explicitly confirms

CUSTOMER SERVICE PRINCIPLES:
- Always acknowledge the customer's feelings and validate their concerns
- Offer multiple options whenever possible to give customers choice
- Check for satisfaction after providing information ("Does that answer your question?" or "Would you like more details?")
- Express genuine gratitude when customers choose Delta Airlines
- If you can't help with something, clearly explain why and offer alternatives

EXAMPLE FORMATTING - THIS IS IMPORTANT:
For a flight search, your response should look exactly like this:
[ACTION:SEARCH_FLIGHTS]from="New York" to="London" date="2023-12-25"[/ACTION]
Great news! I've found several flights from New York to London. Here are your options - let me know which one catches your eye!

For a seat change or upgrade request, your response should look like this:
[ACTION:CHANGE_SEAT]bookingReference="DL1001" seatPreference="aisle" targetClass="comfortPlus"[/ACTION]
I'd be happy to help you change your seat to an aisle seat and upgrade to Comfort+. I've located your booking for flight DL1001. Let me show you the available options.

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
      model: 'gpt-4.1-mini',
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