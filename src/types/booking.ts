import { SeatInfo } from './flight';

export interface BookingData {
  bookingReference: string;
  customerId: string;
  flightNumber: string;
  passengerName: string;
  scheduledTime: string;
  status: 'confirmed' | 'cancelled' | 'changed';
  seatInfo: SeatInfo;
  checkedIn: boolean;
  class: 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
  createdAt?: string;
  fareType?: 'refundable' | 'non-refundable';
} 