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
const SYSTEM_PROMPT = `You are a friendly and professional AI assistant for Delta Airlines. Your name is Delta Assistant. You are committed to helping customers have the best travel experience possible with Delta.

PERSONALITY TRAITS:
- Professional and reliable: Reflect Delta's reputation for operational excellence
- Warm and hospitable: Embody Delta's southern hospitality roots
- Solution-focused: Provide efficient, helpful solutions to customer needs
- Attentive to detail: Prioritize accuracy in flight information and booking details
- Globally-minded: Recognize Delta's worldwide network and diverse customer base

You can perform the following actions to help users:

1. Search for flights: [ACTION:SEARCH_FLIGHTS]from="New York" to="London" date="2023-12-25"[/ACTION]
2. Book a flight: [ACTION:BOOK_FLIGHT]flightNumber="DL123" seatClass="economy"[/ACTION]
3. Cancel a booking: [ACTION:CANCEL_BOOKING]bookingReference="DL12345"[/ACTION]
4. Change flight: [ACTION:CHANGE_FLIGHT]bookingReference="DL12345" newFlightNumber="DL456"[/ACTION]
5. Change seat: [ACTION:CHANGE_SEAT]bookingReference="DL12345" newSeatNumber="12A"[/ACTION]
6. Check-in: [ACTION:CHECK_IN]bookingReference="DL12345"[/ACTION]
7. Track baggage: [ACTION:TRACK_BAGGAGE]bookingReference="DL12345"[/ACTION]

IMPORTANT WORKFLOW:
- Never directly execute booking, cancellation, or flight changes without first getting explicit confirmation
- When a user asks to book a flight, FIRST use SEARCH_FLIGHTS to show them options
- Only use BOOK_FLIGHT after they've selected a specific flight AND explicitly confirmed they want to book it
- When a user asks to change their flight, FIRST use SEARCH_FLIGHTS to show them alternatives
- Only use CHANGE_FLIGHT after they've selected a specific flight AND explicitly confirmed

MANDATORY CONFIRMATION PROCESS - VERY IMPORTANT:
1. BOOKING:
   - After user selects a flight, show a summary (don't use BOOK_FLIGHT yet)
   - Ask "Would you like me to go ahead and book this Delta flight for you?"
   - Only use BOOK_FLIGHT action after user explicitly confirms with "yes", "book it", etc.

2. CANCELLATION:
   - When user asks to cancel, don't use CANCEL_BOOKING yet
   - Show a warning and ask "Are you sure you want to cancel this Delta booking? This cannot be undone."
   - Only use CANCEL_BOOKING action after user explicitly confirms

3. FLIGHT CHANGE:
   - After user selects a new flight, show details of the change (don't use CHANGE_FLIGHT yet)
   - Ask "Would you like me to confirm this Delta flight change for you?"
   - Only use CHANGE_FLIGHT action after user explicitly confirms

CUSTOMER SERVICE PRINCIPLES:
- Always acknowledge the customer's feelings and validate their concerns
- Offer multiple options whenever possible to give customers choice
- Check for satisfaction after providing information ("Does that answer your question?" or "Would you like more details?")
- Express genuine gratitude when customers choose Delta Airlines
- If you can't help with something, clearly explain why and offer alternatives
- For delayed flights or issues, show empathy and offer solutions proactively

IMPORTANT RESPONSE GUIDELINES:
- When using SEARCH_FLIGHTS, wait for the action result before forming your response
- If flights are found, acknowledge the number of flights found with a professional tone and ask the user to review the options
- If no flights are found, express understanding and suggest checking different dates or routes
- Always be consistent with the actual search results shown to the user
- Always ask for explicit confirmation before booking a flight
- Include complete flight details (route, date, time, price) when asking for confirmation

Use these actions when users request these specific services.
Only include the action directive when you're performing an action, not when you're explaining what you can do.
Place the action directive at the beginning of your message, followed by your regular response.

Example of flight search and booking workflow:
User: "I want to book a flight from New York to London on December 25th"
Assistant: "[ACTION:SEARCH_FLIGHTS]from="New York" to="London" date="2023-12-25"[/ACTION]
I've found several Delta flights from New York to London on December 25th. Here are your options - please let me know which one would work best for your schedule."

User: "I'd like to book flight DL101 in economy class"
Assistant: "Great choice! Delta flight DL101 in economy class from New York (JFK) to London (LHR) departing at 10:30 AM and arriving at 10:45 PM. The cost is $750. 
Would you like me to go ahead and book this Delta flight for you?"

User: "Yes, please book it"
Assistant: "[ACTION:BOOK_FLIGHT]flightNumber="DL101" seatClass="economy"[/ACTION]
Excellent! I've booked your economy class seat on Delta flight DL101. You're all set for your trip to London! You'll receive a confirmation email shortly with all the details. Is there anything else I can help you with regarding your Delta journey?"
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
  
  console.log(`Calling API at: ${endpoint} with message: "${userMessage.substring(0, 30)}..."`);
  console.log('Context data:', JSON.stringify(contextData, null, 2));
  console.log('History length:', history.length);
  
  try {
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
      console.error(`API error: ${response.status} ${response.statusText}`);
      throw new Error(`API returned status ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`API response received:`, data);
    return { success: true, data };
  } catch (error) {
    console.error("Error in API call:", error);
    throw error;
  }
};

// Function to detect if a question is policy-related
const isPolicyQuestion = (message: string): boolean => {
  const policyKeywords = [
    'policy', 'policies', 'rules', 'terms', 'conditions',
    'baggage', 'luggage', 'carry-on', 'checked bag',
    'cancel', 'cancellation', 'refund', 'change fee',
    'check-in', 'boarding', 'seating', 'upgrade', 
    'miles', 'points', 'rewards', 'loyalty', 'tier',
    'allowed', 'prohibited', 'permitted', 'restriction'
  ];
  
  const messageLower = message.toLowerCase();
  
  // Check for question format
  const isQuestion = /what|how|when|where|why|can i|do you|is there|are there/i.test(messageLower);
  
  // Check for policy keywords
  const hasPolicyKeyword = policyKeywords.some(keyword => 
    messageLower.includes(keyword)
  );
  
  return isQuestion && hasPolicyKeyword;
};

// Function to fetch policy information
const fetchPolicyInfo = async (query: string): Promise<string> => {
  try {
    const response = await fetch('/api/policy-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) throw new Error('Policy search failed');
    
    const { policyChunks } = await response.json();
    
    if (!policyChunks || policyChunks.length === 0) return '';
    
    // Format policy information as context
    return policyChunks
      .map((chunk: { metadata: { category: string }, content: string }) => `--- Policy Information (${chunk.metadata.category}) ---\n${chunk.content}`)
      .join('\n\n');
  } catch (error) {
    console.error('Error fetching policy info:', error);
    return '';
  }
};

export const getChatResponse = async (userMessage: string): Promise<{
  content: string;
  requiresHandoff: boolean;
  actionResult?: any;
  pendingConfirmation?: {
    type: 'BOOK_FLIGHT' | 'CANCEL_BOOKING' | 'CHANGE_FLIGHT';
    flightNumber?: string;
    seatClass?: 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
    flightDetails?: FlightData;
    bookingReference?: string;
    newFlightNumber?: string;
    newFlightDetails?: FlightData;
  };
}> => {
  // Get contextual data based on user message
  const contextData = getRelevantData(userMessage);
  
  // Check if this might be a policy question
  if (isPolicyQuestion(userMessage)) {
    console.log('Policy question detected:', userMessage);
    // Fetch relevant policy information
    const policyInfo = await fetchPolicyInfo(userMessage);
    
    // Add policy information to context if found
    if (policyInfo) {
      console.log('Found relevant policy information');
      (contextData as any).policyInformation = policyInfo;
    }
  }
  
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
      
      // For BOOK_FLIGHT, CANCEL_BOOKING, and CHANGE_FLIGHT, we'll let the UI handle the confirmation
      // so we don't need as much special handling here. Let's simplify the logic.
      if (actionType === 'SEARCH_FLIGHTS') {
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
            displayContent = 'Here are the flights I found for you. Please select one to proceed.';
          }
        }
      } else if (actionType === 'BOOK_FLIGHT') {
        // Find flight details for a potential pending confirmation
        const { flightNumber, seatClass } = params;
        
        // Find the flight details
        const flight = 
          conversationContext.recentlyMentionedFlights.get(flightNumber) ||
          conversationContext.lastSearchResults?.find(f => f.flightNumber === flightNumber) ||
          dataManager.getFlights().find(f => f.flightNumber === flightNumber);
          
        if (flight) {
          // The ActionResultCard will handle the confirmation now
          // We'll just pass the result to let the UI know what action was attempted
          actionResult = {
            success: true,
            message: `Flight ${flightNumber} selected for booking`,
            data: flight
          };
        } else {
          // Flight not found
          displayContent = `I couldn't find flight ${flightNumber} in our system. Please check the flight number and try again.`;
        }
      } else if (actionType === 'CANCEL_BOOKING') {
        // Extract booking reference
        const { bookingReference } = params;
        
        // Find the booking details
        const bookings = dataManager.getBookings();
        const booking = bookings.find(b => b.bookingReference === bookingReference);
        
        if (booking) {
          // The ActionResultCard will handle the confirmation now
          // We'll just pass the result to let the UI know what action was attempted
          actionResult = {
            success: true,
            message: `Booking ${bookingReference} selected for cancellation`,
            data: booking
          };
          
          // Return the pending confirmation
          pendingConfirmation = {
            type: 'CANCEL_BOOKING' as const,
            bookingReference
          };
        } else {
          // Booking not found
          displayContent = `I couldn't find booking ${bookingReference} in our system. Please check the booking reference and try again.`;
        }
      } else if (actionType === 'CHANGE_FLIGHT') {
        // Extract booking reference and new flight number
        const { bookingReference, newFlightNumber } = params;
        
        // Find the booking details
        const bookings = dataManager.getBookings();
        const booking = bookings.find(b => b.bookingReference === bookingReference);
        
        // Find the new flight details
        const newFlight = dataManager.getFlights().find(f => f.flightNumber === newFlightNumber);
        
        if (booking && newFlight) {
          // The ActionResultCard will handle the confirmation now
          // We'll just pass the result to let the UI know what action was attempted
          actionResult = {
            success: true,
            message: `Flight change from booking ${bookingReference} to flight ${newFlightNumber} requested`,
            data: { booking, newFlight }
          };
          
          // Return the pending confirmation
          pendingConfirmation = {
            type: 'CHANGE_FLIGHT' as const,
            bookingReference,
            flightNumber: booking.flightNumber,
            newFlightNumber,
            newFlightDetails: newFlight
          };
        } else if (!booking) {
          // Booking not found
          displayContent = `I couldn't find booking ${bookingReference} in our system. Please check the booking reference and try again.`;
        } else if (!newFlight) {
          // New flight not found
          displayContent = `I couldn't find flight ${newFlightNumber} in our system. Please check the flight number and try again.`;
        }
      } else {
        // For other action types, execute them directly
        actionResult = await executeAction(actionType, params);
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