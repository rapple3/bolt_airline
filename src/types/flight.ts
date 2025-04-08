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

export interface FlightAction {
  type: 'BOOK' | 'CANCEL' | 'CHANGE';
  flightNumber: string;
  bookingReference?: string;
  seatInfo?: SeatInfo;
} 