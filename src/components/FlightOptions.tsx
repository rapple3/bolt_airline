import React, { useState } from 'react';
import { Plane, Clock, Calendar, Check, DollarSign } from 'lucide-react';
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
  seats: {
    economy: Array<{ price: number; status: string }>;
    comfortPlus: Array<{ price: number; status: string }>;
    first: Array<{ price: number; status: string }>;
    deltaOne: Array<{ price: number; status: string }>;
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
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Economy</p>
                <p className="font-medium">{flight.seats.economy.length} seats</p>
                <div className="flex items-center justify-center mt-1 text-green-600">
                  <DollarSign className="w-3 h-3" />
                  <span>{flight.seats.economy[0]?.price || 'N/A'}</span>
                </div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Comfort+</p>
                <p className="font-medium">{flight.seats.comfortPlus.length} seats</p>
                <div className="flex items-center justify-center mt-1 text-green-600">
                  <DollarSign className="w-3 h-3" />
                  <span>{flight.seats.comfortPlus[0]?.price || 'N/A'}</span>
                </div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-gray-500">First Class</p>
                <p className="font-medium">{flight.seats.first.length} seats</p>
                <div className="flex items-center justify-center mt-1 text-green-600">
                  <DollarSign className="w-3 h-3" />
                  <span>{flight.seats.first[0]?.price || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            {selectedFlight === flight.flightNumber && flight.seats.deltaOne.length > 0 && (
              <div className="mt-2">
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <p className="text-blue-600">Delta One</p>
                  <div className="flex items-center justify-center mt-1 text-green-600">
                    <DollarSign className="w-3 h-3" />
                    <span>{flight.seats.deltaOne[0]?.price || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {selectedFlight && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Select Class:</h4>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            {(() => {
              const flight = flights.find(f => f.flightNumber === selectedFlight);
              if (!flight) return null;
              
              return (
                <>
                  <button
                    className={`px-3 py-2 rounded-md text-sm flex items-center justify-center ${
                      selectedClass === 'economy'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={() => handleClassSelect('economy')}
                  >
                    <span>Economy</span>
                    <div className="ml-2 flex items-center">
                      <DollarSign className="w-3 h-3" />
                      <span>{flight.seats.economy[0]?.price || 'N/A'}</span>
                    </div>
                  </button>
                  <button
                    className={`px-3 py-2 rounded-md text-sm flex items-center justify-center ${
                      selectedClass === 'comfortPlus'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={() => handleClassSelect('comfortPlus')}
                  >
                    <span>Comfort+</span>
                    <div className="ml-2 flex items-center">
                      <DollarSign className="w-3 h-3" />
                      <span>{flight.seats.comfortPlus[0]?.price || 'N/A'}</span>
                    </div>
                  </button>
                  <button
                    className={`px-3 py-2 rounded-md text-sm flex items-center justify-center ${
                      selectedClass === 'first'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={() => handleClassSelect('first')}
                  >
                    <span>First Class</span>
                    <div className="ml-2 flex items-center">
                      <DollarSign className="w-3 h-3" />
                      <span>{flight.seats.first[0]?.price || 'N/A'}</span>
                    </div>
                  </button>
                  {flight.seats.deltaOne.length > 0 && (
                    <button
                      className={`px-3 py-2 rounded-md text-sm flex items-center justify-center ${
                        selectedClass === 'deltaOne'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => handleClassSelect('deltaOne')}
                    >
                      <span>Delta One</span>
                      <div className="ml-2 flex items-center">
                        <DollarSign className="w-3 h-3" />
                        <span>{flight.seats.deltaOne[0]?.price || 'N/A'}</span>
                      </div>
                    </button>
                  )}
                </>
              );
            })()}
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