import React from 'react';
import { Check, X, Plane, Calendar, Clock, CreditCard } from 'lucide-react';
import { FlightData } from '../types';

interface BookingConfirmationProps {
  flightNumber: string;
  seatClass: 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
  flightDetails: FlightData;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  flightNumber,
  seatClass,
  flightDetails,
  onConfirm,
  onCancel
}) => {
  // Get seat price from flight details
  const seatInfo = flightDetails.seats[seatClass].find(seat => seat.status === 'available');
  const price = seatInfo?.price || 0;
  
  // Format flight details
  const departureDate = new Date(flightDetails.scheduledTime);
  const formattedDate = departureDate.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const formattedTime = departureDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <div className="bg-white rounded-lg border border-blue-100 p-4 my-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-blue-100 p-2 rounded-full">
          <Plane className="text-blue-500 w-5 h-5" />
        </div>
        <h3 className="font-medium text-gray-800">Confirm Your Booking</h3>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center border-b border-gray-100 py-2">
          <div className="flex items-center">
            <Calendar className="text-gray-400 mr-2 w-4 h-4" />
            <span className="text-sm text-gray-600">Date</span>
          </div>
          <span className="font-medium">{formattedDate}</span>
        </div>
        
        <div className="flex justify-between items-center border-b border-gray-100 py-2">
          <div className="flex items-center">
            <Clock className="text-gray-400 mr-2 w-4 h-4" />
            <span className="text-sm text-gray-600">Time</span>
          </div>
          <span className="font-medium">{formattedTime}</span>
        </div>
        
        <div className="flex justify-between items-center border-b border-gray-100 py-2">
          <div className="flex items-center">
            <Plane className="text-gray-400 mr-2 w-4 h-4" />
            <span className="text-sm text-gray-600">Flight</span>
          </div>
          <span className="font-medium">{flightNumber}</span>
        </div>
        
        <div className="flex justify-between items-center border-b border-gray-100 py-2">
          <div className="flex items-center">
            <span className="text-gray-600 text-sm">From</span>
          </div>
          <span className="font-medium">{flightDetails.departure}</span>
        </div>
        
        <div className="flex justify-between items-center border-b border-gray-100 py-2">
          <div className="flex items-center">
            <span className="text-gray-600 text-sm">To</span>
          </div>
          <span className="font-medium">{flightDetails.arrival}</span>
        </div>
        
        <div className="flex justify-between items-center border-b border-gray-100 py-2">
          <div className="flex items-center">
            <span className="text-gray-600 text-sm">Duration</span>
          </div>
          <span className="font-medium">{flightDetails.duration}</span>
        </div>
        
        <div className="flex justify-between items-center border-b border-gray-100 py-2">
          <div className="flex items-center">
            <span className="text-gray-600 text-sm">Class</span>
          </div>
          <span className="font-medium capitalize">{seatClass}</span>
        </div>
        
        <div className="flex justify-between items-center py-2">
          <div className="flex items-center">
            <CreditCard className="text-gray-400 mr-2 w-4 h-4" />
            <span className="text-gray-600 text-sm">Price</span>
          </div>
          <span className="font-medium text-green-600">${price}</span>
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
          onClick={() => { 
              console.log('[BookingConfirmation] Confirm button raw click!');
              onConfirm();
          }}
          className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex justify-center items-center"
        >
          <Check className="w-4 h-4 mr-2" />
          Confirm Booking
        </button>
      </div>
    </div>
  );
}; 