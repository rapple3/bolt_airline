import { SeatInfo } from './flight';

export interface BookingData {
  bookingReference: string;
  customerId: string;
  flightNumber: string;
  passengerName: string;
  date: string;
  scheduledTime: string;
  status: 'confirmed' | 'cancelled' | 'checked-in';
  seatInfo: SeatInfo;
  checkedIn: boolean;
  class: 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
  createdAt?: string;
  fareType?: 'basic' | 'main' | 'refundable' | 'non-refundable';
} 