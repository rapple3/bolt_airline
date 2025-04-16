import { dataManager } from './dataManager';
import { generateAtlantaToNewYorkFlights, generateNewYorkToAtlantaFlights } from '../data/mock/flights';
import { FlightData } from '../types';

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
    // Parse the search date first
    let searchDate: Date | null = null;
    const dateLower = date?.toLowerCase() || '';
    const currentDate = dataManager.getCurrentDate();
    
    if (dateLower === 'today') {
      searchDate = new Date(currentDate);
    } else if (dateLower === 'tomorrow') {
      searchDate = new Date(currentDate);
      searchDate.setDate(searchDate.getDate() + 1);
    } else if (dateLower.includes('next')) {
      // Handle "next tuesday", etc.
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      for (let i = 0; i < days.length; i++) {
        if (dateLower.includes(days[i])) {
          searchDate = new Date(currentDate);
          const dayOfWeek = i;
          const currentDay = searchDate.getDay();
          let daysToAdd = dayOfWeek - currentDay;
          if (daysToAdd <= 0) daysToAdd += 7; // Next week if today or past day this week
          searchDate.setDate(searchDate.getDate() + daysToAdd);
          break;
        }
      }
    } else if (date) {
      // Try standard date format
      searchDate = new Date(date);
      if (isNaN(searchDate.getTime())) {
        searchDate = null;
      }
    }

    // If we have a valid search date, refresh flights for that date
    if (searchDate) {
      dataManager.refreshFlightsForDate(searchDate);
    }
    
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
      
      if (!searchDate) {
        return matchesRoute;
      }
      
      // Compare only the date portion
      const flightDate = new Date(flight.scheduledTime);
      return matchesRoute && 
             flightDate.getFullYear() === searchDate.getFullYear() &&
             flightDate.getMonth() === searchDate.getMonth() &&
             flightDate.getDate() === searchDate.getDate();
    });
    
    // If no flights found, try to generate specific route flights
    if (filteredFlights.length === 0 && searchDate) {
      let newFlights: FlightData[] = [];
      // Generate route-specific flights
      if (fromLower.includes('atlanta') && toLower.includes('new york')) {
        newFlights = generateAtlantaToNewYorkFlights(searchDate);
      } else if (fromLower.includes('new york') && toLower.includes('atlanta')) {
        newFlights = generateNewYorkToAtlantaFlights(searchDate);
      }
      if (newFlights.length > 0) {
        dataManager.setFlights([...allFlights, ...newFlights]);
        filteredFlights = newFlights;
      }
    }
    
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
        
        // Generate a mocked flight with economy, comfortPlus, first, and deltaOne seats
        const economySeats = 100 + Math.floor(Math.random() * 50);
        const comfortPlusSeats = 20 + Math.floor(Math.random() * 20);
        const firstSeats = 10 + Math.floor(Math.random() * 10);
        const deltaOneSeats = Math.random() > 0.5 ? (5 + Math.floor(Math.random() * 10)) : 0;
        
        const generateSeats = (count: number, classType: 'economy' | 'comfortPlus' | 'first' | 'deltaOne'): any[] => {
          const seats = [];
          const basePrice = classType === 'economy' ? 200 : 
                          classType === 'comfortPlus' ? 350 : 
                          classType === 'first' ? 800 : 1500;
          
          // Create seat entries
          for (let i = 0; i < count; i++) {
            const row = Math.floor(i / 6) + 1;
            const col = String.fromCharCode(65 + (i % 6));
            
            // 25% of seats are occupied
            const isOccupied = Math.random() < 0.25;
            
            // Generate features based on class
            const features: string[] = [];
            if (classType !== 'economy') features.push('Extra Legroom');
            if (classType === 'deltaOne') features.push('Lie-flat Bed', 'Premium Dining');
            if ((i % 6) === 0 || (i % 6) === 5) features.push('Window');
            if ((i % 6) === 2 || (i % 6) === 3) features.push('Aisle');
            
            seats.push({
              seatNumber: `${row}${col}`,
              class: classType,
              status: isOccupied ? 'occupied' : 'available',
              price: basePrice + Math.floor(Math.random() * 50),
              features: features
            });
          }
          
          return seats;
        };
        
        // Create a new flight with these properties that match FlightData interface
        const newFlight: FlightData = {
          flightNumber,
          departure: from,
          arrival: to,
          scheduledTime: flightDate.toISOString(),
          status: 'on time', // lowercase to match the FlightData interface
          aircraft: `Boeing ${737 + Math.floor(Math.random() * 40) * 10}`,
          duration,
          gate: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 20) + 1}`,
          seats: {
            economy: generateSeats(economySeats, 'economy'),
            comfortPlus: generateSeats(comfortPlusSeats, 'comfortPlus'),
            first: generateSeats(firstSeats, 'first'),
            deltaOne: generateSeats(deltaOneSeats, 'deltaOne')
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
    
    // Update the format for available classes in the output
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
  
  if (!flightNumber) {
    return {
      success: false,
      message: 'Missing required parameter: flightNumber'
    };
  }
  
  if (!seatClass || !['economy', 'comfortPlus', 'first', 'deltaOne'].includes(seatClass)) {
    return {
      success: false,
      message: 'Invalid seat class. Please choose from: economy, comfortPlus, first, or deltaOne'
    };
  }
  
  try {
    // Validate flight exists
    const flight = dataManager.getFlight(flightNumber);
    if (!flight) {
      return {
        success: false,
        message: `Flight ${flightNumber} not found`
      };
    }
    
    // Create booking
    const validClass = seatClass as 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
    const bookingCreated = dataManager.createBooking(flightNumber, validClass);
    
    if (bookingCreated) {
      return {
        success: true,
        message: `Booking confirmed for flight ${flightNumber} in ${seatClass} class`
      };
    } else {
      return {
        success: false,
        message: `Unable to book flight ${flightNumber}. Please try again.`
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Error booking flight: ${error.message}`
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
  const { bookingReference, newSeatNumber, seatPreference, targetClass } = params;
  
  if (!bookingReference) {
    return {
      success: false,
      message: 'Missing required parameter: bookingReference'
    };
  }
  
  try {
    // Get the booking
    const bookings = dataManager.getBookings();
    const booking = bookings.find(b => b.bookingReference === bookingReference);
    
    if (!booking) {
      return {
        success: false,
        message: `Booking ${bookingReference} not found`
      };
    }
    
    // If a specific seat number is provided, try to change to that seat
    if (newSeatNumber) {
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
    } 
    // If seat preference and/or target class are provided, return them for the UI to handle
    else if (seatPreference || targetClass) {
      return {
        success: true,
        message: `Seat change options for booking ${bookingReference}`,
        data: {
          bookingReference,
          bookingDetails: booking,
          seatPreference: seatPreference || 'any',
          targetClass: targetClass || booking.class
        }
      };
    } else {
      return {
        success: false,
        message: 'Missing seat details: Please provide either newSeatNumber or seatPreference'
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