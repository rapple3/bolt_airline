import { dataManager } from './dataManager';

// Types for our action system
export type ActionType = 
  | 'BOOK_FLIGHT' 
  | 'CANCEL_BOOKING' 
  | 'CHANGE_FLIGHT' 
  | 'CHANGE_SEAT'
  | 'CHECK_IN'
  | 'TRACK_BAGGAGE'
  | 'SEARCH_FLIGHTS';

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
}

// Parse an action from the AI response
export const parseAction = (aiResponse: string): { 
  actionType?: ActionType; 
  params?: Record<string, string>;
  content: string;
} => {
  console.log("Parsing action from:", aiResponse?.substring(0, 50));
  
  // Check if the response is a valid string
  if (!aiResponse || typeof aiResponse !== 'string') {
    console.warn("Invalid AI response - not a string:", aiResponse);
    return { content: aiResponse || "" };
  }
  
  // First check for action at the beginning (most common case)
  const startActionMatch = aiResponse.match(/^\s*\[ACTION:([A-Z_]+)\](.*?)\[\/ACTION\]/s);
  
  if (startActionMatch) {
    console.log("Found action at start:", startActionMatch[1]);
    const actionType = startActionMatch[1] as ActionType;
    const paramsString = startActionMatch[2].trim();
    const content = aiResponse.replace(startActionMatch[0], '').trim();
    
    // Parse parameters if they exist
    const params: Record<string, string> = {};
    const paramMatches = paramsString.matchAll(/([A-Za-z_]+)="([^"]*)"/g);
    
    for (const match of paramMatches) {
      params[match[1]] = match[2];
    }
    
    console.log("Parsed parameters:", Object.keys(params).join(", "));
    return { actionType, params, content };
  }
  
  // Fallback to check for actions anywhere in the message
  const actionMatch = aiResponse.match(/\[ACTION:([A-Z_]+)\](.*?)\[\/ACTION\]/s);
  
  if (actionMatch) {
    console.warn("Found action but NOT at start of message - this may cause issues:", actionMatch[1]);
    const actionType = actionMatch[1] as ActionType;
    const paramsString = actionMatch[2].trim();
    const content = aiResponse.replace(actionMatch[0], '').trim();
    
    // Parse parameters if they exist
    const params: Record<string, string> = {};
    const paramMatches = paramsString.matchAll(/([A-Za-z_]+)="([^"]*)"/g);
    
    for (const match of paramMatches) {
      params[match[1]] = match[2];
    }
    
    return { actionType, params, content };
  }
  
  // No action found, return original content
  console.log("No action found in response");
  return { content: aiResponse };
};

// Execute the action based on type and parameters
export const executeAction = async (
  actionType: ActionType, 
  params: Record<string, string>
): Promise<ActionResult> => {
  switch (actionType) {
    case 'BOOK_FLIGHT':
      return bookFlight(params);
    
    case 'CANCEL_BOOKING':
      return cancelBooking(params);
    
    case 'CHANGE_FLIGHT':
      return changeFlight(params);
    
    case 'CHANGE_SEAT':
      return changeSeat(params);
      
    case 'CHECK_IN':
      return checkIn(params);
      
    case 'TRACK_BAGGAGE':
      return trackBaggage(params);
      
    case 'SEARCH_FLIGHTS':
      return searchFlights(params);
    
    default:
      return {
        success: false,
        message: `Unknown action type: ${actionType}`
      };
  }
};

// Function to search for available flights
const searchFlights = (params: Record<string, string>): ActionResult => {
  const { from, to, date } = params;
  
  if (!from || !to) {
    return {
      success: false,
      message: 'Missing required parameters: from and to cities'
    };
  }
  
  try {
    // Get all available flights
    const allFlights = dataManager.getFlights();
    
    // Case insensitive partial matching for city names
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();
    
    // Filter flights based on requested parameters
    let filteredFlights = allFlights.filter(flight => {
      const departureMatch = flight.departure.toLowerCase().includes(fromLower);
      const arrivalMatch = flight.arrival.toLowerCase().includes(toLower);
      
      const matchesRoute = departureMatch && arrivalMatch;
      
      if (!date) {
        return matchesRoute;
      }
      
      // Enhanced date parsing
      const flightDate = new Date(flight.scheduledTime);
      let parsedDate: Date | null = null;
      
      // Handle special date terms
      const dateLower = date.toLowerCase();
      if (dateLower === 'today') {
        parsedDate = new Date();
      } else if (dateLower === 'tomorrow') {
        parsedDate = new Date();
        parsedDate.setDate(parsedDate.getDate() + 1);
      } else if (dateLower.includes('next')) {
        // Handle "next tuesday", etc.
        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        for (let i = 0; i < days.length; i++) {
          if (dateLower.includes(days[i])) {
            const today = new Date();
            const dayOfWeek = i;
            const currentDay = today.getDay();
            let daysToAdd = dayOfWeek - currentDay;
            if (daysToAdd <= 0) daysToAdd += 7; // Next week if today or past day this week
            parsedDate = new Date();
            parsedDate.setDate(parsedDate.getDate() + daysToAdd);
            break;
          }
        }
      } else {
        // Try standard date format
        parsedDate = new Date(date);
        // If invalid, don't filter by date
        if (isNaN(parsedDate.getTime())) {
          return matchesRoute;
        }
      }
      
      // If we successfully parsed a date, compare only the date portion
      if (parsedDate) {
        return matchesRoute && 
               flightDate.getFullYear() === parsedDate.getFullYear() &&
               flightDate.getMonth() === parsedDate.getMonth() &&
               flightDate.getDate() === parsedDate.getDate();
      }
      
      // Default to matching route only
      return matchesRoute;
    });
    
    // If no flights found, generate some flights for this route
    if (filteredFlights.length === 0) {
      // Parse the search date
      let searchDate: Date;
      const dateLower = date?.toLowerCase() || '';
      
      if (dateLower === 'today') {
        searchDate = new Date();
      } else if (dateLower === 'tomorrow') {
        searchDate = new Date();
        searchDate.setDate(searchDate.getDate() + 1);
      } else if (dateLower.includes('next')) {
        searchDate = new Date();
        // Default to next week if not specific
        searchDate.setDate(searchDate.getDate() + 7);
        
        // Check for specific day
        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        for (let i = 0; i < days.length; i++) {
          if (dateLower.includes(days[i])) {
            const dayOfWeek = i;
            const currentDay = searchDate.getDay();
            let daysToAdd = dayOfWeek - currentDay;
            if (daysToAdd <= 0) daysToAdd += 7;
            searchDate.setDate(searchDate.getDate() + daysToAdd);
            break;
          }
        }
      } else if (date) {
        // Try to parse the given date
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          searchDate = parsedDate;
        } else {
          // Default to tomorrow if date parsing fails
          searchDate = new Date();
          searchDate.setDate(searchDate.getDate() + 1);
        }
      } else {
        // Default to tomorrow if no date provided
        searchDate = new Date();
        searchDate.setDate(searchDate.getDate() + 1);
      }
      
      // Generate 3-5 flights between the requested cities
      const numFlights = Math.floor(Math.random() * 3) + 3;
      const generatedFlights: any[] = [];
      
      // Generate flights distributed throughout the day
      const airlines = ['AA', 'DL', 'UA', 'B6', 'WN', 'AS'];
      const departureHours = [7, 9, 11, 13, 15, 17, 19];
      
      for (let i = 0; i < numFlights; i++) {
        // Create a copy of searchDate for this flight
        const flightDate = new Date(searchDate);
        
        // Set a flight time
        const hourIndex = Math.floor(i * (departureHours.length / numFlights));
        flightDate.setHours(departureHours[hourIndex], Math.floor(Math.random() * 60), 0);
        
        // Generate flight duration (for this route) - between 1-4 hours
        const durationHours = 1 + Math.floor(Math.random() * 3);
        const durationMinutes = Math.floor(Math.random() * 60);
        const duration = `${durationHours}h ${durationMinutes}m`;
        
        // Select an airline and create flight number
        const airline = airlines[Math.floor(Math.random() * airlines.length)];
        const flightNumber = `${airline}${1000 + Math.floor(Math.random() * 9000)}`;
        
        // Generate available seats - make sure we have plenty of available seats
        const economySeats = 50 + Math.floor(Math.random() * 50);
        const businessSeats = 15 + Math.floor(Math.random() * 15);
        const firstClassSeats = 5 + Math.floor(Math.random() * 5);
        
        const generateSeats = (count: number, classType: 'economy' | 'business' | 'first'): any[] => {
          const seats = [];
          const basePrice = classType === 'economy' ? 200 : classType === 'business' ? 800 : 1500;
          
          for (let i = 0; i < count; i++) {
            const row = Math.floor(i / 6) + 1;
            const col = ['A', 'B', 'C', 'D', 'E', 'F'][i % 6];
            
            // Make at least 90% of seats available to avoid "fully booked" issues
            const status = Math.random() > 0.1 ? 'available' : 'occupied';
            
            seats.push({
              seatNumber: `${row}${col}`,
              class: classType,
              status,
              price: Math.round(basePrice * (0.9 + Math.random() * 0.4)),
              features: classType !== 'economy' ? ['Extra Legroom'] : []
            });
          }
          
          return seats;
        };
        
        // Create a new flight with these properties
        const newFlight = {
          flightNumber,
          airline,
          departure: from,
          arrival: to,
          scheduledTime: flightDate.toISOString(),
          status: 'On Time',
          duration,
          aircraft: `Boeing ${737 + Math.floor(Math.random() * 40) * 10}`,
          gate: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 20) + 1}`,
          terminal: Math.floor(Math.random() * 5) + 1,
          seats: {
            economy: generateSeats(economySeats, 'economy'),
            business: generateSeats(businessSeats, 'business'),
            first: generateSeats(firstClassSeats, 'first')
          }
        };
        
        generatedFlights.push(newFlight);
      }
      
      // Add generated flights to the database
      if (generatedFlights.length > 0) {
        // Get all flights and check which flight numbers already exist
        const existingFlights = dataManager.getFlights();
        const existingFlightNumbers = new Set(existingFlights.map(f => f.flightNumber));
        
        // Only add flights that don't already exist
        const newFlights = generatedFlights.filter(f => !existingFlightNumbers.has(f.flightNumber));
        
        // Update the flights list in dataManager with all flights (existing + new)
        dataManager.setFlights([...existingFlights, ...newFlights]);
        
        // Update our filtered flights list to include the generated flights
        filteredFlights = generatedFlights;
      }
    }
    
    // Limit to max 5 flights to not overwhelm the user
    const flightsToShow = filteredFlights.slice(0, 5);
    
    return {
      success: true,
      message: `Found ${flightsToShow.length} flights from ${from} to ${to}${date ? ` on ${date}` : ''}`,
      data: flightsToShow
    };
  } catch (error) {
    console.error('Error searching flights:', error);
    return {
      success: false,
      message: 'An error occurred while searching for flights'
    };
  }
};

// Individual action handlers
const bookFlight = (params: Record<string, string>): ActionResult => {
  const { flightNumber, seatClass } = params;
  
  if (!flightNumber || !seatClass) {
    return {
      success: false,
      message: 'Missing required parameters: flightNumber and seatClass'
    };
  }
  
  try {
    const validClass = seatClass as 'economy' | 'business' | 'first';
    const success = dataManager.createBooking(flightNumber, validClass);
    
    if (success) {
      return {
        success: true,
        message: `Successfully booked flight ${flightNumber} in ${validClass} class`,
        data: {
          flightNumber,
          seatClass: validClass
        }
      };
    } else {
      return {
        success: false,
        message: `Unable to book flight ${flightNumber}. The flight may be full or unavailable.`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error booking flight: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

const cancelBooking = (params: Record<string, string>): ActionResult => {
  const { bookingReference } = params;
  
  if (!bookingReference) {
    return {
      success: false,
      message: 'Missing required parameter: bookingReference'
    };
  }
  
  try {
    const success = dataManager.cancelBooking(bookingReference);
    
    if (success) {
      return {
        success: true,
        message: `Successfully cancelled booking ${bookingReference}`,
        data: {
          bookingReference
        }
      };
    } else {
      return {
        success: false,
        message: `Unable to cancel booking ${bookingReference}. The booking may not exist or is already cancelled.`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error cancelling booking: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

const changeFlight = (params: Record<string, string>): ActionResult => {
  const { bookingReference, newFlightNumber } = params;
  
  if (!bookingReference || !newFlightNumber) {
    return {
      success: false,
      message: 'Missing required parameters: bookingReference and newFlightNumber'
    };
  }
  
  try {
    const success = dataManager.changeFlight(bookingReference, newFlightNumber);
    
    if (success) {
      return {
        success: true,
        message: `Successfully changed booking ${bookingReference} to flight ${newFlightNumber}`,
        data: {
          bookingReference,
          newFlightNumber
        }
      };
    } else {
      return {
        success: false,
        message: `Unable to change flight for booking ${bookingReference}. The booking or flight may not exist.`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error changing flight: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

const changeSeat = (params: Record<string, string>): ActionResult => {
  const { bookingReference, newSeatNumber } = params;
  
  if (!bookingReference || !newSeatNumber) {
    return {
      success: false,
      message: 'Missing required parameters: bookingReference and newSeatNumber'
    };
  }
  
  try {
    const success = dataManager.changeSeat(bookingReference, newSeatNumber);
    
    if (success) {
      return {
        success: true,
        message: `Successfully changed seat for booking ${bookingReference} to seat ${newSeatNumber}`,
        data: {
          bookingReference,
          newSeatNumber
        }
      };
    } else {
      return {
        success: false,
        message: `Unable to change seat for booking ${bookingReference}. The seat may not be available.`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error changing seat: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

const checkIn = (params: Record<string, string>): ActionResult => {
  const { bookingReference } = params;
  
  if (!bookingReference) {
    return {
      success: false,
      message: 'Missing required parameter: bookingReference'
    };
  }
  
  try {
    // For now, simulate check-in logic
    // We could add a proper checkIn method to dataManager later
    const bookings = dataManager.getBookings();
    const booking = bookings.find(b => b.bookingReference === bookingReference);
    
    if (!booking) {
      return {
        success: false,
        message: `Booking ${bookingReference} not found`
      };
    }
    
    dataManager.logAction('Checked In', { bookingReference });
    
    // Simulate checked-in state
    // In a real implementation, we would modify the booking
    return {
      success: true,
      message: `Successfully checked in for booking ${bookingReference}`,
      data: {
        bookingReference,
        flightNumber: booking.flightNumber,
        seat: booking.seatInfo?.seatNumber
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error checking in: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

const trackBaggage = (params: Record<string, string>): ActionResult => {
  const { bookingReference } = params;
  
  if (!bookingReference) {
    return {
      success: false,
      message: 'Missing required parameter: bookingReference'
    };
  }
  
  try {
    // Simulate baggage tracking
    // In a real implementation, we would query a baggage system
    const bookings = dataManager.getBookings();
    const booking = bookings.find(b => b.bookingReference === bookingReference);
    
    if (!booking) {
      return {
        success: false,
        message: `Booking ${bookingReference} not found`
      };
    }
    
    // Generate a random baggage status for simulation
    const statuses = ['Checked In', 'In Transit', 'Loaded on Aircraft', 'Arrived at Destination', 'Ready for Pickup'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    dataManager.logAction('Tracked Baggage', { bookingReference, status: randomStatus });
    
    return {
      success: true,
      message: `Baggage status for booking ${bookingReference}: ${randomStatus}`,
      data: {
        bookingReference,
        flightNumber: booking.flightNumber,
        status: randomStatus
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Error tracking baggage: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}; 