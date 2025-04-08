import { ActionResult } from '../utils/actionHandler';

export interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  actionResult?: ActionResult;
  pendingConfirmation?: {
    type: 'BOOK_FLIGHT' | 'CANCEL_BOOKING' | 'CHANGE_FLIGHT' | 'CHANGE_SEAT';
    flightNumber?: string;
    seatClass?: 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
    flightDetails?: FlightData;
    bookingReference?: string;
    newFlightNumber?: string;
    newFlightDetails?: FlightData;
    newSeatNumber?: string;
    targetClass?: string;
    seatPreference?: 'window' | 'aisle' | 'middle' | 'any';
    bookingDetails?: BookingData;
  };
}

export interface SeatInfo {
  seatNumber: string;
  class: 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
  status: 'available' | 'occupied' | 'selected';
  price: number;
  features?: string[];
}

export interface FlightData {
  flightNumber: string;
  departure: string;
  arrival: string;
  scheduledTime: string;
  status: 'on time' | 'delayed' | 'cancelled' | 'departed' | 'arrived';
  delayReason?: string;
  aircraft: string;
  seats: {
    economy: SeatInfo[];
    comfortPlus: SeatInfo[];
    first: SeatInfo[];
    deltaOne: SeatInfo[];
  };
  duration: string;
  gate?: string;
}

export interface BookingData {
  bookingReference: string;
  customerId: string;
  flightNumber: string;
  passengerName: string;
  date: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  seatInfo?: SeatInfo;
  checkedIn: boolean;
  class: 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
}

export interface LoyaltyData {
  customerId: string;
  tier: 'blue' | 'silver' | 'gold' | 'platinum' | 'diamond';
  points: number;
  tierBenefits: string[];
}

export interface AgentHandoff {
  customerId: string;
  bookingDetails: BookingData | null;
  problemSummary: string;
  attemptedSolutions: string[];
  nextSteps: string[];
}

export interface UserProfile {
  customerId: string;
  name: string;
  email: string;
  avatarUrl: string;
  loyaltyTier: LoyaltyData['tier'];
  loyaltyPoints: number;
  upcomingFlights: BookingData[];
  preferences?: {
    seatPreference: 'window' | 'aisle' | 'middle';
    mealPreference?: string;
    specialAssistance?: boolean;
  };
  activityLog?: Array<{
    timestamp: string;
    action: string;
    details: Record<string, any>;
  }>;
}

export interface FlightAction {
  type: 'BOOK' | 'CANCEL' | 'CHANGE';
  flightNumber: string;
  bookingReference?: string;
  seatInfo?: SeatInfo;
}