import { BookingData } from './booking';
import { LoyaltyData } from './loyalty';

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