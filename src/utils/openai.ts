import { FlightData, BookingData, LoyaltyData, UserProfile } from '../types';
import { mockFlights, mockBookings, mockLoyalty, airlinePolicies, mockUserProfile } from '../data/mockData';
import { dataManager } from './dataManager';
import { executeAction, parseAction, ActionResult } from './actionHandler';

let messageHistory: { role: 'user' | 'assistant' | 'system', content: string }[] = [];

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

IMPORTANT WORKFLOW:
- When a user asks to book a flight, FIRST use SEARCH_FLIGHTS to show them options
- Only use BOOK_FLIGHT after they've selected a specific flight
- When a user asks to change their flight, FIRST use SEARCH_FLIGHTS to show them alternatives
- Only use CHANGE_FLIGHT after they've selected a specific flight

IMPORTANT RESPONSE GUIDELINES:
- When using SEARCH_FLIGHTS, wait for the action result before forming your response
- If flights are found, acknowledge the number of flights found and ask the user to review the options
- If no flights are found, suggest checking different dates or routes
- Always be consistent with the actual search results shown to the user

Use these actions when users request these specific services.
Only include the action directive when you're performing an action, not when you're explaining what you can do.
Place the action directive at the beginning of your message, followed by your regular response.

Example of flight search and booking workflow:
User: "I want to book a flight from New York to London on December 25th"
Assistant: "[ACTION:SEARCH_FLIGHTS]from="New York" to="London" date="2023-12-25"[/ACTION]
I've found several flights from New York to London on December 25th. Please review the options above and let me know which flight you'd like to book by providing the flight number."

User: "I'd like to book flight AI101 in economy class"
Assistant: "[ACTION:BOOK_FLIGHT]flightNumber="AI101" seatClass="economy"[/ACTION]
I've booked your economy class seat on flight AI101. You'll receive a confirmation shortly with all the details."
`;

const getRelevantData = (userMessage: string) => {
  // Use data from dataManager instead of directly from mockData
  const currentUserProfile = dataManager.getUserProfile();
  const currentBookings = dataManager.getBookings();
  const currentFlights = dataManager.getFlights();
  
  // Extract user profile essentials
  const userProfileData = {
    name: currentUserProfile.name,
    loyaltyTier: currentUserProfile.loyaltyTier,
    loyaltyPoints: currentUserProfile.loyaltyPoints,
    preferences: currentUserProfile.preferences,
    upcomingFlights: currentUserProfile.upcomingFlights,
    // Include activity log if it exists
    ...(currentUserProfile.activityLog && { 
      recentActions: currentUserProfile.activityLog.slice(-3) 
    })
  };
  
  // Only include detailed flight info if the message is asking about flights
  const flightData = userMessage.toLowerCase().includes('flight') || 
                   userMessage.toLowerCase().includes('travel') || 
                   userMessage.toLowerCase().includes('trip') || 
                   userMessage.toLowerCase().includes('book') ? 
    currentFlights.map(flight => ({
      flightNumber: flight.flightNumber,
      departure: flight.departure,
      arrival: flight.arrival,
      scheduledTime: flight.scheduledTime,
      status: flight.status
    })) : [];
    
  // Only include booking info if the message is about bookings
  const bookingData = userMessage.toLowerCase().includes('book') || 
                     userMessage.toLowerCase().includes('reserv') ||
                     userMessage.toLowerCase().includes('cancel') || 
                     userMessage.toLowerCase().includes('change') || 
                     userMessage.toLowerCase().includes('flight') ? 
    currentBookings : [];
  
  // Return relevant data based on user query
  return {
    userProfile: userProfileData,
    flights: flightData,
    bookings: bookingData,
    airlinePolicies
  };
};

export const getChatResponse = async (userMessage: string): Promise<{
  content: string;
  requiresHandoff: boolean;
  actionResult?: ActionResult;
}> => {
  // Get contextual data based on user message
  const contextData = getRelevantData(userMessage);
  
  // Reset history if it's too long to prevent token limit issues
  if (messageHistory.length > 10) {
    messageHistory = [];
  }
  
  // Add user message to history
  messageHistory.push({
    role: 'user',
    content: userMessage
  });
  
  try {
    // Before making the request, log what we're about to send
    console.log('Sending request to API:', {
      url: '/api/chat',
      messageCount: messageHistory.length
    });

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        messages: messageHistory,
        contextData
      }),
    });

    console.log('Response status:', response.status);
    
    // Check if the response is JSON
    const contentType = response.headers.get("content-type");
    let responseData;
    
    if (contentType && contentType.indexOf("application/json") !== -1) {
      responseData = await response.json();
      console.log('JSON response received:', responseData);
    } else {
      const textResponse = await response.text();
      console.error('Non-JSON response:', textResponse);
      throw new Error(`Received non-JSON response: ${textResponse.substring(0, 100)}...`);
    }

    if (!response.ok) {
      console.error('API Error:', responseData);
      throw new Error(responseData.error || `Server error: ${response.status}`);
    }

    if (!responseData.content) {
      console.error('Invalid response format:', responseData);
      throw new Error('Response missing content field');
    }

    const aiResponse = responseData.content;
    
    // Store AI response in history
    messageHistory.push({
      role: 'assistant',
      content: aiResponse
    });
    
    // Parse the response to extract actions
    const { actionType, params, content } = parseAction(aiResponse);
    
    // Check if action is present
    let actionResult: ActionResult | undefined;
    
    if (actionType && params) {
      // Execute the action
      actionResult = await executeAction(actionType, params);
    }
    
    // Determine if agent handoff is needed
    const handoffKeywords = [
      'cannot help', 'cannot assist', 'beyond my capabilities', 
      'need a human', 'agent assistance', 'speak to a representative',
      'complex issue', 'escalate', 'human support'
    ];
    
    const requiresHandoff = handoffKeywords.some(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return {
      content,
      requiresHandoff,
      actionResult
    };
  } catch (error: any) {
    console.error('Error calling chat API:', error);
    
    // Better error handling to prevent [object Object] in the error message
    let errorMessage = 'Unknown error';
    
    try {
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.message) {
        errorMessage = String(error.message);
      } else if (error.details) {
        errorMessage = String(error.details);
      } else {
        errorMessage = JSON.stringify(error);
      }
    } catch (e) {
      errorMessage = 'Error occurred, but could not extract details';
    }
    
    return {
      content: `I'm sorry, I encountered an error while processing your request: ${errorMessage}. Please try again later.`,
      requiresHandoff: true
    };
  }
};

export const resetChatHistory = () => {
  messageHistory = [];
};