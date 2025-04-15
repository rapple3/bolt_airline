import { mockBookings, mockUserProfile } from '../data/mockData';
import { generateFlights } from '../data/mock/flights';
import { FlightData, BookingData, UserProfile, SeatInfo } from '../types';

// Define a type for our subscribers
type Subscriber = () => void;

class DataManager {
  private flights: FlightData[];
  private bookings: BookingData[];
  private userProfile: UserProfile;
  private subscribers: Subscriber[] = [];

  constructor() {
    // Generate mock flights including specific route data
    const generatedFlights = generateFlights(20); // 20 flights including guaranteed ATL-JFK routes
    
    // Try to load from localStorage first, fallback to generated mock data
    this.flights = this.loadFromStorage('flights') || generatedFlights;
    this.bookings = this.loadFromStorage('bookings') || [...mockBookings];
    this.userProfile = this.loadFromStorage('userProfile') || { ...mockUserProfile };
    
    // Save initial data if it doesn't exist
    this.saveToStorage();
  }

  // Storage methods
  private loadFromStorage<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(`airline_app_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Error loading ${key} from storage:`, e);
      return null;
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('airline_app_flights', JSON.stringify(this.flights));
      localStorage.setItem('airline_app_bookings', JSON.stringify(this.bookings));
      localStorage.setItem('airline_app_userProfile', JSON.stringify(this.userProfile));
    } catch (e) {
      console.error('Error saving to storage:', e);
    }
  }

  // Subscriber pattern for UI updates
  subscribe(callback: Subscriber): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback());
  }

  // Data access methods
  getFlights(): FlightData[] {
    return this.flights;
  }

  getFlight(flightNumber: string): FlightData | undefined {
    return this.flights.find(f => f.flightNumber === flightNumber);
  }

  getBookings(): BookingData[] {
    return this.bookings.filter(b => b.customerId === this.userProfile.customerId);
  }

  getUserProfile(): UserProfile {
    return this.userProfile;
  }

  setUserProfile(profile: UserProfile): void {
    this.userProfile = profile;
    this.saveToStorage();
    this.notifySubscribers();
  }

  // Data modification methods
  cancelBooking(bookingReference: string): boolean {
    const bookingIndex = this.bookings.findIndex(b => 
      b.bookingReference === bookingReference && 
      b.customerId === this.userProfile.customerId
    );
    
    if (bookingIndex === -1) return false;
    
    // Update the booking status
    this.bookings[bookingIndex] = {
      ...this.bookings[bookingIndex],
      status: 'cancelled'
    };
    
    // Update user profile's upcoming flights with new reference
    this.userProfile = {
      ...this.userProfile,
      upcomingFlights: [...this.userProfile.upcomingFlights.filter(
        flight => flight.bookingReference !== bookingReference
      )]
    };
    
    // Log the action
    this.logAction('Cancelled Booking', { bookingReference });
    
    // Save changes and notify UI
    this.saveToStorage();
    this.notifySubscribers();
    
    return true;
  }

  changeFlight(bookingReference: string, newFlightNumber: string): boolean {
    const bookingIndex = this.bookings.findIndex(b => 
      b.bookingReference === bookingReference && 
      b.customerId === this.userProfile.customerId
    );
    
    if (bookingIndex === -1) return false;
    
    const booking = this.bookings[bookingIndex];
    const newFlight = this.flights.find(f => f.flightNumber === newFlightNumber);
    
    if (!newFlight) return false;
    
    // Find an available seat in the same class
    const availableSeats = newFlight.seats[booking.class].filter(seat => seat.status === 'available');
    if (availableSeats.length === 0) return false;
    
    const newSeat: SeatInfo = { ...availableSeats[0], status: 'occupied' as const };
    
    // Update the booking
    this.bookings[bookingIndex] = {
      ...booking,
      flightNumber: newFlightNumber,
      seatInfo: newSeat,
      date: new Date(newFlight.scheduledTime).toISOString()
    };
    
    // Update the flight in user profile
    const flightIndex = this.userProfile.upcomingFlights.findIndex(
      f => f.bookingReference === bookingReference
    );
    
    if (flightIndex !== -1) {
      this.userProfile.upcomingFlights[flightIndex] = {
        ...this.userProfile.upcomingFlights[flightIndex],
        flightNumber: newFlightNumber,
        seatInfo: newSeat,
        date: new Date(newFlight.scheduledTime).toISOString()
      };
    }
    
    // Log the action
    this.logAction('Changed Flight', { bookingReference, newFlightNumber });
    
    // Save changes and notify UI
    this.saveToStorage();
    this.notifySubscribers();
    
    return true;
  }
  
  createBooking(flightNumber: string, seatClass: 'economy' | 'comfortPlus' | 'first' | 'deltaOne'): boolean {
    const flight = this.flights.find(f => f.flightNumber === flightNumber);
    if (!flight) return false;
    
    // Check if the selected class exists on this flight
    if ((seatClass === 'deltaOne' && flight.seats.deltaOne.length === 0) ||
        (seatClass === 'first' && flight.seats.first.length === 0)) {
      return false;
    }
    
    // Find an available seat
    const availableSeats = flight.seats[seatClass].filter(seat => seat.status === 'available');
    if (availableSeats.length === 0) return false;
    
    const seat: SeatInfo = { ...availableSeats[0], status: 'occupied' as const };
    
    // Create new booking
    const newBooking: BookingData = {
      bookingReference: `DL${String(this.bookings.length + 1).padStart(5, '0')}`,
      customerId: this.userProfile.customerId,
      flightNumber,
      passengerName: this.userProfile.name,
      date: new Date(flight.scheduledTime).toISOString().split('T')[0],
      status: 'confirmed',
      seatInfo: seat,
      checkedIn: false,
      class: seatClass
    };
    
    // Add booking to list
    this.bookings.push(newBooking);
    
    // Update user profile
    this.userProfile = {
      ...this.userProfile,
      upcomingFlights: [...this.userProfile.upcomingFlights, newBooking]
    };
    
    // Log the action
    this.logAction('Booked Flight', { flightNumber, seatClass, seatNumber: seat.seatNumber });
    
    // Save changes and notify UI
    this.saveToStorage();
    this.notifySubscribers();
    
    return true;
  }
  
  changeSeat(bookingReference: string, newSeatNumber: string): boolean {
    const bookingIndex = this.bookings.findIndex(b => 
      b.bookingReference === bookingReference && 
      b.customerId === this.userProfile.customerId
    );
    
    if (bookingIndex === -1) return false;
    
    const booking = this.bookings[bookingIndex];
    const flight = this.flights.find(f => f.flightNumber === booking.flightNumber);
    
    if (!flight || !booking.seatInfo) return false;
    
    // Find the new seat across all seat classes
    let newSeat: SeatInfo | null = null;
    for (const seatClass of ['economy', 'comfortPlus', 'first', 'deltaOne'] as const) {
      const seat = flight.seats[seatClass].find(s => s.seatNumber === newSeatNumber);
      if (seat && seat.status === 'available') {
        newSeat = { ...seat, status: 'occupied' as const };
        
        // Mark the old seat as available
        const oldSeatClass = booking.class;
        const oldSeatIndex = flight.seats[oldSeatClass].findIndex(
          s => s.seatNumber === booking.seatInfo!.seatNumber
        );
        
        if (oldSeatIndex !== -1) {
          flight.seats[oldSeatClass][oldSeatIndex] = {
            ...flight.seats[oldSeatClass][oldSeatIndex],
            status: 'available' as const
          };
        }
        
        // Update the booking
        this.bookings[bookingIndex] = {
          ...booking,
          seatInfo: newSeat,
          class: seatClass
        };
        
        // Update in user profile
        const flightIndex = this.userProfile.upcomingFlights.findIndex(
          f => f.bookingReference === bookingReference
        );
        
        if (flightIndex !== -1) {
          this.userProfile.upcomingFlights[flightIndex] = {
            ...this.userProfile.upcomingFlights[flightIndex],
            seatInfo: newSeat,
            class: seatClass
          };
        }
        
        // Log the action
        this.logAction('Changed Seat', { 
          bookingReference, 
          oldSeat: booking.seatInfo.seatNumber, 
          newSeat: newSeatNumber 
        });
        
        // Save changes and notify UI
        this.saveToStorage();
        this.notifySubscribers();
        
        return true;
      }
    }
    
    return false;
  }
  
  logAction(action: string, details: Record<string, any>): void {
    // Add activity to log
    if (!this.userProfile.activityLog) {
      this.userProfile.activityLog = [];
    }
    
    this.userProfile.activityLog.push({
      timestamp: new Date().toISOString(),
      action,
      details
    });
  }
  
  resetData(): void {
    // Generate fresh mock flights including specific route data
    const generatedFlights = generateFlights(20);
    
    // Reset to mock data
    this.flights = generatedFlights;
    this.bookings = [...mockBookings];
    
    // Keep the current user ID when resetting to maintain chosen user
    const currentUserId = this.userProfile.customerId;
    // Find matching user in mock bookings or fall back to the default
    const matchingUser = mockBookings.find(booking => booking.customerId === currentUserId);
    if (matchingUser) {
      // If current user exists in the mock data, use the corresponding booking's customer
      this.userProfile = { ...mockUserProfile };
    } else {
      // Otherwise, use the default user profile
      this.userProfile = { ...mockUserProfile };
    }
    
    // Clear storage and save new data
    localStorage.removeItem('airline_app_flights');
    localStorage.removeItem('airline_app_bookings');
    localStorage.removeItem('airline_app_userProfile');
    
    this.saveToStorage();
    this.notifySubscribers();
  }

  checkIn(bookingReference: string): boolean {
    const bookingIndex = this.bookings.findIndex(b => 
      b.bookingReference === bookingReference && 
      b.customerId === this.userProfile.customerId
    );
    
    if (bookingIndex === -1) return false;
    
    // Update the booking status
    this.bookings[bookingIndex] = {
      ...this.bookings[bookingIndex],
      checkedIn: true
    };
    
    // Log the action
    this.logAction('Checked In', { bookingReference });
    
    // Save changes and notify UI
    this.saveToStorage();
    this.notifySubscribers();
    
    return true;
  }

  trackBaggage(bookingReference: string): Record<string, any> {
    const booking = this.bookings.find(b => 
      b.bookingReference === bookingReference && 
      b.customerId === this.userProfile.customerId
    );
    
    if (!booking) return {};
    
    // Log the action
    this.logAction('Tracked Baggage', { bookingReference });
    
    return booking;
  }

  setFlights(flights: FlightData[]): void {
    this.flights = flights;
    this.saveToStorage();
    this.notifySubscribers();
  }

  // Refresh flights for a specific date
  refreshFlightsForDate(date: Date): void {
    // Generate new flights for the specified date
    const newFlights = generateFlights(20, date);
    
    // Keep existing bookings' flights
    const bookedFlightNumbers = new Set(this.bookings.map(b => b.flightNumber));
    const existingBookedFlights = this.flights.filter(f => bookedFlightNumbers.has(f.flightNumber));
    
    // Combine booked flights with new flights
    this.flights = [...existingBookedFlights, ...newFlights];
    
    // Save changes and notify UI
    this.saveToStorage();
    this.notifySubscribers();
  }
}

// Create a singleton instance
export const dataManager = new DataManager();
