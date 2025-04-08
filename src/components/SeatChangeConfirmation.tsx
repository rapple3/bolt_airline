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
  bookingDetails: any;
  targetClass: 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
  seatPreference: 'window' | 'aisle' | 'middle' | 'any';
  onConfirm: (seatNumber: string, upgradeClass?: string) => void;
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
  const [loading, setLoading] = useState(true);
  const [loyaltyVerified, setLoyaltyVerified] = useState(true);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<string>('');
  const [errorAlert, setErrorAlert] = useState<string>("");
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);

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
    if (!userProfile || !bookingDetails) return;
    
    // Define the cabin classes in order from lowest to highest
    const cabinHierarchy = ['economy', 'comfortPlus', 'first', 'deltaOne'];
    // Get the current cabin class index
    const currentClassIndex = cabinHierarchy.indexOf(bookingDetails.class);
    
    const isGoldOrHigher = ['gold', 'platinum', 'diamond'].includes(userProfile.loyaltyTier);
    let availableUpgrades: { tier: string; price: number; complimentary: boolean }[] = [];
    
    // Only add Comfort+ if the current class is lower than Comfort+
    if (currentClassIndex < cabinHierarchy.indexOf('comfortPlus')) {
      if (isGoldOrHigher) {
        availableUpgrades.push({
          tier: 'Comfort+',
          price: 0,
          complimentary: true
        });
      } else {
        availableUpgrades.push({
          tier: 'Comfort+',
          price: 75,
          complimentary: false
        });
      }
    }
    
    // Only add First Class if the current class is lower than First Class
    if (currentClassIndex < cabinHierarchy.indexOf('first')) {
      if (['platinum', 'diamond'].includes(userProfile.loyaltyTier)) {
        availableUpgrades.push({
          tier: 'First Class',
          price: 0,
          complimentary: true
        });
      } else {
        availableUpgrades.push({
          tier: 'First Class',
          price: 250,
          complimentary: false
        });
      }
    }
    
    // Only add Delta One if the current class is lower than Delta One
    if (currentClassIndex < cabinHierarchy.indexOf('deltaOne')) {
      // Delta One is a premium option even for high status tiers
      availableUpgrades.push({
        tier: 'Delta One',
        price: userProfile.loyaltyTier === 'diamond' ? 0 : 450,
        complimentary: userProfile.loyaltyTier === 'diamond'
      });
    }
    
    setUpgradeOptions(availableUpgrades);
  }, [userProfile, bookingDetails]);
  
  const handleSeatSelect = (seatNumber: string) => {
    setSelectedSeat(seatNumber);
  };
  
  const handleConfirmUpgrade = (tier: string) => {
    if (!selectedSeat) {
      setErrorAlert("Please select a seat first");
      setTimeout(() => setErrorAlert(""), 3000);
      return;
    }
    // Just select the upgrade tier without showing confirmation yet
    setSelectedUpgradeTier(tier);
    // Don't set upgradeConfirmed here; it will be set later after final confirmation
  };
  
  const handleConfirmClick = () => {
    if (!selectedSeat) {
      setErrorAlert("Please select a seat first");
      setTimeout(() => setErrorAlert(""), 3000);
      return;
    }

    // Clear any previous errors
    setErrorAlert("");
    
    // If an upgrade is selected, show the upgrade confirmation alert
    if (selectedUpgradeTier && selectedUpgradeTier !== bookingDetails?.class) {
      setShowUpgradeConfirm(true);
      return;
    }
    
    // Otherwise just confirm the seat change
    setLoading(true);
    
    // Delay to simulate API call
    setTimeout(() => {
      onConfirm(selectedSeat, selectedUpgradeTier);
      setLoading(false);
    }, 1000);
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
      
      {errorAlert && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md mb-3">
          {errorAlert}
        </div>
      )}
      
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
              .filter(seat => seat.available && seat.type === seatPreference)
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
                    className={`bg-blue-500 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-600 ${
                      selectedUpgradeTier === option.tier ? 'bg-blue-700 ring-2 ring-blue-300' : ''
                    }`}
                  >
                    {selectedUpgradeTier === option.tier ? 'Selected' : 'Select'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {bookingDetails?.class === 'deltaOne' 
                ? "You're already in our highest class of service (Delta One)." 
                : bookingDetails?.class === 'first' && !upgradeOptions.length
                  ? "No higher cabin classes available for this flight. You're already in First Class."
                  : "No upgrade options available for your status."}
            </p>
          )}
        </div>
      )}
      
      {/* Add upgrade confirmation dialog */}
      {showUpgradeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Upgrade</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to upgrade to {selectedUpgradeTier} for this flight? 
              {upgradeOptions.find(o => o.tier === selectedUpgradeTier)?.complimentary 
                ? " This upgrade is complimentary with your loyalty status."
                : ` This will cost $${upgradeOptions.find(o => o.tier === selectedUpgradeTier)?.price}.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUpgradeConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowUpgradeConfirm(false);
                  setLoading(true);
                  // Delay to simulate API call
                  setTimeout(() => {
                    onConfirm(selectedSeat, selectedUpgradeTier);
                    setLoading(false);
                  }, 1000);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Confirm Upgrade
              </button>
            </div>
          </div>
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
          onClick={handleConfirmClick}
          className={`flex-1 py-2 px-4 ${!selectedSeat ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-md transition-colors flex justify-center items-center`}
        >
          <Check className="w-4 h-4 mr-2" />
          Confirm Seat Change
        </button>
      </div>
    </div>
  );
}; 