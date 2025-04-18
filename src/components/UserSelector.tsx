import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { mockUserProfiles } from '../data/mockData';
import { ChevronDown, Award, User } from 'lucide-react';

interface UserSelectorProps {
  onSelectUser: (profile: UserProfile) => void;
  currentUserId: string;
}

export default function UserSelector({ onSelectUser, currentUserId }: UserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Use the mockUserProfiles to get the list of profiles
  const profiles = mockUserProfiles;
  const currentProfile = profiles.find(p => p.customerId === currentUserId) || profiles[0];

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
                    {profile.upcomingFlights.length} upcoming flights
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