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

// Generate seats for a flight
const generateSeats = (count: number, classType: 'economy' | 'business' | 'first'): SeatInfo[] => {
  const seats: SeatInfo[] = [];
  const rows = Math.ceil(count / 6); // 6 seats per row for simplicity
  
  const basePrice = classType === 'economy' ? 200 : classType === 'business' ? 800 : 1500;
  
  for (let row = 1; row <= rows; row++) {
    for (let position = 0; position < 6; position++) {
      if (seats.length >= count) break;
      
      const positionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
      const seatLetter = positionLetters[position];
      const seatNumber = `${row}${seatLetter}`;
      
      // Calculate price with some variation
      const priceVariation = Math.random() * 0.3 + 0.85; // 0.85 to 1.15 multiplier
      const price = Math.round(basePrice * priceVariation);
      
      // Determine seat features
      const features: string[] = [];
      if (classType !== 'economy') features.push('Extra Legroom');
      if (classType === 'first') features.push('Lie-flat Bed', 'Premium Dining');
      if (position === 0 || position === 5) features.push('Window');
      
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
export const generateFlight = (id: number): FlightData => {
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
    } while (arrivalIndex === departureIndex); // Ensure different airports
    
    departure = airports[departureIndex].city;
    arrival = airports[arrivalIndex].city;
  }
  
  // Select aircraft
  const aircraft = aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)];
  
  // Generate flight time (within the next 30 days)
  const now = new Date();
  const flightTime = new Date(
    now.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000
  );
  
  // Generate random flight duration between 1 and 12 hours
  const durationHours = Math.floor(Math.random() * 11) + 1;
  const durationMinutes = Math.floor(Math.random() * 60);
  const duration = `${durationHours}h ${durationMinutes}m`;
  
  // Flight number format: 2 letters + 3-4 digits
  const airlines = ['BA', 'AA', 'UA', 'DL', 'LH', 'AF', 'SQ', 'EK'];
  const airline = airlines[Math.floor(Math.random() * airlines.length)];
  const flightNumber = `${airline}${100 + id}`;
  
  // Generate seats for each class
  const economySeats = generateSeats(aircraft.economy, 'economy');
  const businessSeats = generateSeats(aircraft.business, 'business');
  const firstSeats = aircraft.first > 0 ? generateSeats(aircraft.first, 'first') : [];
  
  // Flight status (90% on-time, 8% delayed, 2% cancelled)
  const statusRandom = Math.random();
  let status: 'on-time' | 'delayed' | 'cancelled' = 'on-time';
  let delayReason;
  
  if (statusRandom > 0.98) {
    status = 'cancelled';
    delayReason = 'Operational issues';
  } else if (statusRandom > 0.9) {
    status = 'delayed';
    const delayReasons = ['Weather conditions', 'Technical check', 'Late arrival of aircraft'];
    delayReason = delayReasons[Math.floor(Math.random() * delayReasons.length)];
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
    seats: {
      economy: economySeats,
      business: businessSeats,
      first: firstSeats
    },
    duration,
    gate
  };
};

// Generate specific flight from Atlanta to New York (for today)
export const generateAtlantaToNewYorkFlights = (): FlightData[] => {
  const today = new Date();
  // Generate a set of flights for today
  return [1, 2, 3, 4].map((id) => {
    const hours = [8, 11, 14, 18][id - 1]; // Morning, mid-day, afternoon, evening flights
    const flightTime = new Date(today);
    flightTime.setHours(hours, [0, 30, 15, 45][id - 1], 0);
    
    const aircraft = aircraftTypes[id % aircraftTypes.length];
    const duration = '2h 15m'; // Typical ATL-JFK flight time
    
    const airlines = ['DL', 'AA', 'UA', 'B6'];
    const flightNumber = `${airlines[id - 1]}${1000 + id * 111}`;
    
    return {
      flightNumber,
      departure: 'Atlanta',
      arrival: 'New York',
      scheduledTime: flightTime.toISOString(),
      status: 'on-time',
      aircraft: aircraft.model,
      seats: {
        economy: generateSeats(aircraft.economy, 'economy'),
        business: generateSeats(aircraft.business, 'business'),
        first: aircraft.first > 0 ? generateSeats(aircraft.first, 'first') : []
      },
      duration,
      gate: `${['A', 'B', 'C', 'D'][id - 1]}${id + 10}`
    };
  });
};

// Generate flights from New York to Atlanta for a future date
export const generateNewYorkToAtlantaFlights = (futureDate: Date): FlightData[] => {
  return [1, 2, 3].map((id) => {
    const hours = [7, 12, 17][id - 1]; // Morning, mid-day, evening flights
    const flightTime = new Date(futureDate);
    flightTime.setHours(hours, [20, 0, 30][id - 1], 0);
    
    const aircraft = aircraftTypes[(id + 1) % aircraftTypes.length];
    const duration = '2h 30m'; // Typical JFK-ATL flight time
    
    const airlines = ['DL', 'AA', 'UA'];
    const flightNumber = `${airlines[id - 1]}${2000 + id * 111}`;
    
    return {
      flightNumber,
      departure: 'New York',
      arrival: 'Atlanta',
      scheduledTime: flightTime.toISOString(),
      status: 'on-time',
      aircraft: aircraft.model,
      seats: {
        economy: generateSeats(aircraft.economy, 'economy'),
        business: generateSeats(aircraft.business, 'business'),
        first: aircraft.first > 0 ? generateSeats(aircraft.first, 'first') : []
      },
      duration,
      gate: `${['E', 'F', 'G'][id - 1]}${id + 5}`
    };
  });
};

// Generate multiple flights
export const generateFlights = (count: number): FlightData[] => {
  // Start with guaranteed ATL-JFK and JFK-ATL routes
  const specialFlights = [
    ...generateAtlantaToNewYorkFlights(),
    ...generateNewYorkToAtlantaFlights(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // 1 week from now
  ];
  
  // Then add random flights to reach the desired count
  const randomFlights = Array.from({ length: Math.max(0, count - specialFlights.length) }, (_, i) => 
    generateFlight(i + 1)
  );
  
  return [...specialFlights, ...randomFlights];
}; 