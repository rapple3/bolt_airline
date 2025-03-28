import { ActionResult } from '../utils/actionHandler';

export interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  actionResult?: ActionResult;
  pendingConfirmation?: {
    type: 'BOOK_FLIGHT';
    flightNumber: string;
    seatClass: 'economy' | 'business' | 'first';
    flightDetails: FlightData;
  };
}

export interface SeatInfo {
  seatNumber: string;
  class: 'economy' | 'business' | 'first';
  status: 'available' | 'occupied' | 'selected';
  price: number;
  features?: string[];
}

export interface FlightData {
  flightNumber: string;
  departure: string;
  arrival: string;
  scheduledTime: string;
  status: 'on-time' | 'delayed' | 'cancelled';
  delayReason?: string;
  aircraft: string;
  seats: {
    economy: SeatInfo[];
    business: SeatInfo[];
    first: SeatInfo[];
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
  class: 'economy' | 'business' | 'first';
}

export interface LoyaltyData {
  customerId: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
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
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  loyaltyTier: LoyaltyData['tier'];
  loyaltyPoints: number;
  upcomingFlights: BookingData[];
  preferences?: {
    seatPreference: 'window' | 'aisle' | 'no preference';
    mealPreference?: string;
    specialAssistance?: string[];
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