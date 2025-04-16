import { FlightData, SeatInfo } from '../../types/flight';

// List of airports with their codes
const airports = [
  { city: 'New York', code: 'JFK' },
  { city: 'London', code: 'LHR' },
  { city: 'Tokyo', code: 'NRT' },
  { city: 'Paris', code: 'CDG' },
  { city: 'Dubai', code: 'DXB' },
  { city: 'Los Angeles', code: 'LAX' },
  { city: 'Chicago', code: 'ORD' },
  { city: 'Singapore', code: 'SIN' },
  { city: 'Atlanta', code: 'ATL' },
  { city: 'Hong Kong', code: 'HKG' }
];

// Aircraft types with seat counts for each class
const aircraftTypes = [
  { 
    model: 'Boeing 777-300ER', 
    economy: 300, 
    business: 40, 
    first: 8 
  },
  { 
    model: 'Airbus A380', 
    economy: 420, 
    business: 60, 
    first: 12 
  },
  { 
    model: 'Boeing 787-9', 
    economy: 250, 
    business: 35, 
    first: 0 
  },
  { 
    model: 'Airbus A350-900', 
    economy: 280, 
    business: 40, 
    first: 6 
  },
  { 
    model: 'Boeing 737-800', 
    economy: 160, 
    business: 16, 
    first: 0 
  },
];

// Specific popular routes to ensure we have data for common searches
const popularRoutes = [
  { from: 'New York', to: 'London' },
  { from: 'London', to: 'New York' },
  { from: 'New York', to: 'Paris' },
  { from: 'Paris', to: 'New York' },
  { from: 'Los Angeles', to: 'Tokyo' },
  { from: 'Tokyo', to: 'Los Angeles' },
  { from: 'Atlanta', to: 'New York' },
  { from: 'New York', to: 'Atlanta' },
  { from: 'Chicago', to: 'Atlanta' },
  { from: 'Atlanta', to: 'Chicago' }
];

// Base prices for different routes (in USD)
const routePrices = {
  domestic: {
    base: 200,
    economy: { min: 150, max: 400 },
    comfortPlus: { min: 300, max: 600 },
    first: { min: 600, max: 1200 },
    deltaOne: { min: 800, max: 1500 }
  },
  international: {
    base: 500,
    economy: { min: 400, max: 1200 },
    comfortPlus: { min: 800, max: 1800 },
    first: { min: 1500, max: 3000 },
    deltaOne: { min: 2000, max: 4000 }
  }
};

// Helper to determine if a route is international
const isInternationalRoute = (departure: string, arrival: string): boolean => {
  const usAirports = ['New York', 'Los Angeles', 'Chicago', 'Atlanta'];
  const isDepartureUS = usAirports.includes(departure);
  const isArrivalUS = usAirports.includes(arrival);
  return isDepartureUS !== isArrivalUS;
};

// Calculate price based on various factors
const calculatePrice = (basePrice: number, classType: string, departureDate: Date): number => {
  const today = new Date();
  const daysUntilFlight = Math.ceil((departureDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Demand multiplier based on days until flight
  let demandMultiplier = 1;
  if (daysUntilFlight <= 3) {
    demandMultiplier = 1.5; // Last minute premium
  } else if (daysUntilFlight <= 7) {
    demandMultiplier = 1.3;
  } else if (daysUntilFlight <= 14) {
    demandMultiplier = 1.1;
  }
  
  // Weekend multiplier (Friday, Saturday, Sunday flights)
  const isWeekend = [5, 6, 0].includes(departureDate.getDay());
  const weekendMultiplier = isWeekend ? 1.2 : 1;
  
  // Season multiplier (summer and holidays)
  const month = departureDate.getMonth();
  const isHighSeason = (month >= 5 && month <= 7) || month === 11; // June-August or December
  const seasonMultiplier = isHighSeason ? 1.25 : 1;
  
  return Math.round(basePrice * demandMultiplier * weekendMultiplier * seasonMultiplier);
};

// Generate seats for a flight
const generateSeats = (count: number, classType: 'economy' | 'comfortPlus' | 'first' | 'deltaOne', isInternational: boolean, departureDate: Date): SeatInfo[] => {
  const seats: SeatInfo[] = [];
  const rows = Math.ceil(count / 6); // 6 seats per row for simplicity
  
  const priceRange = isInternational ? 
    routePrices.international[classType] : 
    routePrices.domestic[classType];
  
  const basePrice = (priceRange.min + priceRange.max) / 2;
  
  for (let row = 1; row <= rows; row++) {
    for (let position = 0; position < 6; position++) {
      if (seats.length >= count) break;
      
      const positionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
      const seatLetter = positionLetters[position];
      const seatNumber = `${row}${seatLetter}`;
      
      // Calculate price with variations
      const price = calculatePrice(basePrice, classType, departureDate);
      
      // Determine seat features
      const features: string[] = [];
      if (classType !== 'economy') features.push('Extra Legroom');
      if (classType === 'deltaOne') features.push('Lie-flat Bed', 'Premium Dining');
      if (position === 0 || position === 5) features.push('Window');
      if (position === 2 || position === 3) features.push('Aisle');
      
      // Some seats are already taken
      const status: 'available' | 'occupied' = Math.random() > 0.3 ? 'available' : 'occupied';
      
      seats.push({
        seatNumber,
        class: classType,
        status,
        price,
        features
      });
    }
  }
  
  return seats;
};

// Generate a single flight
export const generateFlight = (id: number, targetDate?: Date): FlightData => {
  let departure, arrival;
  
  // 70% chance of using a popular route
  if (Math.random() < 0.7) {
    const route = popularRoutes[Math.floor(Math.random() * popularRoutes.length)];
    departure = route.from;
    arrival = route.to;
  } else {
    // Random route
    const departureIndex = Math.floor(Math.random() * airports.length);
    let arrivalIndex;
    do {
      arrivalIndex = Math.floor(Math.random() * airports.length);
    } while (arrivalIndex === departureIndex);
    
    departure = airports[departureIndex].city;
    arrival = airports[arrivalIndex].city;
  }
  
  // Select aircraft
  const aircraft = aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)];
  
  // Generate flight time
  const now = new Date();
  const flightDate = targetDate || new Date(now);
  
  if (!targetDate) {
    // If no target date, generate for next 7 days
    flightDate.setDate(flightDate.getDate() + Math.floor(Math.random() * 7) + 1);
  }
  
  // Set random hour between 6 AM and 10 PM
  flightDate.setHours(6 + Math.floor(Math.random() * 16), Math.floor(Math.random() * 60), 0, 0);
  
  const isInternational = isInternationalRoute(departure, arrival);
  
  // Generate seats for each class with appropriate pricing
  const seats = {
    economy: generateSeats(aircraft.economy, 'economy', isInternational, flightDate),
    comfortPlus: generateSeats(Math.floor(aircraft.economy * 0.1), 'comfortPlus', isInternational, flightDate),
    first: generateSeats(Math.floor(aircraft.economy * 0.05), 'first', isInternational, flightDate),
    deltaOne: generateSeats(Math.floor(aircraft.economy * 0.03), 'deltaOne', isInternational, flightDate)
  };
  
  // Generate flight time (within the next 30 days)
  const flightTime = new Date(
    now.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000
  );
  
  // Generate random flight duration between 1 and 12 hours
  const durationHours = Math.floor(Math.random() * 11) + 1;
  const durationMinutes = Math.floor(Math.random() * 60);
  const duration = `${durationHours}h ${durationMinutes}m`;
  
  // Flight number format: Always use DL + 3-4 digits
  const airline = 'DL'; // Always Delta
  const flightNumber = `${airline}${1000 + id}`; // Consistent numbering
  
  // Flight status (90% on-time, 8% delayed, 2% cancelled)
  const statusRandom = Math.random();
  let status: 'on time' | 'delayed' | 'cancelled';
  let delayReason;
  
  if (statusRandom > 0.98) {
    status = 'cancelled';
    delayReason = 'Operational issues';
  } else if (statusRandom > 0.9) {
    status = 'delayed';
    const delayReasons = ['Weather conditions', 'Technical check', 'Late arrival of aircraft'];
    delayReason = delayReasons[Math.floor(Math.random() * delayReasons.length)];
  } else {
    status = 'on time';
  }
  
  // Generate gate number
  const gates = ['A', 'B', 'C', 'D'];
  const gate = `${gates[Math.floor(Math.random() * gates.length)]}${Math.floor(Math.random() * 20) + 1}`;
  
  return {
    flightNumber,
    departure,
    arrival,
    scheduledTime: flightTime.toISOString(),
    status,
    ...(delayReason && { delayReason }),
    aircraft: aircraft.model,
    seats,
    duration,
    gate
  };
};

// Generate specific flight from Atlanta to New York for a specific date
export const generateAtlantaToNewYorkFlights = (targetDate?: Date): FlightData[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day
  
  // If no date specified, use tomorrow
  const flightDate = targetDate || new Date(today);
  if (!targetDate) {
    flightDate.setDate(flightDate.getDate() + 1);
  }
  
  // Generate a set of flights for the target date
  return [1, 2, 3, 4, 5].map((id) => {
    const hours = [7, 10, 13, 16, 19][id - 1]; // Spread throughout the day
    const minutes = [22, 45, 15, 30, 0][id - 1];
    const flightTime = new Date(flightDate);
    flightTime.setHours(hours, minutes, 0);
    
    const aircraft = aircraftTypes[id % aircraftTypes.length];
    const duration = '2h 48m'; // Typical ATL-JFK flight time
    
    const flightNumber = `DL${6200 + id * 10}`; // Use DL prefix
    
    return {
      flightNumber,
      departure: 'Atlanta',
      arrival: 'New York',
      scheduledTime: flightTime.toISOString(),
      status: 'on time',
      aircraft: aircraft.model,
      seats: {
        economy: generateSeats(104, 'economy', false, flightDate),
        comfortPlus: generateSeats(20, 'comfortPlus', false, flightDate),
        first: generateSeats(0, 'first', false, flightDate),
        deltaOne: generateSeats(9, 'deltaOne', false, flightDate)
      },
      duration,
      gate: `B${id + 10}`
    };
  });
};

// Generate New York to Atlanta flights for a specific date
export const generateNewYorkToAtlantaFlights = (targetDate?: Date): FlightData[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day
  
  // If no date specified, use tomorrow
  const flightDate = targetDate || new Date(today);
  if (!targetDate) {
    flightDate.setDate(flightDate.getDate() + 1);
  }
  
  // Generate a set of flights for the target date
  return [1, 2, 3, 4, 5].map((id) => {
    const hours = [6, 9, 12, 15, 18][id - 1]; // Spread throughout the day
    const minutes = [30, 15, 45, 0, 30][id - 1];
    const flightTime = new Date(flightDate);
    flightTime.setHours(hours, minutes, 0);
    
    const aircraft = aircraftTypes[id % aircraftTypes.length];
    const duration = '2h 35m'; // Typical JFK-ATL flight time
    
    const flightNumber = `DL${6300 + id * 10}`; // Use DL prefix
    
    return {
      flightNumber,
      departure: 'New York',
      arrival: 'Atlanta',
      scheduledTime: flightTime.toISOString(),
      status: 'on time',
      aircraft: aircraft.model,
      seats: {
        economy: generateSeats(104, 'economy', false, flightDate),
        comfortPlus: generateSeats(20, 'comfortPlus', false, flightDate),
        first: generateSeats(0, 'first', false, flightDate),
        deltaOne: generateSeats(9, 'deltaOne', false, flightDate)
      },
      duration,
      gate: `A${id + 10}`
    };
  });
};

// Generate a batch of random flights
export const generateFlights = (count: number, targetDate?: Date): FlightData[] => {
  const flights: FlightData[] = [];
  
  // Add specific route flights first
  flights.push(...generateAtlantaToNewYorkFlights(targetDate));
  flights.push(...generateNewYorkToAtlantaFlights(targetDate));
  
  // Generate remaining random flights
  for (let i = flights.length; i < count; i++) {
    const flight = generateFlight(i, targetDate);
    
    // If target date specified, adjust the flight time to that date but keep the hour/minute
    if (targetDate) {
      const currentFlightTime = new Date(flight.scheduledTime);
      const adjustedFlightTime = new Date(targetDate);
      adjustedFlightTime.setHours(currentFlightTime.getHours());
      adjustedFlightTime.setMinutes(currentFlightTime.getMinutes());
      flight.scheduledTime = adjustedFlightTime.toISOString();
    }
    
    flights.push(flight);
  }
  
  return flights;
}; 