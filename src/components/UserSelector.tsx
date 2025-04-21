import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
// import { mockUserProfiles } from '../data/mockData'; // Remove direct import of mock data
import { dataManager } from '../utils/dataManager'; // Import dataManager
import { ChevronDown, Award, User } from 'lucide-react';

interface UserSelectorProps {
  onSelectUser: (profile: UserProfile) => void;
  currentUserId: string;
}

export default function UserSelector({ onSelectUser, currentUserId }: UserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  // State to hold the profiles fetched from dataManager
  const [profiles, setProfiles] = useState<UserProfile[]>([]); 
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Effect to fetch profiles and subscribe to updates
  useEffect(() => {
    // Initial fetch
    const fetchedProfiles = dataManager.getAllUserProfilesWithDetails();
    setProfiles(fetchedProfiles);

    // Subscribe to changes in dataManager
    const unsubscribe = dataManager.subscribe(() => {
      console.log('UserSelector: dataManager updated, re-fetching profiles...');
      const updatedProfiles = dataManager.getAllUserProfilesWithDetails();
      setProfiles(updatedProfiles);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs only once on mount and cleans up on unmount
  
  // Find the current profile from the state, fallback safely if profiles array is empty initially
  const currentProfile = profiles.find(p => p.customerId === currentUserId) || (profiles.length > 0 ? profiles[0] : null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'diamond': return 'text-blue-600';
      case 'platinum': return 'text-purple-600';
      case 'gold': return 'text-yellow-600';
      case 'silver': return 'text-gray-500';
      default: return 'text-amber-700'; // blue tier
    }
  };

  // Handle case where currentProfile might be null initially
  if (!currentProfile) {
    return <div>Loading user...</div>; // Or some other loading indicator
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 bg-white transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-gray-600">
            <User className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">{currentProfile.name}</p>
            <div className="flex items-center gap-1">
              <Award className={`w-3 h-3 ${getTierColor(currentProfile.loyaltyTier)}`} />
              <p className="text-xs text-gray-500 capitalize">{currentProfile.loyaltyTier}</p>
            </div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg z-50 py-2">
          {profiles.map(profile => (
            <button
              key={profile.customerId}
              onClick={() => {
                onSelectUser(profile);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                profile.customerId === currentUserId ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-gray-600">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">{profile.name}</p>
                  <div className="flex items-center gap-1">
                    <Award className={`w-3 h-3 ${getTierColor(profile.loyaltyTier)}`} />
                    <p className="text-sm text-gray-500 capitalize">{profile.loyaltyTier} Member</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {/* Use the length from the fetched profile */}
                    {profile.upcomingFlights ? profile.upcomingFlights.length : 0} upcoming flights
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 