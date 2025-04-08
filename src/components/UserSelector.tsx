import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { mockUserProfiles } from '../data/mockData';
import { ChevronDown, Award } from 'lucide-react';

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

  // Helper function to ensure avatar URLs are resolved correctly
  const getAvatarUrl = (url: string) => {
    // If URL is already absolute, return as is
    if (url.startsWith('http')) return url;
    
    // If URL already starts with a slash, assume it's correct
    if (url.startsWith('/')) return url;
    
    // Otherwise, ensure it starts with a slash
    return `/${url}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 bg-white transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden">
            <img 
              src={getAvatarUrl(currentProfile.avatarUrl)} 
              alt={currentProfile.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                console.error(`Failed to load image: ${target.src}`);
                target.onerror = null;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS11c2VyIj48cGF0aCBkPSJNMTkgMjFhNyA3IDAgMCAwLTE0IDAiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEwIiByPSI0Ii8+PC9zdmc+';
              }}
            />
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
                <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden">
                  <img 
                    src={getAvatarUrl(profile.avatarUrl)} 
                    alt={profile.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      console.error(`Failed to load image: ${target.src}`);
                      target.onerror = null;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS11c2VyIj48cGF0aCBkPSJNMTkgMjFhNyA3IDAgMCAwLTE0IDAiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEwIiByPSI0Ii8+PC9zdmc+';
                    }}
                  />
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