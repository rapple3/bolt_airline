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

// Function to call the API with fallback
async function callApiWithFallback(userMessage: string) {
  // Try different API endpoints until one works
  const endpoints = [
    '/api/chat',
    '/api/chat.js',
    '/api/chat/index',
    '/api/chat/index.js'
  ];
  
  let lastError = null;
  
  // Try each endpoint
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying endpoint: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });
      
      console.log(`Response from ${endpoint}:`, response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Success data:', data);
        return { success: true, data };
      }
    } catch (err) {
      console.error(`Error with endpoint ${endpoint}:`, err);
      lastError = err;
    }
  }
  
  // If all endpoints failed, throw the last error
  throw lastError || new Error('All API endpoints failed');
}

export const getChatResponse = async (userMessage: string): Promise<{
  content: string;
  requiresHandoff: boolean;
  actionResult?: any;
}> => {
  try {
    console.log('Attempting to call API with fallback...');
    const { data } = await callApiWithFallback(userMessage);

    return {
      content: data.content,
      requiresHandoff: false,
    };
  } catch (error: any) {
    console.error('Error calling API:', error);
    return {
      content: `Sorry, there was an error processing your request: ${error.message || 'Unknown error'}`,
      requiresHandoff: true,
    };
  }
};

export const resetChatHistory = () => {
  messageHistory = [];
};