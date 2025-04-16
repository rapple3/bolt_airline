import React, { useEffect, useState } from 'react';
import { dataManager } from '../utils/dataManager';
import { UserProfile } from '../types';
import { Calendar, Plane, Award, ChevronDown, ChevronUp, User, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface UserProfileCardProps {
  profile?: UserProfile;
}

export default function UserProfileCard({ profile: propProfile }: UserProfileCardProps) {
  // Initialize state from dataManager, props will update through useEffect
  const [profile, setProfile] = useState<UserProfile>(dataManager.getUserProfile());
  const [isExpanded, setIsExpanded] = useState(true);
  
  useEffect(() => {
    // Update from props if provided
    if (propProfile) {
      setProfile(propProfile);
    }
    
    // Subscribe to dataManager updates
    const unsubscribe = dataManager.subscribe(() => {
      const newProfile = dataManager.getUserProfile();
      // Only update if the profile actually changed
      setProfile(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(newProfile)) {
          return newProfile;
        }
        return prev;
      });
    });
    
    return () => unsubscribe();
  }, [propProfile]); // Only re-run if propProfile changes
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  const getTierColor = (tier: UserProfile['loyaltyTier']) => {
    switch (tier) {
      case 'platinum': return 'text-purple-600';
      case 'gold': return 'text-yellow-600';
      case 'silver': return 'text-gray-500';
      default: return 'text-amber-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header - Clickable to expand/collapse */}
      <div 
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-gray-600">
            <User className="h-7 w-7" />
          </div>
          <div>
            <h2 className="font-medium">{profile.name}</h2>
            <div className="flex items-center text-sm text-gray-500 gap-1">
              <Award className={`w-3 h-3 ${getTierColor(profile.loyaltyTier)}`} />
              <span className="capitalize">{profile.loyaltyTier}</span> Member
            </div>
          </div>
        </div>
        <div>
          {isExpanded ? (
            <ChevronUp className="text-gray-400" />
          ) : (
            <ChevronDown className="text-gray-400" />
          )}
        </div>
      </div>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Contact</h3>
              <p className="mt-1">{profile.email}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Loyalty Program</h3>
              <p className="mt-1">
                {profile.loyaltyPoints.toLocaleString()} points
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Upcoming Flights</h3>
              <div className="mt-2 space-y-2">
                {profile.upcomingFlights && profile.upcomingFlights.length > 0 ? (
                  profile.upcomingFlights.map((flight) => (
                    <div
                      key={flight.bookingReference}
                      className="bg-gray-50 p-3 rounded-md flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Plane className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">
                              Flight {flight.flightNumber}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {flight.scheduledTime ? format(new Date(flight.scheduledTime), 'MMM d, yyyy') : 'Date N/A'}
                            </div>
                            {(() => {
                              const flightData = dataManager.getFlight(flight.flightNumber);
                              return flightData && (
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {flightData.departure} → {flightData.arrival}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          flight.status === 'confirmed' 
                            ? 'bg-blue-100 text-blue-700'
                            : flight.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {flight.status}
                        </span>
                      </div>
                      {flight.seatInfo && (
                        <div className="text-xs text-gray-600 flex justify-between border-t border-gray-200 pt-2 mt-1">
                          <div>
                            <span className="font-medium">Seat:</span> {flight.seatInfo.seatNumber}
                          </div>
                          <div className="capitalize">
                            <span className="font-medium">Class:</span> {flight.class}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No upcoming flights</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}