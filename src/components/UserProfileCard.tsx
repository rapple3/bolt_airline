import React, { useEffect, useState } from 'react';
import { dataManager } from '../utils/dataManager';
import { UserProfile } from '../types';
import { Calendar, Plane, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface UserProfileCardProps {
  profile?: UserProfile; // Make this optional since we'll get it from dataManager
}

export default function UserProfileCard({ profile: propProfile }: UserProfileCardProps) {
  const [profile, setProfile] = useState<UserProfile>(propProfile || dataManager.getUserProfile());
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    console.log('Setting up subscription');
    const unsubscribe = dataManager.subscribe(() => {
      console.log('Subscription triggered');
      const newProfile = dataManager.getUserProfile();
      console.log('New profile:', newProfile);
      setProfile(newProfile);
    });
    
    return () => {
      console.log('Cleaning up subscription');
      unsubscribe();
    };
  }, []);
  
  useEffect(() => {
    if (propProfile) {
      setProfile(propProfile);
    }
  }, [propProfile]);
  
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
          <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden">
            <img 
              src={profile.avatarUrl} 
              alt={profile.name}
              className="h-full w-full object-cover"
            />
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
                      className="bg-gray-50 p-3 rounded-md flex items-center gap-3"
                    >
                      <Plane className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">
                          Flight {flight.flightNumber}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(flight.date), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                        {flight.status}
                      </span>
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