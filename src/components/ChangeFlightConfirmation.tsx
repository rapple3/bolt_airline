import React from 'react';
import { Check, X, ArrowRightCircle, Calendar, Clock, Plane } from 'lucide-react';
import { FlightData, BookingData } from '../types';

interface ChangeFlightConfirmationProps {
  bookingReference: string;
  currentFlight?: FlightData | null;
  newFlightNumber: string;
  newFlightDetails: FlightData;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ChangeFlightConfirmation: React.FC<ChangeFlightConfirmationProps> = ({
  bookingReference,
  currentFlight,
  newFlightNumber,
  newFlightDetails,
  onConfirm,
  onCancel
}) => {
  // Format flight details for new flight
  const newDepartureDate = new Date(newFlightDetails.scheduledTime);
  const newFormattedDate = newDepartureDate.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const newFormattedTime = newDepartureDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <div className="bg-white rounded-lg border border-blue-100 p-4 my-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-blue-100 p-2 rounded-full">
          <ArrowRightCircle className="text-blue-500 w-5 h-5" />
        </div>
        <h3 className="font-medium text-gray-800">Confirm Flight Change</h3>
      </div>
      
      <div className="mb-4">
        <div className="p-3 bg-amber-50 rounded-md border border-amber-100 mb-3">
          <p className="text-amber-700 text-sm">
            Please confirm you want to change your flight. Additional fees may apply.
          </p>
        </div>
        
        <div className="flex justify-between items-center border-b border-gray-100 py-2">
          <span className="text-sm text-gray-600">Booking Reference</span>
          <span className="font-medium">{bookingReference}</span>
        </div>
        
        {currentFlight && (
          <div className="mt-2 mb-3">
            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Current Flight</div>
            <div className="bg-gray-50 p-2 rounded border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{currentFlight.flightNumber}</span>
                <span className="text-xs text-gray-500">{new Date(currentFlight.scheduledTime).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs">{currentFlight.departure}</span>
                <span className="text-xs">→</span>
                <span className="text-xs">{currentFlight.arrival}</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-3 mb-1">
          <div className="text-xs text-gray-500 uppercase font-semibold mb-1">New Flight</div>
          <div className="bg-blue-50 p-2 rounded border border-blue-200">
            <div className="flex justify-between items-center border-b border-blue-100 pb-2">
              <div className="flex items-center">
                <Plane className="text-blue-500 mr-2 w-4 h-4" />
                <span className="text-sm text-gray-700">Flight</span>
              </div>
              <span className="font-medium">{newFlightNumber}</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-blue-100 py-2">
              <div className="flex items-center">
                <Calendar className="text-blue-500 mr-2 w-4 h-4" />
                <span className="text-sm text-gray-700">Date</span>
              </div>
              <span className="font-medium">{newFormattedDate}</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-blue-100 py-2">
              <div className="flex items-center">
                <Clock className="text-blue-500 mr-2 w-4 h-4" />
                <span className="text-sm text-gray-700">Time</span>
              </div>
              <span className="font-medium">{newFormattedTime}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-700">Route</span>
              <span className="font-medium">{newFlightDetails.departure} → {newFlightDetails.arrival}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-2 mt-4">
        <button
          onClick={onCancel}
          className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors flex justify-center items-center"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex justify-center items-center"
        >
          <Check className="w-4 h-4 mr-2" />
          Confirm Change
        </button>
      </div>
    </div>
  );
}; 