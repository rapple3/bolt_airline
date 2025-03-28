import { BookingData } from '../../types/booking';
import { FlightData, SeatInfo } from '../../types/flight';

// Generate a random seat from a flight
export const getRandomSeat = (flight: FlightData, seatClass: 'economy' | 'business' | 'first'): SeatInfo => {
  const availableSeats = flight.seats[seatClass].filter(seat => seat.status === 'available');
  if (availableSeats.length === 0) {
    return flight.seats[seatClass][0]; // Just return any seat if none available
  }
  return { ...availableSeats[Math.floor(Math.random() * availableSeats.length)], status: 'occupied' };
};

// Generate a booking
export const generateBooking = (id: number, customerId: string, flight: FlightData, customerName: string): BookingData => {
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
  
  return {
    bookingReference: `BK${String(id).padStart(5, '0')}`,
    customerId,
    flightNumber: flight.flightNumber,
    passengerName: customerName,
    date: new Date(flight.scheduledTime).toISOString(),
    status: 'confirmed',
    seatInfo,
    checkedIn: Math.random() > 0.8,
    class: seatClass,
  };
};

// Generate multiple bookings
export const generateBookings = (
  customerId: string,
  customerName: string,
  flights: FlightData[],
  count: number
): BookingData[] => {
  return Array.from({ length: count }, (_, i) => {
    const randomFlight = flights[Math.floor(Math.random() * flights.length)];
    return generateBooking(i + 1, customerId, randomFlight, customerName);
  });
}; 