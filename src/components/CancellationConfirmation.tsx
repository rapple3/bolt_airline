import React, { useState } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import { BookingData } from '../types';

interface CancellationConfirmationProps {
  bookingReference: string;
  bookingDetails?: BookingData;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CancellationConfirmation: React.FC<CancellationConfirmationProps> = ({
  bookingReference,
  bookingDetails,
  onConfirm,
  onCancel
}) => {
  const [refundOption, setRefundOption] = useState<'eCredit' | 'refund' | null>(null);
  const [showEscalateOption, setShowEscalateOption] = useState(false);
  
  // Determine if the booking is within 24 hours of creation for 24-hour refund policy
  const isWithin24Hours = bookingDetails && (bookingDetails as any).createdAt ? 
    (new Date().getTime() - new Date((bookingDetails as any).createdAt).getTime()) < (24 * 60 * 60 * 1000) : false;
  
  // Determine if it's a refundable fare
  const isRefundable = bookingDetails && (bookingDetails as any).fareType === 'refundable';
  
  // Determine if flight is more than 7 days away (for 24-hour policy)
  const flightDate = bookingDetails?.date ? new Date(bookingDetails.date) : null;
  const isMoreThan7DaysAway = flightDate ? 
    (flightDate.getTime() - new Date().getTime()) > (7 * 24 * 60 * 60 * 1000) : false;
  
  // Check if the 24-hour refund policy applies
  const qualifiesFor24HourRefund = isWithin24Hours && isMoreThan7DaysAway;
  
  // Overall refund eligibility
  const isRefundEligible = isRefundable || qualifiesFor24HourRefund;
  
  const handleRefundOptionSelect = (option: 'eCredit' | 'refund') => {
    setRefundOption(option);
    
    // If user selects refund for non-refundable ticket, show escalation option
    if (option === 'refund' && !isRefundEligible) {
      setShowEscalateOption(true);
    } else if (option === 'eCredit' || isRefundEligible) {
      // For eCredit or eligible refunds, proceed normally
      setShowEscalateOption(false);
    }
  };
  
  const handleConfirm = () => {
    // Only proceed with cancellation if they've selected an option and it's not escalation
    if (refundOption && !showEscalateOption) {
      onConfirm();
    }
  };
  
  return (
    <div className="bg-white rounded-lg border border-red-100 p-4 my-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-red-100 p-2 rounded-full">
          <AlertTriangle className="text-red-500 w-5 h-5" />
        </div>
        <h3 className="font-medium text-gray-800">Confirm Cancellation</h3>
      </div>
      
      <div className="mb-4">
        <div className="p-3 bg-red-50 rounded-md border border-red-100 mb-3">
          <p className="text-red-700 text-sm">
            Are you sure you want to cancel this booking? This action cannot be undone.
          </p>
        </div>
        
        {/* Refund Policy Information */}
        <div className="p-3 bg-blue-50 rounded-md border border-blue-100 mb-3">
          <div className="flex items-start gap-2">
            <Info className="text-blue-500 w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-blue-700 text-sm font-medium mb-1">Refund Policy</p>
              {isRefundEligible ? (
                <p className="text-blue-700 text-sm">
                  {isRefundable ? 
                    'Your ticket is fully refundable.' :
                    'Your ticket qualifies for a full refund under our 24-hour cancellation policy.'}
                </p>
              ) : (
                <p className="text-blue-700 text-sm">
                  Your ticket is non-refundable, but you qualify for an eCredit that can be used for future travel.
                </p>
              )}
            </div>
          </div>
        </div>
        
        {bookingDetails ? (
          <>
            <div className="flex justify-between items-center border-b border-gray-100 py-2">
              <span className="text-sm text-gray-600">Booking Reference</span>
              <span className="font-medium">{bookingReference}</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-gray-100 py-2">
              <span className="text-sm text-gray-600">Flight</span>
              <span className="font-medium">{bookingDetails.flightNumber}</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-gray-100 py-2">
              <span className="text-sm text-gray-600">Date</span>
              <span className="font-medium">{bookingDetails.date}</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-gray-100 py-2">
              <span className="text-sm text-gray-600">Passenger</span>
              <span className="font-medium">{bookingDetails.passengerName}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Class</span>
              <span className="font-medium capitalize">{bookingDetails.class}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-600">Booking Reference</span>
            <span className="font-medium">{bookingReference}</span>
          </div>
        )}
        
        {/* Refund Options */}
        {!showEscalateOption && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Please select an option:</p>
            
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => handleRefundOptionSelect('eCredit')}
                className={`flex-1 py-2 px-3 border rounded-md text-sm flex justify-center items-center ${
                  refundOption === 'eCredit' 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                eCredit for Future Travel
              </button>
              
              <button
                onClick={() => handleRefundOptionSelect('refund')}
                className={`flex-1 py-2 px-3 border rounded-md text-sm flex justify-center items-center ${
                  refundOption === 'refund' 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Request Refund
              </button>
            </div>
            
            {refundOption === 'refund' && !isRefundEligible && (
              <p className="text-sm text-red-600 mb-2">
                Your ticket doesn't qualify for a refund under our standard policy.
              </p>
            )}
          </div>
        )}
        
        {/* Escalation Option */}
        {showEscalateOption && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-100">
            <p className="text-sm text-yellow-800 mb-2">
              Your ticket is non-refundable under our standard policy. Would you like to:
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowEscalateOption(false);
                  setRefundOption('eCredit');
                }}
                className="flex-1 py-2 px-3 border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Accept eCredit
              </button>
              <button
                onClick={() => {
                  // This would typically trigger a handoff to a human agent
                  alert('This would escalate to a supervisor in a real implementation');
                }}
                className="flex-1 py-2 px-3 bg-yellow-100 border border-yellow-200 rounded-md text-sm text-yellow-800 hover:bg-yellow-200"
              >
                Speak to Supervisor
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex gap-2 mt-4">
        <button
          onClick={onCancel}
          className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors flex justify-center items-center"
        >
          <X className="w-4 h-4 mr-2" />
          Keep Booking
        </button>
        <button
          onClick={handleConfirm}
          disabled={!refundOption || showEscalateOption}
          className={`flex-1 py-2 px-4 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex justify-center items-center ${
            (!refundOption || showEscalateOption) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Check className="w-4 h-4 mr-2" />
          Cancel Booking
        </button>
      </div>
    </div>
  );
}; 