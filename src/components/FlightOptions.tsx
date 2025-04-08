import React, { useState } from 'react';
import { Plane, Clock, Calendar, Check } from 'lucide-react';
import { format } from 'date-fns';

// Flight option interface
interface FlightOption {
  flightNumber: string;
  departure: string;
  arrival: string;
  scheduledTime: string;
  duration: string;
  aircraft: string;
  economySeats: number;
  businessSeats: number;
  firstClassSeats: number;
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
  const [selectedClass, setSelectedClass] = useState<'economy' | 'comfortPlus' | 'first' | 'deltaOne'>('economy');
  
  const handleFlightSelect = (flightNumber: string) => {
    setSelectedFlight(flightNumber);
  };
  
  const handleClassSelect = (seatClass: 'economy' | 'comfortPlus' | 'first' | 'deltaOne') => {
    setSelectedClass(seatClass);
  };
  
  const handleConfirm = () => {
    if (selectedFlight) {
      onSelect(selectedFlight, selectedClass);
    }
  };
  
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
        const { date, time } = formatDateTime(flight.scheduledTime);
        const isSelected = selectedFlight === flight.flightNumber;
        
        return (
          <div 
            key={flight.flightNumber}
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              isSelected 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleFlightSelect(flight.flightNumber)}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <Plane className={`w-5 h-5 ${isSelected ? 'text-blue-500' : 'text-gray-400'} mr-2`} />
                <div>
                  <p className="font-medium">{flight.flightNumber}</p>
                  <p className="text-sm text-gray-500">{flight.aircraft}</p>
                </div>
              </div>
              {isSelected && (
                <div className="bg-blue-500 text-white p-1 rounded-full">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>
            
            <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center">
              <div>
                <p className="font-medium">{flight.departure} → {flight.arrival}</p>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>{flight.duration}</span>
                </div>
              </div>
              <div className="mt-2 sm:mt-0 sm:text-right">
                <p className="font-medium">{time}</p>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Calendar className="w-3 h-3 mr-1" />
                  <span>{date}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div className="text-center">
                <p className="text-gray-500">Economy</p>
                <p className="font-medium">{flight.economySeats} seats</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">Comfort+</p>
                <p className="font-medium">{flight.businessSeats} seats</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">First Class</p>
                <p className="font-medium">{flight.firstClassSeats} seats</p>
              </div>
            </div>
          </div>
        );
      })}
      
      {selectedFlight && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Select Class:</h4>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button
              className={`px-3 py-2 rounded-md text-sm ${
                selectedClass === 'economy'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => handleClassSelect('economy')}
            >
              Economy
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm ${
                selectedClass === 'comfortPlus'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => handleClassSelect('comfortPlus')}
            >
              Comfort+
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm ${
                selectedClass === 'first'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => handleClassSelect('first')}
            >
              First Class
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm ${
                selectedClass === 'deltaOne'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => handleClassSelect('deltaOne')}
            >
              Delta One
            </button>
          </div>
          
          <button
            className="mt-4 w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            onClick={handleConfirm}
          >
            {actionType === 'book' ? 'Book This Flight' : 'Change to This Flight'}
          </button>
        </div>
      )}
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