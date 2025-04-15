import { FlightData, BookingData, LoyaltyData, UserProfile } from '../types';
import { mockFlights, mockBookings, mockLoyalty, airlinePolicies, mockUserProfile } from '../data/mockData';
import { dataManager } from './dataManager';
import { executeAction, parseAction, ActionResult } from './actionHandler';
import { analyzeIntent } from './nlp';

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
  
  // New fields for tracking required information
  requiredInfo: {
    travelDetails?: {
      departureCity?: string;
      destinationCity?: string;
      departureDate?: string;
      returnDate?: string;
      numPassengers?: number;
      passengerAges?: number[];
      flexibleDates?: boolean;
    };
    preferences?: {
      seatPreference?: 'window' | 'aisle' | 'middle';
      mealPreference?: string;
      specialAssistance?: string[];
      cabinClass?: 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
    };
    currentQuestion?: string; // Track the current question being asked
    pendingQuestions: string[]; // Queue of questions to ask
  };
}

// Initialize the conversation context
const conversationContext: ConversationContext = {
  recentlyMentionedFlights: new Map(),
  recentlyMentionedBookings: new Map(),
  requiredInfo: {
    pendingQuestions: []
  }
};

// System prompt that includes instructions for action format
const SYSTEM_PROMPT = `You are a friendly and professional AI assistant for Delta Airlines. Your name is Delta Assistant. You are committed to helping customers have the best travel experience possible with Delta.

PERSONALITY TRAITS:
- Professional and reliable: Reflect Delta's reputation for operational excellence
- Warm and hospitable: Embody Delta's southern hospitality roots
- Solution-focused: Provide efficient, helpful solutions to customer needs
- Attentive to detail: Prioritize accuracy in flight information and booking details
- Globally-minded: Recognize Delta's worldwide network and diverse customer base
- Progressive conversation: Gather information naturally through conversation

INFORMATION GATHERING GUIDELINES:
- Always acknowledge information provided by the user before asking for more
- For family bookings, show extra attention to special needs and services
- When gathering multiple pieces of information, do it progressively and naturally
- Provide relevant context when asking questions (e.g., mention family services when asking about special assistance)
- Track and validate information as it's provided
- If information is ambiguous or unclear, ask for clarification

You can perform the following actions to help users:

1. Search for flights: [ACTION:SEARCH_FLIGHTS]from="New York" to="London" date="2023-12-25"[/ACTION]
2. Book a flight: [ACTION:BOOK_FLIGHT]flightNumber="DL123" seatClass="economy"[/ACTION]
3. Cancel a booking: [ACTION:CANCEL_BOOKING]bookingReference="DL12345"[/ACTION]
4. Change flight: [ACTION:CHANGE_FLIGHT]bookingReference="DL12345" newFlightNumber="DL456"[/ACTION]
5. Change seat: [ACTION:CHANGE_SEAT]bookingReference="DL12345" seatPreference="aisle" targetClass="comfortPlus"[/ACTION]
6. Check-in: [ACTION:CHECK_IN]bookingReference="DL12345"[/ACTION]
7. Track baggage: [ACTION:TRACK_BAGGAGE]bookingReference="DL12345"[/ACTION]

IMPORTANT WORKFLOW:
1. INFORMATION GATHERING:
   - When a user initiates a request, check for all required information
   - Acknowledge any information already provided
   - Ask for missing information progressively
   - For family bookings, gather:
     * Number of passengers
     * Ages (for appropriate fare types)
     * Special assistance needs
     * Meal preferences
     * Seating preferences
   - Validate information as it's received
   - Summarize gathered information before proceeding with actions

2. BOOKING WORKFLOW:
   - Never directly execute booking without first gathering all required information
   - When a user asks to book a flight:
     1. Gather departure city, destination, dates, and passenger information
     2. Use SEARCH_FLIGHTS to show options
     3. Wait for specific flight selection
     4. Confirm booking details and price
     5. Get explicit confirmation before using BOOK_FLIGHT

3. CANCELLATION WORKFLOW:
   - When user asks to cancel:
     1. Get booking reference if not provided
     2. Check ticket type and refund policy
     3. Present options (refund vs eCredit)
     4. Get explicit confirmation
     5. Use CANCEL_BOOKING only after confirmation

4. FLIGHT CHANGE WORKFLOW:
   - For flight changes:
     1. Get current booking details
     2. Understand desired changes
     3. Search for alternatives
     4. Present options with price differences
     5. Get explicit confirmation
     6. Use CHANGE_FLIGHT after confirmation

5. SEAT CHANGE & UPGRADES:
   - For seat/class changes:
     1. Get booking reference
     2. Understand preferences (window/aisle, class upgrade)
     3. Check eligibility (SkyMiles status)
     4. Present options
     5. Use CHANGE_SEAT after confirmation

EXAMPLE PROGRESSIVE CONVERSATIONS:

Family Booking:
User: "I want to book a flight for my family"
Assistant: "I'd be happy to help you book a flight for your family. How many people will be traveling?"

User: "Me and my triplets"
Assistant: "I understand you'll be traveling with your triplets. Delta offers several family-friendly services. What city will you be departing from?"

User: "From Atlanta"
Assistant: "You'll be departing from Atlanta. What's your destination city?"

Flight Change:
User: "I need to change my flight"
Assistant: "I'll help you change your flight. Could you please provide your booking reference number?"

User: "DL12345"
Assistant: "Thanks. I see your current flight. What date would you like to change to?"

CUSTOMER SERVICE PRINCIPLES:
- Always acknowledge the customer's feelings and validate their concerns
- Offer multiple options whenever possible to give customers choice
- Check for satisfaction after providing information ("Does that answer your question?" or "Would you like more details?")
- Express genuine gratitude when customers choose Delta Airlines
- If you can't help with something, clearly explain why and offer alternatives
- For delayed flights or issues, show empathy and offer solutions proactively

IMPORTANT RESPONSE GUIDELINES:
- When using SEARCH_FLIGHTS, wait for the action result before forming your response
- If flights are found, acknowledge the number of flights found and ask for preferences
- If no flights are found, express understanding and suggest alternatives
- Always be consistent with the actual search results shown
- Always ask for explicit confirmation before booking
- Include complete flight details when asking for confirmation

Use these actions when users request these specific services.
Only include the action directive when you're performing an action, not when explaining what you can do.
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

Example of cancellation workflow:
User: "I want to cancel my ticket on DL789. Can I get a refund?"
Assistant: "To cancel your ticket, please confirm your booking reference or PNR number."

User: "My PNR is ABC123."
Assistant: "Let me check your ticket type... Your non-refundable ticket qualifies for an eCredit. Would you like to proceed?"

User: "Yes, proceed."
Assistant: "Are you sure you want to cancel this Delta booking? This action cannot be undone."

User: "Yes."
Assistant: "[ACTION:CANCEL_BOOKING]bookingReference="ABC123"[/ACTION]
Your eCredit for $[amount] has been issued. Check your email for confirmation. Is there anything else I can help you with today?"

Alternative flow:
User: "I need a refund instead."
Assistant: "Your ticket is non-refundable per policy. I can escalate this to a supervisor. Would you like that?"

Example of seat change request:
User: "I want to change my seat on flight DL123 to an aisle seat"
Assistant: "[ACTION:CHANGE_SEAT]bookingReference="DL123" seatPreference="aisle"[/ACTION]
I'd be happy to help you change your seat to an aisle seat. I've located your booking for flight DL123. Please review the available aisle seats and select your preference."

User: "I want to upgrade my seat on flight DL1001 to comfort plus" 
Assistant: "[ACTION:CHANGE_SEAT]bookingReference="DL1001" targetClass="comfortPlus"[/ACTION]
I'd be happy to help you upgrade your seat to Comfort+. I've located your booking for flight DL1001. Let me show you the available upgrade options."

User: "I want to change to an aisle seat and upgrade to comfort plus on my flight"
Assistant: "[ACTION:CHANGE_SEAT]bookingReference="DL1001" seatPreference="aisle" targetClass="comfortPlus"[/ACTION]
I'd be happy to help you change your seat to an aisle seat and upgrade to Comfort+. I've located your booking. Let me show you the available options."
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

// Helper function to determine what information is still needed
function determineRequiredInfo(intent: string, currentContext: ConversationContext): string[] {
  const questions: string[] = [];
  const { travelDetails, preferences } = currentContext.requiredInfo;

  if (intent === 'book_flight' || intent === 'search_flights') {
    if (!travelDetails?.departureCity) {
      questions.push("What city will you be departing from?");
    }
    if (!travelDetails?.destinationCity) {
      questions.push("What's your destination city?");
    }
    if (!travelDetails?.departureDate) {
      questions.push("When would you like to travel?");
    }
    if (!travelDetails?.numPassengers) {
      questions.push("How many passengers will be traveling?");
    }
    if (travelDetails?.numPassengers && travelDetails.numPassengers > 1 && !travelDetails?.passengerAges) {
      questions.push("Could you please share the ages of all passengers? This helps me find the best fares.");
    }
  }

  // Special handling for family travel
  if (travelDetails?.numPassengers && travelDetails.numPassengers > 1) {
    if (!preferences?.specialAssistance) {
      questions.push("Will you need any special assistance for traveling with your family? (e.g., stroller service, family seating)");
    }
    if (!preferences?.mealPreference) {
      questions.push("Do you have any special meal requirements for you or your family members?");
    }
  }

  return questions;
}

// Helper function to update conversation context with new information
function updateContextWithUserInfo(userMessage: string, context: ConversationContext) {
  const lowercaseMessage = userMessage.toLowerCase();
  
  // Try to extract departure city
  const fromCityMatch = lowercaseMessage.match(/from\s+([a-z\s]+?)(?=\s+to|\s*$)/i);
  if (fromCityMatch) {
    context.requiredInfo.travelDetails = {
      ...context.requiredInfo.travelDetails,
      departureCity: fromCityMatch[1].trim()
    };
  }

  // Try to extract destination city
  const toCityMatch = lowercaseMessage.match(/to\s+([a-z\s]+)(?=\s+on|\s*$)/i);
  if (toCityMatch) {
    context.requiredInfo.travelDetails = {
      ...context.requiredInfo.travelDetails,
      destinationCity: toCityMatch[1].trim()
    };
  }

  // Try to extract passenger count
  if (lowercaseMessage.includes('triplet')) {
    context.requiredInfo.travelDetails = {
      ...context.requiredInfo.travelDetails,
      numPassengers: 4  // Parent + 3 triplets
    };
  }

  // Update pending questions based on new information
  context.requiredInfo.pendingQuestions = determineRequiredInfo('book_flight', context);
}

export const getChatResponse = async (userMessage: string): Promise<{
  content: string;
  requiresHandoff: boolean;
  actionResult?: any;
  pendingConfirmation?: {
    type: 'BOOK_FLIGHT' | 'CANCEL_BOOKING' | 'CHANGE_FLIGHT' | 'CHANGE_SEAT';
    flightNumber?: string;
    seatClass?: 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
    flightDetails?: FlightData;
    bookingReference?: string;
    newFlightNumber?: string;
    newFlightDetails?: FlightData;
    bookingDetails?: BookingData;
    seatPreference?: 'window' | 'aisle' | 'middle';
    targetClass?: string;
  };
}> => {
  try {
    // Update context with any information from the user's message
    updateContextWithUserInfo(userMessage, conversationContext);

    // If we have pending questions, prioritize asking them
    if (conversationContext.requiredInfo.pendingQuestions.length > 0) {
      // Get the next question
      const nextQuestion = conversationContext.requiredInfo.pendingQuestions[0];
      conversationContext.requiredInfo.currentQuestion = nextQuestion;
      
      // Remove it from the pending questions
      conversationContext.requiredInfo.pendingQuestions.shift();
      
      // Format a friendly response that:
      // 1. Acknowledges the information we got (if any)
      // 2. Asks the next question
      let response = "";
      
      // Acknowledge information we've gathered
      const { travelDetails } = conversationContext.requiredInfo;
      if (travelDetails) {
        if (travelDetails.numPassengers) {
          response += `I understand you'll be traveling with ${travelDetails.numPassengers - 1} children. `;
        }
        if (travelDetails.departureCity) {
          response += `You'll be departing from ${travelDetails.departureCity}. `;
        }
        if (travelDetails.destinationCity) {
          response += `Your destination is ${travelDetails.destinationCity}. `;
        }
      }
      
      // Add the next question
      response += nextQuestion;
      
      // If this is about family travel, add some helpful context
      if (travelDetails?.numPassengers && travelDetails.numPassengers > 1) {
        if (nextQuestion.includes("special assistance")) {
          response += " Delta offers several family-friendly services including:";
          response += "\n- Priority boarding for families with young children";
          response += "\n- Stroller and car seat check-in";
          response += "\n- Family seating arrangements";
          response += "\n- Kid-friendly meal options";
        }
      }

      return {
        content: response,
        requiresHandoff: false
      };
    }

    // If we have all required information, proceed with normal processing
    const intent = analyzeIntent(userMessage);
    const contextData = {
      flights: conversationContext.lastSearchResults || [],
      selectedFlight: conversationContext.selectedFlight,
      recentlyMentionedFlights: Array.from(conversationContext.recentlyMentionedFlights.values()),
      recentlyMentionedBookings: Array.from(conversationContext.recentlyMentionedBookings.values()),
      userProfile: dataManager.getUserProfile(),
      travelDetails: conversationContext.requiredInfo.travelDetails,
      preferences: conversationContext.requiredInfo.preferences
    };

    // Add message to history
    messageHistory.push({ role: 'user', content: userMessage });

    // Get response from API
    const apiResponse = await callApiWithFallback(userMessage, contextData, messageHistory);
    
    // Parse the API response and extract action if present
    const { actionType, params } = parseAction(apiResponse.data.content);
    
    // Execute action if present
    let actionResult;
    if (actionType && params) {
      actionResult = await executeAction(actionType, params);
    }
    
    // Update message history with assistant's response
    messageHistory.push({ role: 'assistant', content: apiResponse.data.content });

    return {
      content: apiResponse.data.content,
      requiresHandoff: false,
      actionResult
    };
  } catch (error) {
    console.error('Error in getChatResponse:', error);
    return {
      content: "I apologize, but I'm having trouble processing your request right now. Could you please try again?",
      requiresHandoff: true
    };
  }
};

export const resetChatHistory = () => {
  messageHistory = [];
};