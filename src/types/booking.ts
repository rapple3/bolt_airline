import { SeatInfo } from './flight';

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