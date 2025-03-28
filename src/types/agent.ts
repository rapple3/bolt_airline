import { BookingData } from './booking';

export interface AgentHandoff {
  customerId: string;
  bookingDetails: BookingData | null;
  problemSummary: string;
  attemptedSolutions: string[];
  nextSteps: string[];
} 