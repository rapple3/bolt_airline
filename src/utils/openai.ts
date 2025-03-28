import { FlightData, BookingData, LoyaltyData, UserProfile } from '../types';
import { mockFlights, mockBookings, mockLoyalty, airlinePolicies, mockUserProfile } from '../data/mockData';
import { dataManager } from './dataManager';
import { executeAction, parseAction, ActionResult } from './actionHandler';

// Message history for the conversation
let messageHistory: { role: 'user' | 'assistant' | 'system', content: string }[] = [];

// Conversation context for tracking references to flights and bookings
interface ConversationContext {
  lastSearchResults?: FlightData[];
  selectedFlight?: FlightData;
  pendingBookingDetails?: {
    flightNumber: string;
    seatClass: 'economy' | 'business' | 'first';
    confirmed: boolean;
  };
  recentlyMentionedFlights: Map<string, FlightData>; // Map of flight numbers to flight data
  recentlyMentionedBookings: Map<string, BookingData>; // Map of booking references to booking data
}

// Initialize the conversation context
const conversationContext: ConversationContext = {
  recentlyMentionedFlights: new Map(),
  recentlyMentionedBookings: new Map()
};

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

IMPORTANT BOOKING WORKFLOW:
1. First show available flight options via SEARCH_FLIGHTS
2. Ask the user to select a flight by number
3. When they select a flight, summarize its details and ask for confirmation
4. Only use BOOK_FLIGHT after the user confirms

IMPORTANT RESPONSE GUIDELINES:
- When using SEARCH_FLIGHTS, wait for the action result before forming your response
- If flights are found, acknowledge the number of flights found and ask the user to review the options
- If no flights are found, suggest checking different dates or routes
- Always be consistent with the actual search results shown to the user
- Always ask for explicit confirmation before booking a flight
- Include complete flight details (route, date, time, price) when asking for confirmation

Use these actions when users request these specific services.
Only include the action directive when you're performing an action, not when you're explaining what you can do.
Place the action directive at the beginning of your message, followed by your regular response.

Example of flight search and booking workflow:
User: "I want to book a flight from New York to London on December 25th"
Assistant: "[ACTION:SEARCH_FLIGHTS]from="New York" to="London" date="2023-12-25"[/ACTION]
I've found several flights from New York to London on December 25th. Please review the options above and let me know which flight you'd like to book by providing the flight number."

User: "I'd like to book flight AI101 in economy class"
Assistant: "I see you're interested in booking flight AI101 in economy class. This flight departs from New York (JFK) at 10:30 AM and arrives in London (LHR) at 10:45 PM. The cost is $750. 
Would you like me to proceed with booking this flight?"

User: "Yes, please book it"
Assistant: "[ACTION:BOOK_FLIGHT]flightNumber="AI101" seatClass="economy"[/ACTION]
I've booked your economy class seat on flight AI101. You'll receive a confirmation shortly with all the details."
`;

// Helper function to update conversation context with flight search results
const updateContextWithSearchResults = (flights: FlightData[]) => {
  conversationContext.lastSearchResults = flights;
  
  // Add each flight to the recently mentioned flights map
  flights.forEach(flight => {
    conversationContext.recentlyMentionedFlights.set(flight.flightNumber, flight);
  });
};

// Helper function to resolve a flight reference from user message
const resolveFlightReference = (userMessage: string): FlightData | undefined => {
  // Check for explicit flight number in the message (e.g., "AA1234", "flight AA1234")
  const flightNumberMatch = userMessage.match(/\b([A-Z]{2}[0-9]{3,4})\b/i);
  if (flightNumberMatch) {
    const flightNumber = flightNumberMatch[1].toUpperCase();
    
    // First check in conversation context
    if (conversationContext.recentlyMentionedFlights.has(flightNumber)) {
      return conversationContext.recentlyMentionedFlights.get(flightNumber);
    }
    
    // Then check in data manager
    const allFlights = dataManager.getFlights();
    return allFlights.find(f => f.flightNumber === flightNumber);
  }
  
  // Check for reference to "that flight" if we have a selected flight
  if ((userMessage.includes("that flight") || userMessage.includes("this flight")) && 
      conversationContext.selectedFlight) {
    return conversationContext.selectedFlight;
  }
  
  // Check if user is referring to a flight from the last search results
  if (userMessage.includes("first flight") && conversationContext.lastSearchResults?.length) {
    return conversationContext.lastSearchResults[0];
  }
  
  // Process other positional references like "second flight", "last flight", etc.
  const positionMatches = userMessage.match(/\b(first|second|third|fourth|fifth|last)\s+flight\b/i);
  if (positionMatches && conversationContext.lastSearchResults?.length) {
    const position = positionMatches[1].toLowerCase();
    
    if (position === "first") return conversationContext.lastSearchResults[0];
    if (position === "second" && conversationContext.lastSearchResults.length > 1) 
      return conversationContext.lastSearchResults[1];
    if (position === "third" && conversationContext.lastSearchResults.length > 2) 
      return conversationContext.lastSearchResults[2];
    if (position === "fourth" && conversationContext.lastSearchResults.length > 3) 
      return conversationContext.lastSearchResults[3];
    if (position === "fifth" && conversationContext.lastSearchResults.length > 4) 
      return conversationContext.lastSearchResults[4];
    if (position === "last" && conversationContext.lastSearchResults.length > 0) 
      return conversationContext.lastSearchResults[conversationContext.lastSearchResults.length - 1];
  }
  
  return undefined;
};

const getRelevantData = (userMessage: string) => {
  // Use data from dataManager instead of directly from mockData
  const currentUserProfile = dataManager.getUserProfile();
  const currentBookings = dataManager.getBookings();
  const currentFlights = dataManager.getFlights();
  
  // Resolve any reference to a specific flight
  const referencedFlight = resolveFlightReference(userMessage);
  if (referencedFlight) {
    conversationContext.selectedFlight = referencedFlight;
  }
  
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
  
  // Include conversation context data to help with flight references
  const conversationData = {
    selectedFlight: conversationContext.selectedFlight,
    lastSearchResults: conversationContext.lastSearchResults?.slice(0, 3), // Only send the first 3 for context
    pendingBooking: conversationContext.pendingBookingDetails
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
    airlinePolicies,
    conversationContext: conversationData
  };
};

// Function to call the API with fallback
async function callApiWithFallback(userMessage: string, contextData: any, history: any[]) {
  // Just use a single endpoint since it was working before
  const endpoint = '/api/chat';
  
  console.log(`Calling API at: ${endpoint}`);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      message: userMessage,
      contextData,
      history
    }),
  });
  
  if (!response.ok) {
    throw new Error(`API returned status ${response.status}`);
  }
  
  const data = await response.json();
  return { success: true, data };
}

export const getChatResponse = async (userMessage: string): Promise<{
  content: string;
  requiresHandoff: boolean;
  actionResult?: any;
  pendingConfirmation?: {
    type: 'BOOK_FLIGHT';
    flightNumber: string;
    seatClass: 'economy' | 'business' | 'first';
    flightDetails: FlightData;
  };
}> => {
  // Get contextual data based on user message
  const contextData = getRelevantData(userMessage);
  
  // Check if the user is confirming a pending booking
  const isConfirming = /\b(yes|confirm|book it|proceed|go ahead)\b/i.test(userMessage) && 
                     conversationContext.pendingBookingDetails && 
                     !conversationContext.pendingBookingDetails.confirmed;
  
  // Add user message to history
  messageHistory.push({
    role: 'user',
    content: userMessage
  });
  
  try {
    // If this is a confirmation of a pending booking, handle it directly
    if (isConfirming && conversationContext.pendingBookingDetails) {
      const { flightNumber, seatClass } = conversationContext.pendingBookingDetails;
      conversationContext.pendingBookingDetails.confirmed = true;
      
      // Execute the booking action
      const actionResult = await executeAction('BOOK_FLIGHT', { 
        flightNumber, 
        seatClass 
      });
      
      const confirmationMessage = actionResult.success
        ? `I've booked your ${seatClass} class seat on flight ${flightNumber}. Your booking is confirmed.`
        : `I'm sorry, there was an issue booking flight ${flightNumber}: ${actionResult.message}`;
      
      // Store in message history
      messageHistory.push({
        role: 'assistant',
        content: `[ACTION:BOOK_FLIGHT]flightNumber="${flightNumber}" seatClass="${seatClass}"[/ACTION] ${confirmationMessage}`
      });
      
      return {
        content: confirmationMessage,
        requiresHandoff: false,
        actionResult
      };
    }
    
    // Use the API call function to get a response
    const { data } = await callApiWithFallback(userMessage, contextData, messageHistory);
    
    // Parse for actions
    const { actionType, params, content } = parseAction(data.content);
    
    // For SEARCH_FLIGHTS actions, we'll modify how we handle the text content
    let displayContent = content || data.content;
    
    // Store the response in history
    messageHistory.push({
      role: 'assistant',
      content: data.content
    });
    
    // Execute action if present
    let actionResult;
    let pendingConfirmation;
    
    if (actionType && params) {
      console.log(`Executing action: ${actionType}`, params);
      
      // For BOOK_FLIGHT, we need to implement our two-step confirmation process
      if (actionType === 'BOOK_FLIGHT' && !isConfirming) {
        // First, validate that we have a selected flight
        const { flightNumber, seatClass } = params;
        
        // Find the flight details
        const flight = 
          conversationContext.recentlyMentionedFlights.get(flightNumber) ||
          conversationContext.lastSearchResults?.find(f => f.flightNumber === flightNumber) ||
          dataManager.getFlights().find(f => f.flightNumber === flightNumber);
          
        if (flight) {
          // Store as a pending booking that needs confirmation
          conversationContext.pendingBookingDetails = {
            flightNumber,
            seatClass: seatClass as 'economy' | 'business' | 'first',
            confirmed: false
          };
          
          // Update the selected flight
          conversationContext.selectedFlight = flight;
          
          // Format flight details for confirmation
          const departureDate = new Date(flight.scheduledTime);
          const formattedDate = departureDate.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          const formattedTime = departureDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
          
          // Check if there are available seats in the requested class
          const availableSeats = flight.seats[seatClass as 'economy' | 'business' | 'first']
            .filter(seat => seat.status === 'available').length;
          
          if (availableSeats === 0) {
            // If no seats available, send an error message
            displayContent = `I'm sorry, there are no ${seatClass} class seats available on flight ${flightNumber}. Would you like to try a different flight or seat class?`;
            
            // Clear the pending booking
            conversationContext.pendingBookingDetails = undefined;
          } else {
            // Create a confirmation message with flight details
            displayContent = `I see you're interested in booking flight ${flightNumber} in ${seatClass} class. 
This flight departs from ${flight.departure} on ${formattedDate} at ${formattedTime} and arrives at ${flight.arrival}.
The flight duration is ${flight.duration}.

Would you like me to confirm this booking?`;
          
            // Return the pending confirmation
            pendingConfirmation = {
              type: 'BOOK_FLIGHT' as const,
              flightNumber,
              seatClass: seatClass as 'economy' | 'business' | 'first',
              flightDetails: flight
            };
          }
        } else {
          // Flight not found
          displayContent = `I couldn't find flight ${flightNumber} in our system. Please check the flight number and try again.`;
        }
      } else if (actionType === 'SEARCH_FLIGHTS') {
        // Execute the search
        actionResult = await executeAction(actionType, params);
        
        // Update the conversation context with the search results
        if (actionResult?.success && Array.isArray(actionResult.data)) {
          updateContextWithSearchResults(actionResult.data);
        }
        
        // For flight search, we want to remove redundant text and let the UI component handle the display
        if (actionResult?.success) {
          // If the text is just repeating info that will be shown in the flight results card,
          // we can simplify it or replace it entirely
          if (displayContent.toLowerCase().includes('found') && displayContent.toLowerCase().includes('flight')) {
            // Either remove the content entirely and let the UI show it, or provide a simple prompt
            displayContent = 'Here are the flights I found for you. Please select one to continue by specifying the flight number (e.g., "I want flight AA3606").';
          }
        }
      } else {
        // For other action types, execute them directly
        actionResult = await executeAction(actionType, params);
        
        // If this was a successful booking, clear any pending booking
        if (actionType === 'BOOK_FLIGHT' && actionResult?.success) {
          conversationContext.pendingBookingDetails = undefined;
        }
      }
    }
    
    // Check for handoff keywords
    const handoffKeywords = [
      'cannot help', 'cannot assist', 'beyond my capabilities',
      'need a human', 'agent assistance', 'speak to a representative',
      'complex issue', 'escalate', 'human support'
    ];
    
    const requiresHandoff = handoffKeywords.some(keyword => 
      data.content.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return {
      content: displayContent,
      requiresHandoff,
      actionResult,
      pendingConfirmation
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