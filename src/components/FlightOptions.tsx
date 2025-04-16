import React, { useState } from 'react';
import { Plane, Clock, Calendar, Check, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

// Flight option interface - Update to match actual data structure
interface FlightOption {
  flightNumber: string;
  departure: string;
  arrival: string;
  scheduledTime: string;
  duration: string;
  aircraft: string;
  seats: {
    economy: Array<{ seatNumber: string; class: string; status: string; price: number; features?: string[] }>;
    comfortPlus: Array<{ seatNumber: string; class: string; status: string; price: number; features?: string[] }>;
    first: Array<{ seatNumber: string; class: string; status: string; price: number; features?: string[] }>;
    deltaOne: Array<{ seatNumber: string; class: string; status: string; price: number; features?: string[] }>;
  };
}

interface FlightOptionsProps {
  flights: FlightOption[];
  onSelect: (flightNumber: string, seatClass: 'economy' | 'comfortPlus' | 'first' | 'deltaOne') => void;
  actionType?: 'book' | 'change';
}

export const FlightOptions: React.FC<FlightOptionsProps> = ({ 
  flights, 
  onSelect, 
  actionType = 'book' 
}) => {
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  
  // Safety check - if flights is null or undefined, render an empty div
  if (!flights || !Array.isArray(flights) || flights.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
        No flights are currently available for this route and date.
      </div>
    );
  }
  
  // Helper to format date/time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: format(date, 'EEE, MMM d, yyyy'),
      time: format(date, 'h:mm a')
    };
  };
  
  return (
    <div className="mt-4 space-y-4">
      {flights.map((flight) => {
        // Safety check for flight data
        if (!flight || !flight.scheduledTime || !flight.seats) {
          return null; // Skip invalid flights
        }
        
        const { date, time } = formatDateTime(flight.scheduledTime);
        const isSelected = selectedFlight === flight.flightNumber;
        
        // Make sure all seat arrays exist
        const safeSeats = {
          economy: Array.isArray(flight.seats?.economy) ? flight.seats.economy : [],
          comfortPlus: Array.isArray(flight.seats?.comfortPlus) ? flight.seats.comfortPlus : [],
          first: Array.isArray(flight.seats?.first) ? flight.seats.first : [],
          deltaOne: Array.isArray(flight.seats?.deltaOne) ? flight.seats.deltaOne : []
        };
        
        return (
          <div 
            key={flight.flightNumber}
            className={`border rounded-lg p-3 ${
              isSelected 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <Plane className={`w-5 h-5 ${isSelected ? 'text-blue-500' : 'text-gray-400'} mr-2`} />
                <div>
                  <p className="font-medium">{flight.flightNumber}</p>
                  <p className="text-sm text-gray-500">{flight.aircraft}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{time}</p>
                <div className="flex items-center justify-end text-sm text-gray-500 mt-1">
                  <Calendar className="w-3 h-3 mr-1" />
                  <span>{date}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-2">
              <p className="font-medium">{flight.departure} → {flight.arrival}</p>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Clock className="w-3 h-3 mr-1" />
                <span>{flight.duration}</span>
              </div>
            </div>
            
            <h4 className="text-sm font-medium text-gray-700 mt-4 mb-2">Select Class:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {safeSeats.economy.length > 0 && (
                <button
                  className="px-3 py-2 rounded-md text-sm flex items-center justify-between border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  onClick={() => onSelect(flight.flightNumber, 'economy')}
                >
                  <div>
                    <span className="font-medium">Economy</span>
                    <p className="text-xs text-gray-500">{safeSeats.economy.length} seats</p>
                  </div>
                  <div className="flex items-center text-green-600">
                    <DollarSign className="w-3 h-3" />
                    <span>{safeSeats.economy[0].price}</span>
                  </div>
                </button>
              )}
              
              {safeSeats.comfortPlus.length > 0 && (
                <button
                  className="px-3 py-2 rounded-md text-sm flex items-center justify-between border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  onClick={() => onSelect(flight.flightNumber, 'comfortPlus')}
                >
                  <div>
                    <span className="font-medium">Comfort+</span>
                    <p className="text-xs text-gray-500">{safeSeats.comfortPlus.length} seats</p>
                  </div>
                  <div className="flex items-center text-green-600">
                    <DollarSign className="w-3 h-3" />
                    <span>{safeSeats.comfortPlus[0].price}</span>
                  </div>
                </button>
              )}
              
              {safeSeats.first.length > 0 && (
                <button
                  className="px-3 py-2 rounded-md text-sm flex items-center justify-between border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  onClick={() => onSelect(flight.flightNumber, 'first')}
                >
                  <div>
                    <span className="font-medium">First Class</span>
                    <p className="text-xs text-gray-500">{safeSeats.first.length} seats</p>
                  </div>
                  <div className="flex items-center text-green-600">
                    <DollarSign className="w-3 h-3" />
                    <span>{safeSeats.first[0].price}</span>
                  </div>
                </button>
              )}
              
              {safeSeats.deltaOne.length > 0 && (
                <button
                  className="px-3 py-2 rounded-md text-sm flex items-center justify-between border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  onClick={() => onSelect(flight.flightNumber, 'deltaOne')}
                >
                  <div>
                    <span className="font-medium">Delta One</span>
                    <p className="text-xs text-gray-500">{safeSeats.deltaOne.length} seats</p>
                  </div>
                  <div className="flex items-center text-green-600">
                    <DollarSign className="w-3 h-3" />
                    <span>{safeSeats.deltaOne[0].price}</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Helper function to parse duration string (e.g., "2h 30m") to milliseconds
const parseDuration = (duration: string): number => {
  const hoursMatch = duration.match(/(\d+)h/);
  const minutesMatch = duration.match(/(\d+)m/);
  
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  
  return (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
}; 