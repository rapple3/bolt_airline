import React, { useState, useEffect } from 'react';
import { BookingData, UserProfile, FlightData } from '../types';
import { dataManager } from '../utils/dataManager';
import { X, ArrowRight, Check, Award } from 'lucide-react';

// Define a CSS module
const styles = {
  container: "bg-white rounded-lg border border-blue-100 p-4 my-2",
  loading: "text-center text-gray-500",
  loyaltySection: "mb-4 border-t border-gray-100 pt-4",
  statusBar: "flex items-center gap-2 mb-2 p-2 rounded text-gray-800",
  seatSelection: "mb-4",
  seatGrid: "grid grid-cols-3 gap-2 mb-4",
  seat: "p-3 rounded border text-sm flex flex-col items-center border-gray-200 hover:bg-gray-50",
  selected: "bg-blue-100 border-blue-300 text-blue-700",
  upgradeSection: "mb-4 border-t border-gray-100 pt-4",
  upgradeOptions: "flex flex-col gap-2",
  upgradeOption: "flex justify-between items-center p-3 border border-gray-200 rounded-md",
  confirmation: "p-3 bg-green-50 rounded-md border border-green-100 mb-4",
  actions: "flex gap-2 mt-4"
};

interface SeatChangeConfirmationProps {
  bookingReference: string;
  bookingDetails?: BookingData;
  targetClass?: 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
  seatPreference?: 'window' | 'middle' | 'aisle' | 'any';
  onConfirm: (seatNumber: string, upgradeTier?: string) => void;
  onCancel: () => void;
}

interface SeatOption {
  number: string;
  type: 'window' | 'middle' | 'aisle';
  available: boolean;
}

export const SeatChangeConfirmation: React.FC<SeatChangeConfirmationProps> = ({
  bookingReference,
  bookingDetails,
  targetClass = 'economy',
  seatPreference = 'aisle',
  onConfirm,
  onCancel
}) => {
  const [availableSeats, setAvailableSeats] = useState<SeatOption[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string>('');
  const [upgradeOptions, setUpgradeOptions] = useState<{ tier: string; price: number; complimentary: boolean }[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(dataManager.getUserProfile());
  const [flight, setFlight] = useState<FlightData | null>(null);
  const [upgradeConfirmed, setUpgradeConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loyaltyVerified, setLoyaltyVerified] = useState(false);
  const [skymiles, setSkymiles] = useState('');

  useEffect(() => {
    // Load flight and seats
    if (bookingDetails) {
      const mockSeats = Array.from({ length: 10 }, (_, i) => {
        const row = Math.floor(i / 3) + 1;
        const col = ['A', 'B', 'C'][i % 3];
        const seat = {
          seatNumber: `${row}${col}`,
          occupied: Math.random() > 0.7
        };
        
        // Determine seat type based on position
        let type: 'window' | 'middle' | 'aisle';
        if (col === 'A') {
          type = 'window';
        } else if (col === 'B') {
          type = 'middle';
        } else {
          type = 'aisle';
        }
        
        return {
          number: seat.seatNumber,
          type,
          available: !seat.occupied
        };
      });
      
      setAvailableSeats(mockSeats);
      setLoading(false);
    }
  }, [bookingDetails]);
  
  useEffect(() => {
    // Check for upgrade eligibility based on user loyalty
    if (!userProfile) return;
    
    const isGoldOrHigher = ['gold', 'platinum', 'diamond'].includes(userProfile.loyaltyTier);
    
    if (isGoldOrHigher) {
      setUpgradeOptions([{
        tier: 'Comfort+',
        price: 0,
        complimentary: true
      }]);
      
      // Add first class for platinum and diamond
      if (['platinum', 'diamond'].includes(userProfile.loyaltyTier)) {
        setUpgradeOptions(prev => [...prev, {
          tier: 'First Class',
          price: 0,
          complimentary: true
        }]);
      }
    } else {
      // For non-elite members or Silver, offer paid upgrade
      setUpgradeOptions([{
        tier: 'Comfort+',
        price: 75,
        complimentary: false
      }, {
        tier: 'First Class',
        price: 250,
        complimentary: false
      }]);
    }
  }, [userProfile]);
  
  const handleLoyaltyVerification = () => {
    // Mock loyalty verification
    setLoading(true);
    setTimeout(() => {
      // In a real app, we would verify against a database
      // For demo purposes, set to true and use current profile
      setLoyaltyVerified(true);
      setLoading(false);
    }, 1000);
  };
  
  const handleSeatSelect = (seatNumber: string) => {
    setSelectedSeat(seatNumber);
  };
  
  const handleConfirmUpgrade = (tier: string) => {
    if (!selectedSeat) {
      alert('Please select a seat first.');
      return;
    }
    setUpgradeConfirmed(true);
  };
  
  const handleFinalConfirmation = () => {
    onConfirm(selectedSeat, upgradeConfirmed ? upgradeOptions[0]?.tier : undefined);
  };
  
  const getTierColor = (tier: string): string => {
    switch(tier.toLowerCase()) {
      case 'silver': return 'text-gray-600';
      case 'gold': return 'text-yellow-600';
      case 'platinum': return 'text-blue-700';
      case 'diamond': return 'text-purple-700';
      default: return 'text-gray-500';
    }
  };
  
  if (loading) {
    return (
      <div className={styles.loading}>Loading seat availability...</div>
    );
  }
  
  return (
    <div className={styles.container}>
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-blue-100 p-2 rounded-full">
          <Award className="text-blue-500 w-5 h-5" />
        </div>
        <h3 className="font-medium text-gray-800">Seat Change Request for Booking {bookingReference}</h3>
      </div>
      
      {!loyaltyVerified ? (
        <div className={styles.loyaltySection}>
          <p>To check upgrade eligibility, please enter your SkyMiles number:</p>
          <div className="flex gap-2 mt-2">
            <input
              value={skymiles}
              onChange={(e) => setSkymiles(e.target.value)}
              placeholder="Enter SkyMiles number"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <button 
              onClick={handleLoyaltyVerification}
              className="bg-blue-500 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-600"
            >
              Verify Status
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.statusBar}>
            <h4 className="text-sm font-medium text-gray-700">SkyMiles Status:</h4>
            <span className={`text-sm font-medium capitalize ${getTierColor(userProfile.loyaltyTier)}`}>
              {userProfile.loyaltyTier} Medallion
            </span>
          </div>
          
          <div className={styles.seatSelection}>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Available {targetClass} Seats ({seatPreference} preference):</h4>
            {availableSeats.length > 0 ? (
              <div className={styles.seatGrid}>
                {availableSeats
                  .filter(seat => seat.available && (seatPreference === 'any' || seat.type === seatPreference))
                  .map(seat => (
                    <div 
                      key={seat.number}
                      className={`${styles.seat} ${selectedSeat === seat.number ? styles.selected : ''}`}
                      onClick={() => handleSeatSelect(seat.number)}
                    >
                      <span className="font-medium">{seat.number}</span>
                      <span className="text-xs text-gray-500 capitalize">{seat.type}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-red-600 mb-4">No {seatPreference} seats available in {targetClass}. Try another preference or class.</p>
            )}
          </div>
          
          {selectedSeat && (
            <div className={styles.upgradeSection}>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Upgrade Options:</h4>
              {upgradeOptions.length > 0 ? (
                <div className={styles.upgradeOptions}>
                  {upgradeOptions.map((option, idx) => (
                    <div key={idx} className={styles.upgradeOption}>
                      <span className="text-sm">
                        {option.tier} - {option.complimentary ? 
                          <span className="text-green-600">Complimentary (Medallion Benefit)</span> : 
                          <span className="text-blue-600">${option.price}</span>}
                      </span>
                      <button 
                        onClick={() => handleConfirmUpgrade(option.tier)}
                        className="bg-blue-500 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-600"
                      >
                        {option.complimentary ? 'Request Upgrade' : 'Purchase Upgrade'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No upgrade options available for your status.</p>
              )}
            </div>
          )}
          
          {upgradeConfirmed && (
            <div className={styles.confirmation}>
              <h5 className="font-medium text-green-800 mb-1">Upgrade Request Confirmed</h5>
              <p className="text-sm text-green-700">
                Your upgrade will be processed 72 hours before departure based on availability.
              </p>
            </div>
          )}
          
          <div className={styles.actions}>
            <button 
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors flex justify-center items-center"
              onClick={onCancel}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </button>
            <button 
              disabled={!selectedSeat} 
              onClick={handleFinalConfirmation}
              className={`flex-1 py-2 px-4 ${!selectedSeat ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-md transition-colors flex justify-center items-center`}
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm Seat Change
            </button>
          </div>
        </>
      )}
    </div>
  );
}; 