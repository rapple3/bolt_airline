import { FlightData, BookingData, LoyaltyData, UserProfile, SeatInfo } from '../types';

// Cities with airport codes
const airports = [
  { city: 'New York', code: 'JFK' },
  { city: 'London', code: 'LHR' },
  { city: 'Paris', code: 'CDG' },
  { city: 'Dubai', code: 'DXB' },
  { city: 'Tokyo', code: 'HND' },
  { city: 'Singapore', code: 'SIN' },
  { city: 'Los Angeles', code: 'LAX' },
  { city: 'Sydney', code: 'SYD' },
  { city: 'Hong Kong', code: 'HKG' },
  { city: 'Delhi', code: 'DEL' },
  { city: 'Frankfurt', code: 'FRA' },
  { city: 'Amsterdam', code: 'AMS' },
];

// Aircraft types
const aircraftTypes = [
  { name: 'Boeing 787-9', economySeats: 180, businessSeats: 28, firstSeats: 8 },
  { name: 'Airbus A320neo', economySeats: 150, businessSeats: 12, firstSeats: 0 },
  { name: 'Boeing 777-300ER', economySeats: 210, businessSeats: 40, firstSeats: 8 },
  { name: 'Airbus A350-900', economySeats: 190, businessSeats: 32, firstSeats: 6 },
  { name: 'Airbus A380-800', economySeats: 320, businessSeats: 60, firstSeats: 12 },
];

// Helper function to generate seat layout
const generateSeats = (
  economyCount: number,
  businessCount: number,
  firstCount: number
): { economy: SeatInfo[]; business: SeatInfo[]; first: SeatInfo[] } => {
  const generateSeatRange = (
    start: number,
    count: number,
    className: 'economy' | 'business' | 'first'
  ): SeatInfo[] => {
    return Array.from({ length: count }, (_, i) => {
      const row = Math.floor(i / 6) + start;
      const col = String.fromCharCode(65 + (i % 6));
      return {
        seatNumber: `${row}${col}`,
        class: className,
        status: Math.random() > 0.7 ? 'occupied' : 'available',
        price: className === 'economy' ? 100 : className === 'business' ? 250 : 500,
        features: className === 'economy' 
          ? ['Standard Legroom', 'Regular Service']
          : className === 'business'
          ? ['Extra Legroom', 'Priority Service', 'Lounge Access']
          : ['Suite', 'Full-Flat Bed', 'Premium Service', 'Lounge Access']
      };
    });
  };

  return {
    economy: generateSeatRange(20, economyCount, 'economy'),
    business: generateSeatRange(10, businessCount, 'business'),
    first: generateSeatRange(1, firstCount, 'first')
  };
};

// Generate a random date within the range
const getRandomDate = (startDate: Date, endDate: Date): Date => {
  return new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
};

// Format date to ISO string
const formatDate = (date: Date): string => date.toISOString();

// Format date to YYYY-MM-DD
const formatShortDate = (date: Date): string => date.toISOString().split('T')[0];

// Generate random duration string (e.g., "5h 45m")
const generateDuration = (): string => {
  const hours = Math.floor(Math.random() * 12) + 1;
  const minutes = Math.floor(Math.random() * 12) * 5;
  return `${hours}h ${minutes}m`;
};

// Generate random gate
const generateGate = (): string => {
  const terminal = String.fromCharCode(65 + Math.floor(Math.random() * 4));
  const gateNumber = Math.floor(Math.random() * 30) + 1;
  return `${terminal}${gateNumber}`;
};

// Generate random flight status
const generateFlightStatus = (): { status: 'on-time' | 'delayed' | 'cancelled', delayReason?: string } => {
  const rand = Math.random();
  if (rand > 0.8) {
    const delayReasons = [
      'Weather conditions',
      'Operational issues',
      'Air traffic control',
      'Technical maintenance',
      'Crew scheduling',
    ];
    return { status: 'delayed', delayReason: delayReasons[Math.floor(Math.random() * delayReasons.length)] };
  } else if (rand > 0.95) {
    return { status: 'cancelled' };
  } else {
    return { status: 'on-time' };
  }
};

// Generate a flight
const generateFlight = (id: number, date?: Date): FlightData => {
  const departureIndex = Math.floor(Math.random() * airports.length);
  let arrivalIndex = Math.floor(Math.random() * airports.length);
  while (arrivalIndex === departureIndex) {
    arrivalIndex = Math.floor(Math.random() * airports.length);
  }
  
  const departure = airports[departureIndex];
  const arrival = airports[arrivalIndex];
  const aircraft = aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)];
  
  const flightDate = date || getRandomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const { status, delayReason } = generateFlightStatus();
  
  return {
    flightNumber: `AI${100 + id}`,
    departure: `${departure.city} (${departure.code})`,
    arrival: `${arrival.city} (${arrival.code})`,
    scheduledTime: formatDate(flightDate),
    status,
    ...(delayReason && { delayReason }),
    aircraft: aircraft.name,
    seats: generateSeats(aircraft.economySeats, aircraft.businessSeats, aircraft.firstSeats),
    duration: generateDuration(),
    gate: generateGate(),
  };
};

// Generate a random seat from a flight
const getRandomSeat = (flight: FlightData, seatClass: 'economy' | 'business' | 'first'): SeatInfo => {
  const availableSeats = flight.seats[seatClass].filter(seat => seat.status === 'available');
  if (availableSeats.length === 0) {
    return flight.seats[seatClass][0]; // Just return any seat if none available
  }
  return { ...availableSeats[Math.floor(Math.random() * availableSeats.length)], status: 'occupied' };
};

// Customer names
const customerNames = [
  'John Smith',
  'Emma Wilson',
  'Michael Johnson',
  'Sarah Lee',
  'David Chen',
  'Maria Garcia',
  'James Brown',
  'Olivia Davis',
  'Robert Taylor',
  'Sophia Martinez',
];

// Generate a customer
const generateCustomer = (id: number): { id: string, name: string, email: string } => {
  const name = customerNames[id % customerNames.length];
  const email = name.toLowerCase().replace(' ', '.') + '@example.com';
  return {
    id: `CUST${String(id).padStart(3, '0')}`,
    name,
    email,
  };
};

// Generate a booking
const generateBooking = (id: number, customerId: string, flight: FlightData): BookingData => {
  const seatClassOptions: ('economy' | 'business' | 'first')[] = ['economy', 'business', 'first'];
  const weightedRandom = Math.random();
  // 70% economy, 25% business, 5% first
  let seatClass: 'economy' | 'business' | 'first';
  if (weightedRandom < 0.7) {
    seatClass = 'economy';
  } else if (weightedRandom < 0.95) {
    seatClass = 'business';
  } else {
    seatClass = 'first';
  }
  
  // Check if first class exists on this flight
  if (seatClass === 'first' && flight.seats.first.length === 0) {
    seatClass = 'business';
  }
  
  const seatInfo = getRandomSeat(flight, seatClass);
  const customer = customers.find(c => c.id === customerId) || customers[0];
  
  return {
    bookingReference: `BK${String(id).padStart(5, '0')}`,
    customerId,
    flightNumber: flight.flightNumber,
    passengerName: customer.name,
    date: formatShortDate(new Date(flight.scheduledTime)),
    status: 'confirmed',
    seatInfo,
    checkedIn: Math.random() > 0.8,
    class: seatClass,
  };
};

// Generate loyalty data
const generateLoyaltyData = (customerId: string): LoyaltyData => {
  const tierOptions = ['bronze', 'silver', 'gold', 'platinum'];
  const tierIndex = Math.floor(Math.random() * 4);
  const tier = tierOptions[tierIndex];
  
  const baseBenefits = ['Priority Check-in', 'Bonus Miles on Flights'];
  const silverBenefits = [...baseBenefits, 'Extra Baggage Allowance'];
  const goldBenefits = [...silverBenefits, 'Lounge Access', 'Priority Boarding'];
  const platinumBenefits = [...goldBenefits, 'Complimentary Upgrades', 'Partner Benefits'];
  
  const tierBenefits = 
    tier === 'bronze' ? baseBenefits :
    tier === 'silver' ? silverBenefits :
    tier === 'gold' ? goldBenefits :
    platinumBenefits;
  
  const points = (tierIndex + 1) * 15000 + Math.floor(Math.random() * 10000);
  
  return {
    customerId,
    tier,
    points,
    tierBenefits,
  };
};

// Generate user profile
const generateUserProfile = (customerId: string, bookings: BookingData[]): UserProfile => {
  const customer = customers.find(c => c.id === customerId) || customers[0];
  const loyalty = loyaltyData.find(l => l.customerId === customerId) || loyaltyData[0];
  
  const upcomingFlights = bookings.filter(booking => 
    booking.customerId === customerId && 
    booking.status === 'confirmed' &&
    new Date(booking.date) > new Date()
  );
  
  const seatPreferences = ['window', 'aisle', 'middle'];
  const mealPreferences = ['regular', 'vegetarian', 'vegan', 'gluten-free', 'kosher'];
  
  return {
    id: customerId,
    name: customer.name,
    email: customer.email,
    avatarUrl: `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80`,
    loyaltyTier: loyalty.tier,
    loyaltyPoints: loyalty.points,
    upcomingFlights,
    preferences: {
      seatPreference: seatPreferences[Math.floor(Math.random() * seatPreferences.length)],
      mealPreference: mealPreferences[Math.floor(Math.random() * mealPreferences.length)],
      specialAssistance: Math.random() > 0.9 ? ['wheelchair'] : [],
    }
  };
};

// Generate data with a specified number of entities
export const generateMockData = (
  flightCount: number = 10,
  customerCount: number = 5,
  bookingsPerCustomer: number = 3
) => {
  // Generate flights
  const flights = Array.from({ length: flightCount }, (_, i) => generateFlight(i + 1));
  
  // Generate customers
  const customers = Array.from({ length: customerCount }, (_, i) => generateCustomer(i + 1));
  
  // Generate loyalty data for each customer
  const loyaltyData = customers.map(customer => generateLoyaltyData(customer.id));
  
  // Generate bookings - each customer has several bookings
  let bookingId = 1;
  const bookings: BookingData[] = [];
  
  customers.forEach(customer => {
    // Assign random flights to this customer
    const customerBookingsCount = Math.floor(Math.random() * bookingsPerCustomer) + 1;
    for (let i = 0; i < customerBookingsCount; i++) {
      const randomFlightIndex = Math.floor(Math.random() * flights.length);
      const booking = generateBooking(bookingId, customer.id, flights[randomFlightIndex]);
      bookings.push(booking);
      bookingId++;
    }
  });
  
  // Generate user profiles
  const userProfiles = customers.map(customer => 
    generateUserProfile(customer.id, bookings)
  );
  
  return {
    flights,
    bookings,
    loyaltyData,
    userProfiles,
    airlinePolicies: {
      baggage: {
        economyAllowance: '23kg',
        businessAllowance: '32kg',
        extraBaggageFee: '$50 per kg'
      },
      cancellation: {
        deadline: '24 hours before departure',
        refundPolicy: '80% refund if cancelled within policy'
      },
      rebooking: {
        fee: '$100',
        timeLimit: '2 hours before departure'
      },
      seatChange: {
        fee: {
          economy: '$25',
          business: '$50',
          first: '$75'
        },
        deadline: '2 hours before departure'
      }
    }
  };
};

// Example usage:
// 1. Generate default data with 10 flights, 5 customers, and up to 3 bookings per customer
// const mockData = generateMockData();

// 2. Customize with your own parameters
// const customMockData = generateMockData(20, 10, 5);

// 3. Access individual elements 
// const { flights, bookings, loyaltyData, userProfiles, airlinePolicies } = generateMockData();

// Export data with fixed values (similar to the original)
const customerCount = 10;
const flightCount = 15;
const bookingsPerCustomer = 3;

// Pre-generate these for internal use when generating related data
const customers = Array.from({ length: customerCount }, (_, i) => generateCustomer(i + 1));
const loyaltyData = customers.map(customer => generateLoyaltyData(customer.id));

// Export mock data with specific counts - you can modify these numbers
export const mockFlights = Array.from({ length: flightCount }, (_, i) => generateFlight(i + 1));

let bookingId = 1;
export const mockBookings: BookingData[] = [];
customers.forEach(customer => {
  const customerBookingsCount = Math.floor(Math.random() * bookingsPerCustomer) + 1;
  for (let i = 0; i < customerBookingsCount; i++) {
    const randomFlightIndex = Math.floor(Math.random() * mockFlights.length);
    const booking = generateBooking(bookingId, customer.id, mockFlights[randomFlightIndex]);
    mockBookings.push(booking);
    bookingId++;
  }
});

export const mockLoyalty = loyaltyData;

export const mockUserProfile = generateUserProfile(customers[0].id, mockBookings);

export const airlinePolicies = {
  baggage: {
    economyAllowance: '23kg',
    businessAllowance: '32kg',
    extraBaggageFee: '$50 per kg'
  },
  cancellation: {
    deadline: '24 hours before departure',
    refundPolicy: '80% refund if cancelled within policy'
  },
  rebooking: {
    fee: '$100',
    timeLimit: '2 hours before departure'
  },
  seatChange: {
    fee: {
      economy: '$25',
      business: '$50',
      first: '$75'
    },
    deadline: '2 hours before departure'
  }
};

// You can also export all user profiles if needed
export const mockUserProfiles = customers.map(customer => 
  generateUserProfile(customer.id, mockBookings)
);