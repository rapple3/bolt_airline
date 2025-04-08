import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { mockUserProfile } from '../data/mockData';
import { dataManager } from '../utils/dataManager';
import { ChevronDown, Award } from 'lucide-react';

interface UserSelectorProps {
  onSelectUser: (profile: UserProfile) => void;
}

export default function UserSelector({ onSelectUser }: UserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Get the current user profile
  const currentProfile = dataManager.getUserProfile();

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
          <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden">
            <img 
              src={currentProfile.avatarUrl} 
              alt={currentProfile.name}
              className="h-full w-full object-cover"
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

      {/* For this version, we'll disable the dropdown since we only have one profile */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg z-50 py-2">
          <div className="px-4 py-2 text-center text-sm text-gray-500">
            User selection has been simplified in this Delta Airlines version.
            <br /><br />
            Currently using the profile of: <span className="font-medium">{currentProfile.name}</span>
          </div>
        </div>
      )}
    </div>
  );
} 