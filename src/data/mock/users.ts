import { UserProfile } from '../../types/user';
import { generateBookings } from './bookings';
import { generateLoyaltyData } from './loyalty';
import { generateFlights } from './flights';

const names = [
  'John Smith', 'Emma Wilson', 'Michael Brown', 'Sarah Davis', 'David Lee',
  'Lisa Anderson', 'James Taylor', 'Jennifer White', 'Robert Johnson', 'Mary Martinez'
];

const preferences = [
  { seatPreference: 'window' as const, mealPreference: 'vegetarian', specialAssistance: ['wheelchair'] },
  { seatPreference: 'aisle' as const, mealPreference: 'halal', specialAssistance: undefined },
  { seatPreference: 'window' as const, mealPreference: 'kosher', specialAssistance: ['mobility assistance'] },
  { seatPreference: 'aisle' as const, mealPreference: 'vegetarian', specialAssistance: undefined },
  { seatPreference: 'window' as const, mealPreference: 'regular', specialAssistance: ['visual assistance'] }
];

// Generate user profile
export const generateUserProfile = (id: string, name: string, email: string): UserProfile => {
  const loyaltyData = generateLoyaltyData(id);
  const flights = generateFlights(5);
  const upcomingFlights = generateBookings(2, id, name, flights);
  
  const preference = preferences[Math.floor(Math.random() * preferences.length)];
  
  return {
    id,
    name,
    email,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
    loyaltyTier: loyaltyData.tier,
    loyaltyPoints: loyaltyData.points,
    upcomingFlights,
    preferences: preference,
    activityLog: [
      {
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        action: 'Flight Booked',
        details: { flightNumber: 'BA123', route: 'New York to London' }
      },
      {
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        action: 'Points Earned',
        details: { points: 500, source: 'recent flight' }
      }
    ]
  };
};

// Generate multiple user profiles
export const generateUserProfiles = (count: number): UserProfile[] => {
  return Array.from({ length: count }, (_, i) => {
    const id = `USER${String(i + 1).padStart(3, '0')}`;
    const name = names[i % names.length];
    const email = `${name.toLowerCase().replace(' ', '.')}@example.com`;
    return generateUserProfile(id, name, email);
  });
}; 