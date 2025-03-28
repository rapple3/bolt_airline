import React, { useState } from 'react';
import { ActionResult } from '../utils/actionHandler';
import { Check, X, Plane, CreditCard, Luggage, MapPin, Calendar } from 'lucide-react';
import { FlightOptions } from './FlightOptions';
import { dataManager } from '../utils/dataManager';

interface ActionResultProps {
  result: ActionResult;
}

export const ActionResultCard: React.FC<ActionResultProps> = ({ result }) => {
  const { success, message, data } = result;
  const [actionComplete, setActionComplete] = useState(false);
  const [actionResult, setActionResult] = useState<{
    success: boolean;
    message: string;
    details?: Record<string, any>;
  } | null>(null);

  // Choose icon based on action type inferred from message
  const getIcon = () => {
    const msg = message.toLowerCase();
    
    if (msg.includes('book')) return <Plane className="text-blue-500" />;
    if (msg.includes('cancel')) return <X className="text-red-500" />;
    if (msg.includes('change flight')) return <Plane className="text-green-500" />;
    if (msg.includes('change seat')) return <MapPin className="text-purple-500" />;
    if (msg.includes('check')) return <Check className="text-green-500" />;
    if (msg.includes('baggage')) return <Luggage className="text-blue-500" />;
    if (msg.includes('found')) return <Calendar className="text-blue-500" />;
    
    // Default icon
    return success ? 
      <Check className="text-green-500" /> : 
      <X className="text-red-500" />;
  };

  // Handle flight selection for booking or changing
  const handleSelectFlight = (flightNumber: string, seatClass: 'economy' | 'business' | 'first') => {
    // Determine if this is a booking or flight change action
    const actionType = determineActionType();
    let success = false;
    let resultMessage = '';
    let details = {};
    
    if (actionType === 'book') {
      // Book a new flight
      success = dataManager.createBooking(flightNumber, seatClass);
      resultMessage = success 
        ? `Successfully booked flight ${flightNumber} in ${seatClass} class.`
        : `Failed to book flight ${flightNumber}. The flight may be unavailable or full in ${seatClass} class.`;
      details = { flightNumber, class: seatClass };
    } 
    else if (actionType === 'change' && data?.bookingReference) {
      // Change an existing booking to a new flight
      success = dataManager.changeFlight(data.bookingReference, flightNumber);
      resultMessage = success 
        ? `Successfully changed booking ${data.bookingReference} to flight ${flightNumber}.`
        : `Failed to change to flight ${flightNumber}. The flight may be unavailable.`;
      details = { bookingReference: data.bookingReference, newFlightNumber: flightNumber };
    }
    
    setActionResult({
      success,
      message: resultMessage,
      details
    });
    
    setActionComplete(true);
  };
  
  // Determine if this is a booking or flight change operation based on the message
  const determineActionType = (): 'book' | 'change' => {
    const msg = message.toLowerCase();
    return msg.includes('change') ? 'change' : 'book';
  };

  // Process flights data to the format FlightOptions component expects
  const processFlightsData = () => {
    if (!data || !Array.isArray(data)) return [];
    
    return data.map(flight => ({
      flightNumber: flight.flightNumber,
      departure: flight.departure,
      arrival: flight.arrival,
      scheduledTime: flight.scheduledTime,
      duration: flight.duration,
      aircraft: flight.aircraft,
      economySeats: flight.seats?.economy?.filter((seat: any) => seat.status === 'available').length || 0,
      businessSeats: flight.seats?.business?.filter((seat: any) => seat.status === 'available').length || 0,
      firstClassSeats: flight.seats?.first?.filter((seat: any) => seat.status === 'available').length || 0
    }));
  };

  // Check if this is a flight search result with options
  const isFlightSearch = success && data && Array.isArray(data);
  const actionType = determineActionType();
  const processedFlights = isFlightSearch ? processFlightsData() : [];

  // Format message based on search results
  const getFormattedMessage = () => {
    if (isFlightSearch && processedFlights.length > 0) {
      const flight = processedFlights[0]; // Get first flight for info
      let dateInfo = '';
      
      try {
        const date = new Date(flight.scheduledTime);
        dateInfo = date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        });
      } catch (e) {
        // If date parsing fails, use the original message
        return message;
      }
      
      return `Found ${processedFlights.length} flights from ${flight.departure} to ${flight.arrival} on ${dateInfo}`;
    }
    
    return message;
  };

  return (
    <div className={`p-3 sm:p-4 rounded-lg border ${
      success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
    } mb-4`}>
      <div className="flex flex-col sm:flex-row sm:gap-3">
        <div className={`flex items-center sm:block mb-2 sm:mb-0 ${
          success ? 'text-green-700' : 'text-red-700'
        }`}>
          <div className={`p-2 rounded-full ${
            success ? 'bg-green-100' : 'bg-red-100'
          } h-fit mr-2 sm:mr-0`}>
            {getIcon()}
          </div>
          <h3 className="font-medium sm:hidden">
            {success ? 'Success' : 'Error'}
          </h3>
        </div>
        
        <div className="flex-1">
          <h3 className={`font-medium hidden sm:block ${
            success ? 'text-green-700' : 'text-red-700'
          } mb-1`}>
            {success ? 'Success' : 'Error'}
          </h3>
          <p className="text-gray-600 text-sm sm:text-base">{isFlightSearch ? getFormattedMessage() : message}</p>
          
          {/* Show flight options if this is a flight search result */}
          {isFlightSearch && !actionComplete && processedFlights.length > 0 && (
            <div className="mt-3">
              <h3 className="font-medium text-gray-700 text-sm sm:text-base">Available Flights:</h3>
              <FlightOptions 
                flights={processedFlights} 
                onSelect={handleSelectFlight}
                actionType={actionType}
              />
            </div>
          )}
          
          {/* Show action completion result if action was performed */}
          {actionComplete && actionResult && (
            <div className={`mt-4 p-3 sm:p-4 rounded-lg border ${
              actionResult.success ? 'border-green-200 bg-green-100' : 'border-red-200 bg-red-100'
            }`}>
              <div className="flex items-center gap-2">
                {actionResult.success 
                  ? <Check className="w-4 h-4 text-green-600" /> 
                  : <X className="w-4 h-4 text-red-600" />
                }
                <h4 className={`font-medium text-sm sm:text-base ${
                  actionResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {actionResult.success ? 'Action Completed' : 'Action Failed'}
                </h4>
              </div>
              <p className="mt-2 text-sm sm:text-base text-gray-700">{actionResult.message}</p>
              
              {actionResult.details && (
                <div className="mt-3 bg-white rounded border border-gray-100 p-2 sm:p-3">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Details</h4>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                    {Object.entries(actionResult.details).map(([key, value]) => (
                      <React.Fragment key={key}>
                        <dt className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</dt>
                        <dd className="font-medium">{String(value)}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )}
          
          {/* Render generic action details for other action types */}
          {success && data && !isFlightSearch && !actionComplete && (
            <div className="mt-3 bg-white rounded border border-gray-100 p-2 sm:p-3">
              <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Details</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                {Object.entries(data).map(([key, value]) => (
                  <React.Fragment key={key}>
                    <dt className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</dt>
                    <dd className="font-medium">{String(value)}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 