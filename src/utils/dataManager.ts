import { mockBookings, mockUserProfiles, mockUserProfile as fallbackUserProfile } from '../data/mockData';
import { generateFlights } from '../data/mock/flights';
import { FlightData, BookingData, UserProfile, SeatInfo } from '../types';

// Define a type for our subscribers
type Subscriber = () => void;

class DataManager {
  private flights: FlightData[] = [];
  private bookings: BookingData[] = [];
  private userProfile!: UserProfile;
  private subscribers: Subscriber[] = [];
  private currentDate: Date;

  constructor() {
    console.log('Initializing DataManager with fresh mock data...');
    
    // Always use browser's current date
    this.currentDate = new Date();
    
    // Always generate fresh flights on load
    this.flights = generateFlights(20, this.currentDate); // Pass current date for consistency
    
    // Always start with the base mock bookings
    this.bookings = [...mockBookings]; 

    // --- Set Specific Default User --- 
    const defaultUserId = 'CUST004'; // Change this ID to your desired default user (e.g., Maria Garcia)
    let foundProfile = mockUserProfiles.find(p => p.customerId === defaultUserId);

    if (foundProfile) {
        console.log(`Setting default user to: ${foundProfile.name} (${defaultUserId})`);
        this.userProfile = { 
            ...foundProfile, 
            // Ensure upcomingFlights are correctly filtered from the *current* bookings list
            upcomingFlights: this.bookings.filter(b => b.customerId === defaultUserId && b.status !== 'cancelled')
        };
    } else {
        // Fallback if the specific ID wasn't found in mockUserProfiles
        console.warn(`Default user ID ${defaultUserId} not found in mockUserProfiles. Falling back.`);
        this.userProfile = { 
          ...fallbackUserProfile, // Use the imported fallback 
          upcomingFlights: this.bookings.filter(b => b.customerId === fallbackUserProfile.customerId && b.status !== 'cancelled')
        };
    }
    // --- End Set Specific Default User ---
    
    console.log('DataManager initialized:', {
      flights: this.flights.length,
      bookings: this.bookings.length,
      user: this.userProfile.name
    });

    // Note: We are no longer loading from or saving initial state to localStorage here
    // Saving will only happen if specific methods like createBooking/cancelBooking are called during the session
  }

  // Remove date fetching and related methods
  // private async fetchCurrentDateFromAPI(): Promise<Date | null> { ... }
  // private shouldRefreshFlights(): boolean { ... }
  // private refreshFlights(): void { ... }

  // Keep storage methods for potential in-session updates, but don't rely on them for load
  private loadFromStorage<T>(key: string): T | null {
    // This could be kept for potential future use, but isn't called by the simplified constructor
    try {
      const data = localStorage.getItem(`airline_app_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn(`Warning: Error loading ${key} from storage (might be corrupted):`, e);
      localStorage.removeItem(`airline_app_${key}`); // Clear corrupted item
      return null;
    }
  }

  private saveToStorage(): void {
    try {
      // Only save data that might change during the session
      localStorage.setItem('airline_app_bookings', JSON.stringify(this.bookings));
      localStorage.setItem('airline_app_userProfile', JSON.stringify(this.userProfile));
      // No longer saving flights, date, or lastUpdate as they reset on load
    } catch (e) {
      console.error('Error saving to storage:', e);
    }
  }

  // Subscriber pattern remains the same
  subscribe(callback: Subscriber): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback());
  }

  // --- Data access methods remain largely the same --- 
  
  getCurrentDate(): Date {
    // Return a copy to prevent external modification
    return new Date(this.currentDate); 
  }

  setCurrentDate(date: Date): void {
    // Allow setting date for testing/simulation during the session
    console.warn('DataManager: Setting current date manually. This will not persist.');
    this.currentDate = new Date(date);
    // Maybe refresh flights based on the new date? Or assume manual refresh via resetData?
    // For simplicity, let's just notify subscribers for now.
    this.notifySubscribers();
  }

  getFlights(): FlightData[] {
    // No longer needs refresh check on access
    return this.flights;
  }

  getFlight(flightNumber: string): FlightData | undefined {
    // No longer needs refresh check on access
    return this.flights.find(f => f.flightNumber === flightNumber);
  }

  getBookings(): BookingData[] {
    // Filter bookings for the *currently set* user profile
    return this.bookings.filter(b => b.customerId === this.userProfile.customerId);
  }

  getUserProfile(): UserProfile {
    return this.userProfile;
  }

  // ---> NEW METHOD TO GET ALL PROFILES WITH CURRENT DATA <--- 
  getAllUserProfilesWithDetails(): UserProfile[] {
    console.log('DataManager: Fetching all user profiles with current booking counts.');
    // Get the base profiles from the mock data
    const baseProfiles = mockUserProfiles;
    // Map over them and update their upcomingFlights based on the current state of this.bookings
    return baseProfiles.map(profile => {
      const currentBookingsForUser = this.bookings.filter(
        b => b.customerId === profile.customerId && b.status !== 'cancelled'
      );
      return {
        ...profile,
        upcomingFlights: currentBookingsForUser
      };
    });
  }
  // ---> END NEW METHOD <--- 

  setUserProfile(profile: UserProfile): void {
    console.log(`DataManager: Setting user profile to ${profile.name} (${profile.customerId})`);
    this.userProfile = profile;
    // Update upcoming flights in the profile to match the main bookings list for this user
    // Ensure we filter by the correct profile ID being set
    this.userProfile.upcomingFlights = this.bookings.filter(b => b.customerId === profile.customerId && b.status !== 'cancelled');
    this.saveToStorage(); // Save profile changes for the session
    this.notifySubscribers();
  }

  // --- Data modification methods remain largely the same --- 
  // They will modify the in-memory data and call saveToStorage/notifySubscribers
  
  cancelBooking(bookingReference: string): boolean {
    const bookingIndex = this.bookings.findIndex(b => 
      b.bookingReference === bookingReference && 
      b.customerId === this.userProfile.customerId
    );
    
    if (bookingIndex === -1) {
      console.error(`DataManager: Cannot cancel booking ${bookingReference}. Not found for user ${this.userProfile.customerId}.`);
      return false;
    }
    
    // Update the booking status instead of removing
    console.log(`DataManager: Cancelling booking ${bookingReference}`);
    this.bookings[bookingIndex] = {
      ...this.bookings[bookingIndex],
      status: 'cancelled'
    };
    
    // Update user profile's upcoming flights array reference to trigger UI update
    this.userProfile = {
      ...this.userProfile,
      upcomingFlights: this.bookings.filter(
        flight => flight.customerId === this.userProfile.customerId && flight.status !== 'cancelled'
      )
    };
    
    this.logAction('Cancelled Booking', { bookingReference });
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
    
    // Ensure seat class exists and find available seat
    if (!newFlight.seats[booking.class]) return false; // Check if class exists
    const availableSeats = newFlight.seats[booking.class].filter(seat => seat.status === 'available');
    if (availableSeats.length === 0) return false;
    
    const newSeat: SeatInfo = { ...availableSeats[0], status: 'occupied' as const };
    
    console.log(`DataManager: Changing booking ${bookingReference} to flight ${newFlightNumber}`);
    this.bookings[bookingIndex] = {
      ...booking,
      flightNumber: newFlightNumber,
      seatInfo: newSeat,
      scheduledTime: newFlight.scheduledTime 
    };
    
    // Update user profile's upcoming flights array reference
    this.userProfile = {
        ...this.userProfile,
        upcomingFlights: this.bookings.filter(f => f.customerId === this.userProfile.customerId && f.status !== 'cancelled')
    };
    
    this.logAction('Changed Flight', { bookingReference, newFlightNumber });
    this.saveToStorage();
    this.notifySubscribers();
    return true;
  }
  
  createBooking(flightNumber: string, seatClass: 'economy' | 'comfortPlus' | 'first' | 'deltaOne'): boolean {
    const flight = this.flights.find(f => f.flightNumber === flightNumber);
    if (!flight) return false;
    
    // Check if the selected class exists on this flight and has seats
    if (!flight.seats[seatClass] || flight.seats[seatClass].length === 0) {
        console.error(`DataManager: Cannot book class ${seatClass} for flight ${flightNumber}. Class not offered or no seats.`);
        return false;
    }
    
    // Find an available seat
    const availableSeats = flight.seats[seatClass].filter(seat => seat.status === 'available');
    if (availableSeats.length === 0) {
      console.warn(`DataManager: No available seats in ${seatClass} for flight ${flightNumber}.`);
      return false;
    }
    
    // Mark seat as occupied (in the main flights array for consistency during session)
    const seatToBook = availableSeats[0];
    const seatIndex = flight.seats[seatClass].findIndex(s => s.seatNumber === seatToBook.seatNumber);
    if (seatIndex !== -1) {
        flight.seats[seatClass][seatIndex].status = 'occupied';
    } else {
        console.error('DataManager: Could not find seat to mark as occupied. Booking aborted.');
        return false;
    }

    const seatInfoForBooking: SeatInfo = { ...seatToBook, status: 'occupied' };
    
    // Create new booking
    const newBooking: BookingData = {
      bookingReference: `DL${String(Date.now()).slice(-6)}`, // Use timestamp suffix for uniqueness
      customerId: this.userProfile.customerId,
      flightNumber,
      passengerName: this.userProfile.name,
      scheduledTime: flight.scheduledTime,
      date: flight.scheduledTime,
      status: 'confirmed',
      seatInfo: seatInfoForBooking,
      checkedIn: false,
      class: seatClass,
      createdAt: new Date().toISOString()
    };
    
    console.log(`DataManager: Creating new booking ${newBooking.bookingReference} for flight ${flightNumber}`);
    this.bookings.push(newBooking);
    
    // Update user profile's upcoming flights array reference
    this.userProfile = {
      ...this.userProfile,
      upcomingFlights: this.bookings.filter(b => b.customerId === this.userProfile.customerId && b.status !== 'cancelled')
    };
    
    this.logAction('Booked Flight', { flightNumber, seatClass, seatNumber: seatInfoForBooking.seatNumber });
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
    
    // Find the new seat and its class
    let newSeat: SeatInfo | null = null;
    let newSeatClass: 'economy' | 'comfortPlus' | 'first' | 'deltaOne' | null = null;
    for (const sc of ['economy', 'comfortPlus', 'first', 'deltaOne'] as const) {
      const seat = flight.seats[sc]?.find(s => s.seatNumber === newSeatNumber);
      if (seat && seat.status === 'available') {
        newSeat = { ...seat, status: 'occupied' as const };
        newSeatClass = sc;
        break;
      }
    }

    if (!newSeat || !newSeatClass) {
        console.warn(`DataManager: Seat ${newSeatNumber} not found or not available for flight ${flight.flightNumber}.`);
        return false;
    }
        
    // Mark the old seat as available
    const oldSeatClass = booking.class;
    const oldSeatIndex = flight.seats[oldSeatClass]?.findIndex(
        s => s.seatNumber === booking.seatInfo!.seatNumber
    );
    
    if (oldSeatIndex !== -1 && flight.seats[oldSeatClass]) {
        flight.seats[oldSeatClass][oldSeatIndex].status = 'available';
    } else {
        console.warn(`DataManager: Could not find old seat ${booking.seatInfo?.seatNumber} to mark as available.`);
    }
    
    // Mark the new seat as occupied (in the main flights array)
    const newSeatIndex = flight.seats[newSeatClass].findIndex(s => s.seatNumber === newSeatNumber);
    if (newSeatIndex !== -1) {
        flight.seats[newSeatClass][newSeatIndex].status = 'occupied';
    } else {
        // Should not happen if found above, but good to check
        console.error(`DataManager: Could not find new seat ${newSeatNumber} to mark as occupied. Change aborted.`);
        // Revert old seat status if possible
        if (oldSeatIndex !== -1 && flight.seats[oldSeatClass]) {
             flight.seats[oldSeatClass][oldSeatIndex].status = 'occupied';
        }
        return false;
    }

    console.log(`DataManager: Changing seat for booking ${bookingReference} to ${newSeatNumber}`);
    // Update the booking record
    this.bookings[bookingIndex] = {
        ...booking,
        seatInfo: newSeat,
        class: newSeatClass
    };
    
    // Update user profile's upcoming flights array reference
    this.userProfile = {
        ...this.userProfile,
        upcomingFlights: this.bookings.filter(f => f.customerId === this.userProfile.customerId && f.status !== 'cancelled')
    };
    
    this.logAction('Changed Seat', { 
        bookingReference, 
        oldSeat: booking.seatInfo.seatNumber, 
        newSeat: newSeatNumber 
    });
    
    this.saveToStorage();
    this.notifySubscribers();
    return true;
  }
  
  logAction(action: string, details: Record<string, any>): void {
    if (!this.userProfile.activityLog) {
      this.userProfile.activityLog = [];
    }
    this.userProfile.activityLog.push({
      timestamp: new Date().toISOString(),
      action,
      details
    });
    // No need to save to storage just for logging if persistence isn't required
    // this.saveToStorage(); 
  }
  
  resetData(): void {
    console.log('DataManager: Resetting data to initial mock state...');
    this.currentDate = new Date();
    this.flights = generateFlights(20, this.currentDate);
    this.bookings = [...mockBookings];
    
    // --- Set Specific Default User on Reset --- 
    const defaultUserId = 'CUST004'; // Use the same default ID
    let foundProfile = mockUserProfiles.find(p => p.customerId === defaultUserId);

    if (foundProfile) {
        console.log(`Resetting default user to: ${foundProfile.name} (${defaultUserId})`);
        this.userProfile = { 
            ...foundProfile, 
            upcomingFlights: this.bookings.filter(b => b.customerId === defaultUserId && b.status !== 'cancelled')
        };
    } else {
        console.warn(`Default user ID ${defaultUserId} not found in mockUserProfiles during reset. Falling back.`);
        this.userProfile = { 
          ...fallbackUserProfile, 
          upcomingFlights: this.bookings.filter(b => b.customerId === fallbackUserProfile.customerId && b.status !== 'cancelled')
        };
    }
    // --- End Set Specific Default User on Reset ---

    this.notifySubscribers();
  }

  // Other methods like checkIn, trackBaggage remain similar, 
  // but their persistence via saveToStorage is only for the current session.

  checkIn(bookingReference: string): boolean {
    const bookingIndex = this.bookings.findIndex(b => 
      b.bookingReference === bookingReference && 
      b.customerId === this.userProfile.customerId
    );
    
    if (bookingIndex === -1) return false;
    
    console.log(`DataManager: Checking in booking ${bookingReference}`);
    this.bookings[bookingIndex] = {
      ...this.bookings[bookingIndex],
      checkedIn: true
    };
    
    this.logAction('Checked In', { bookingReference });
    this.saveToStorage(); // Save check-in status for the session
    this.notifySubscribers();
    return true;
  }

  trackBaggage(bookingReference: string): Record<string, any> {
    const booking = this.bookings.find(b => 
      b.bookingReference === bookingReference && 
      b.customerId === this.userProfile.customerId
    );
    
    if (!booking) return {};
    
    this.logAction('Tracked Baggage', { bookingReference });
    return booking;
  }

  setFlights(flights: FlightData[]): void {
    // This might be used by fallback generation, keep it for session consistency
    console.log('DataManager: Manually setting flights data.');
    this.flights = flights;
    // No saveToStorage needed as flights reset on load
    this.notifySubscribers();
  }

  refreshFlightsForDate(date: Date): void {
    // Generate new flights for the specified date for the *session*
    console.log(`DataManager: Refreshing flights for date ${date.toISOString().split('T')[0]}`);
    const newFlights = generateFlights(20, date);
    
    // Keep existing bookings' flights (to avoid losing flight details for active bookings)
    const bookedFlightNumbers = new Set(this.bookings.map(b => b.flightNumber));
    const existingBookedFlights = this.flights.filter(f => bookedFlightNumbers.has(f.flightNumber));
    
    // Combine booked flights with new flights
    this.flights = [...existingBookedFlights, ...newFlights];
    this.notifySubscribers();
  }
}

// Create a singleton instance
export const dataManager = new DataManager();
