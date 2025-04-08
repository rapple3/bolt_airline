import { FlightData, BookingData, LoyaltyData, UserProfile, SeatInfo } from '../types';

// Cities with airport codes
const airports = [
  { city: 'New York', code: 'JFK' },
  { city: 'Atlanta', code: 'ATL' },
  { city: 'Los Angeles', code: 'LAX' },
  { city: 'Detroit', code: 'DTW' },
  { city: 'Minneapolis', code: 'MSP' },
  { city: 'Seattle', code: 'SEA' },
  { city: 'Boston', code: 'BOS' },
  { city: 'Salt Lake City', code: 'SLC' },
  { city: 'Paris', code: 'CDG' },
  { city: 'London', code: 'LHR' },
  { city: 'Amsterdam', code: 'AMS' },
  { city: 'Tokyo', code: 'HND' },
];

// Aircraft types used by Delta
const aircraftTypes = [
  { name: 'Boeing 737-900ER', economySeats: 180, comfortPlusSeats: 20, firstSeats: 20, deltaOneSeats: 0 },
  { name: 'Airbus A321', economySeats: 150, comfortPlusSeats: 18, firstSeats: 20, deltaOneSeats: 0 },
  { name: 'Boeing 767-300ER', economySeats: 165, comfortPlusSeats: 28, firstSeats: 26, deltaOneSeats: 36 },
  { name: 'Airbus A350-900', economySeats: 226, comfortPlusSeats: 48, firstSeats: 0, deltaOneSeats: 32 },
  { name: 'Boeing 777-200LR', economySeats: 218, comfortPlusSeats: 32, firstSeats: 0, deltaOneSeats: 28 },
];

// Helper function to generate seat layout
const generateSeats = (
  economyCount: number,
  comfortPlusCount: number,
  firstCount: number,
  deltaOneCount: number
): { economy: SeatInfo[]; comfortPlus: SeatInfo[]; first: SeatInfo[]; deltaOne: SeatInfo[] } => {
  const generateSeatRange = (
    start: number,
    count: number,
    className: 'economy' | 'comfortPlus' | 'first' | 'deltaOne'
  ): SeatInfo[] => {
    return Array.from({ length: count }, (_, i) => {
      const row = Math.floor(i / 6) + start;
      const col = String.fromCharCode(65 + (i % 6));
      return {
        seatNumber: `${row}${col}`,
        class: className,
        status: Math.random() > 0.7 ? 'occupied' : 'available',
        price: 
          className === 'economy' ? 100 : 
          className === 'comfortPlus' ? 170 : 
          className === 'first' ? 300 : 
          600,
        features: 
          className === 'economy' 
            ? ['Standard Legroom', 'Complimentary Snacks', 'In-flight Entertainment'] 
            : className === 'comfortPlus'
            ? ['Extra Legroom', 'Priority Boarding', 'Dedicated Bin Space', 'Complimentary Alcoholic Beverages']
            : className === 'first'
            ? ['First Class Seating', 'Premium Meals', 'Priority Service', 'Sky Priority']
            : ['180° Flat-Bed Seat', 'Premium Bedding', 'Noise-Canceling Headphones', 'Sky Priority', 'Lounge Access']
      };
    });
  };

  return {
    economy: generateSeatRange(30, economyCount, 'economy'),
    comfortPlus: generateSeatRange(20, comfortPlusCount, 'comfortPlus'),
    first: generateSeatRange(10, firstCount, 'first'),
    deltaOne: generateSeatRange(1, deltaOneCount, 'deltaOne')
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

// Generate random flight status using Delta terminology
const generateFlightStatus = (): { status: 'on time' | 'delayed' | 'cancelled' | 'departed' | 'arrived', delayReason?: string } => {
  const rand = Math.random();
  if (rand > 0.85) {
    const delayReasons = [
      'Weather conditions',
      'Air traffic control',
      'Aircraft maintenance',
      'Crew availability',
      'Airport operations',
    ];
    return { status: 'delayed', delayReason: delayReasons[Math.floor(Math.random() * delayReasons.length)] };
  } else if (rand > 0.95) {
    return { status: 'cancelled' };
  } else if (rand > 0.75) {
    return { status: 'departed' };
  } else if (rand > 0.65) {
    return { status: 'arrived' };
  } else {
    return { status: 'on time' };
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
    flightNumber: `DL${1000 + id}`,
    departure: `${departure.city} (${departure.code})`,
    arrival: `${arrival.city} (${arrival.code})`,
    scheduledTime: formatDate(flightDate),
    status,
    ...(delayReason && { delayReason }),
    aircraft: aircraft.name,
    seats: generateSeats(aircraft.economySeats, aircraft.comfortPlusSeats, aircraft.firstSeats, aircraft.deltaOneSeats),
    duration: generateDuration(),
    gate: generateGate(),
  };
};

// Generate a random seat from a flight
const getRandomSeat = (flight: FlightData, seatClass: 'economy' | 'comfortPlus' | 'first' | 'deltaOne'): SeatInfo => {
  const availableSeats = flight.seats[seatClass].filter(seat => seat.status === 'available');
  if (availableSeats.length === 0) {
    return flight.seats[seatClass][0]; // Just return any seat if none available
  }
  return { ...availableSeats[Math.floor(Math.random() * availableSeats.length)], status: 'occupied' };
};

// Define 5 specific customers with varying details
const customers = [
  {
    id: 'CUST001',
    name: 'Michael Johnson',
    email: 'michael.johnson@example.com',
    avatarUrl: '/avatars/avatar1.png',
  },
  {
    id: 'CUST002',
    name: 'Sarah Lee',
    email: 'sarah.lee@example.com',
    avatarUrl: '/avatars/avatar2.png',
  },
  {
    id: 'CUST003',
    name: 'David Chen',
    email: 'david.chen@example.com',
    avatarUrl: '/avatars/avatar3.png',
  },
  {
    id: 'CUST004',
    name: 'Maria Garcia',
    email: 'maria.garcia@example.com',
    avatarUrl: '/avatars/avatar4.png',
  },
  {
    id: 'CUST005',
    name: 'James Wilson',
    email: 'james.wilson@example.com',
    avatarUrl: '/avatars/avatar5.png',
  },
];

// Generate a booking
const generateBooking = (id: number, customerId: string, flight: FlightData): BookingData => {
  const seatClassOptions: ('economy' | 'comfortPlus' | 'first' | 'deltaOne')[] = ['economy', 'comfortPlus', 'first', 'deltaOne'];
  const weightedRandom = Math.random();
  // 60% economy, 20% comfort+, 15% first class, 5% Delta One
  let seatClass: 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
  if (weightedRandom < 0.6) {
    seatClass = 'economy';
  } else if (weightedRandom < 0.8) {
    seatClass = 'comfortPlus';
  } else if (weightedRandom < 0.95) {
    seatClass = 'first';
  } else {
    seatClass = 'deltaOne';
  }
  
  // Make sure the class exists on this flight
  if (seatClass === 'deltaOne' && flight.seats.deltaOne.length === 0) {
    seatClass = 'first';
  }
  if (seatClass === 'first' && flight.seats.first.length === 0) {
    seatClass = 'comfortPlus';
  }
  
  const seatInfo = getRandomSeat(flight, seatClass);
  const customer = customers.find(c => c.id === customerId) || customers[0];
  
  return {
    bookingReference: `DL${String(id).padStart(5, '0')}`,
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

// Generate loyalty data with Delta SkyMiles status
const generateLoyaltyData = (customerId: string): LoyaltyData => {
  // Delta SkyMiles tiers
  const tierOptions: ('blue' | 'silver' | 'gold' | 'platinum' | 'diamond')[] = [
    'blue', 'silver', 'gold', 'platinum', 'diamond'
  ];
  
  // Assign specific tiers to each customer for variety
  const customerIndex = parseInt(customerId.replace('CUST', '')) - 1;
  const tier = tierOptions[Math.min(customerIndex, tierOptions.length - 1)];
  
  // Define benefits based on Delta SkyMiles program
  const blueBenefits = ['Earn 5 miles per $1 spent', 'Use miles for travel'];
  const silverBenefits = [...blueBenefits, 'Unlimited complimentary upgrades', 'Priority Check-in', 'First Checked Bag Free'];
  const goldBenefits = [...silverBenefits, 'SkyTeam Elite Plus status', 'Priority Boarding', 'Expedited Security'];
  const platinumBenefits = [...goldBenefits, 'Choice Benefits Selection', 'Higher Upgrade Priority', 'Waived Award Redeposit Fees'];
  const diamondBenefits = [...platinumBenefits, 'Delta Sky Club Access', 'Complimentary Clear Membership', 'Three Choice Benefits Selections'];
  
  const tierBenefits = 
    tier === 'blue' ? blueBenefits :
    tier === 'silver' ? silverBenefits :
    tier === 'gold' ? goldBenefits :
    tier === 'platinum' ? platinumBenefits :
    diamondBenefits;
  
  // SkyMiles points (realistic ranges)
  const pointsMap = {
    'blue': 5000 + Math.floor(Math.random() * 15000),
    'silver': 25000 + Math.floor(Math.random() * 10000),
    'gold': 50000 + Math.floor(Math.random() * 15000),
    'platinum': 75000 + Math.floor(Math.random() * 25000),
    'diamond': 125000 + Math.floor(Math.random() * 75000)
  };
  
  return {
    customerId,
    tier,
    points: pointsMap[tier],
    tierBenefits,
  };
};

// Generate user profile with varying number of upcoming flights
const generateUserProfile = (customerId: string, bookings: BookingData[]): UserProfile => {
  const customer = customers.find(c => c.id === customerId) || customers[0];
  const loyalty = generateLoyaltyData(customerId);
  
  // Calculate a varying number of upcoming flights based on loyalty tier
  const upcomingFlightCount = {
    'blue': 1,
    'silver': 2,
    'gold': 3,
    'platinum': 4,
    'diamond': 5
  }[loyalty.tier] || 1;
  
  // Get upcoming flights for this customer
  const customerBookings = bookings.filter(b => b.customerId === customerId);
  const upcomingFlights = customerBookings.slice(0, upcomingFlightCount);
  
  // Calculate activity log entries - more entries for higher tiers
  const activityCount = Math.min(5, customerBookings.length);
  const activityLog = Array.from({ length: activityCount }, (_, i) => {
    const booking = customerBookings[i];
    const actionTypes = ['booking', 'check-in', 'baggage-drop', 'seat-change', 'view-status'];
    const action = actionTypes[Math.floor(Math.random() * actionTypes.length)];
    return {
      timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
      action,
      details: { bookingReference: booking.bookingReference, flightNumber: booking.flightNumber }
    };
  });
  
  return {
    customerId: customer.id,
    name: customer.name,
    email: customer.email,
    avatarUrl: customer.avatarUrl,
    loyaltyTier: loyalty.tier,
    loyaltyPoints: loyalty.points,
    preferences: {
      seatPreference: ['window', 'aisle', 'middle'][Math.floor(Math.random() * 2)],
      mealPreference: ['regular', 'vegetarian', 'kosher', 'halal', 'gluten-free'][Math.floor(Math.random() * 5)],
      specialAssistance: Math.random() > 0.8
    },
    upcomingFlights,
    activityLog
  };
};

// Generate mock data
export const generateMockData = (
  flightCount: number = 20,
  bookingsPerCustomer: number = 5
) => {
  // Generate flights
  const flights: FlightData[] = Array.from({ length: flightCount }, (_, i) => generateFlight(i + 1));
  
  // Generate bookings for each customer
  const bookings: BookingData[] = [];
  customers.forEach((customer, customerIndex) => {
    for (let i = 0; i < bookingsPerCustomer; i++) {
      const flightIndex = (customerIndex * bookingsPerCustomer + i) % flights.length;
      bookings.push(generateBooking(bookings.length + 1, customer.id, flights[flightIndex]));
    }
  });
  
  // Generate user profile
  const userProfile = generateUserProfile(customers[0].id, bookings);
  
  // Generate loyalty data
  const loyalty: LoyaltyData[] = customers.map(customer => generateLoyaltyData(customer.id));
  
  return {
    flights,
    bookings,
    loyalty,
    userProfile
  };
};

// Generate the initial mock data
const initialData = generateMockData();

// Export the mock data
export const mockFlights = initialData.flights;
export const mockBookings = initialData.bookings;
export const mockLoyalty = initialData.loyalty;
export const mockUserProfile = initialData.userProfile;

// Export airline policies
export const airlinePolicies = {
  baggage: {
    carryOn: {
      dimensions: '22 x 14 x 9 inches (56 x 35 x 23 cm)',
      weight: '40 pounds (18 kg)',
      items: 'One carry-on bag and one personal item',
      restrictions: 'Liquids must be in containers of 3.4 oz (100 ml) or less'
    },
    checked: {
      dimensions: 'Max linear dimension of 62 inches (158 cm)',
      weight: 'Up to 50 pounds (23 kg)',
      fees: {
        first: 'Free for main cabin and above',
        second: '$40',
        additional: '$150 each',
        overweight: 'Additional $100 for 51-70 pounds'
      },
      special: 'Sports equipment and musical instruments may have special policies'
    }
  },
  cancellation: {
    basic: 'Non-refundable, no changes allowed',
    main: 'Changes permitted with fare difference, subject to $200 cancellation fee',
    refundable: 'Fully refundable, changes allowed without fees',
    twentyFourHour: 'Full refund if cancelled within 24 hours of booking and at least 7 days before departure'
  },
  check_in: {
    online: 'Available 24 hours before departure',
    mobile: 'Available through Delta mobile app',
    airport: {
      counter: 'Opens 3 hours before departure',
      kiosk: 'Available 24 hours',
      cutoff: 'Must be checked in at least 30 minutes before domestic flights, 60 minutes for international'
    }
  },
  seating: {
    classes: {
      economy: 'Standard seating with complimentary snacks and soft drinks',
      comfortPlus: 'Extra legroom, dedicated bin space, premium snacks',
      first: 'Premium seating with complimentary meals and alcoholic beverages',
      deltaOne: 'Lie-flat seats on select long-haul international flights and premium domestic routes'
    },
    selection: {
      basic: 'Assigned at check-in',
      standard: 'Available for selection at booking',
      premium: 'Extra charge for preferred locations'
    }
  },
  loyalty: {
    program: 'Delta SkyMiles',
    tiers: {
      blue: 'Basic membership level',
      silver: 'Requires 25,000 MQMs or 30 MQSs AND $3,000 MQDs',
      gold: 'Requires 50,000 MQMs or 60 MQSs AND $6,000 MQDs',
      platinum: 'Requires 75,000 MQMs or 100 MQSs AND $9,000 MQDs',
      diamond: 'Requires 125,000 MQMs or 140 MQSs AND $15,000 MQDs'
    },
    benefits: {
      mileageEarning: 'Earn miles based on ticket price and status',
      mileageRedemption: 'Redeem miles for flights, upgrades, and more',
      partnerEarning: 'Earn miles with SkyTeam partners and other Delta partners'
    }
  }
};