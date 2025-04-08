import React from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
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
          onClick={onConfirm}
          className="flex-1 py-2 px-4 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex justify-center items-center"
        >
          <Check className="w-4 h-4 mr-2" />
          Cancel Booking
        </button>
      </div>
    </div>
  );
}; 