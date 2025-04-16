import React, { useState } from 'react';
import { ActionResult } from '../utils/actionHandler';
import { Check, X, Plane, CreditCard, Luggage, MapPin, Calendar } from 'lucide-react';
import { FlightOptions } from './FlightOptions';
import { dataManager } from '../utils/dataManager';
import { CancellationConfirmation } from './CancellationConfirmation';

export interface ActionResultProps {
  result: ActionResult;
  onConfirmBooking?: (flightNumber: string, seatClass: string) => void;
  onCancelBooking?: () => void;
  onConfirmCancellation?: (bookingReference: string) => void;
  onCancelCancellation?: () => void;
  onConfirmChange?: (bookingReference: string, newFlightNumber: string) => void;
  onCancelChange?: () => void;
  onConfirmSeatChange?: (bookingReference: string, seatNumber: string, newClass: string) => void;
  onCancelSeatChange?: () => void;
}

// Make ActionResultCard a type alias for backward compatibility
export type ActionResultCard = ActionResultProps;

export const ActionResultCard: React.FC<ActionResultProps> = ({ 
  result,
  onConfirmBooking,
  onCancelBooking,
  onConfirmCancellation,
  onCancelCancellation,
  onConfirmChange,
  onCancelChange,
  onConfirmSeatChange,
  onCancelSeatChange
}) => {
  const { success, message, data } = result;
  const [actionComplete, setActionComplete] = useState(false);
  const [actionResult, setActionResult] = useState<{
    success: boolean;
    message: string;
    details?: Record<string, any>;
    pendingAction?: {
      type: 'BOOK_FLIGHT' | 'CANCEL_BOOKING' | 'CHANGE_FLIGHT';
      flightNumber?: string;
      seatClass?: 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
      bookingReference?: string;
      newFlightNumber?: string;
    };
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
  const handleSelectFlight = (flightNumber: string, seatClass: 'economy' | 'comfortPlus' | 'first' | 'deltaOne') => {
    // Determine if this is a booking or flight change action
    const actionType = determineActionType();
    
    // Instead of directly booking, we'll create a success result with a pendingConfirmation message
    // This will allow the confirmation flow in the chat interface to take over
    const selectedFlight = processedFlights.find(f => f.flightNumber === flightNumber);
    
    if (!selectedFlight) {
      setActionResult({
        success: false,
        message: `Flight ${flightNumber} not found in search results.`,
      });
      setActionComplete(true);
      return;
    }
    
    // Format the date for the message
    let dateInfo = '';
    try {
      const date = new Date(selectedFlight.scheduledTime);
      dateInfo = date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
      
      const timeInfo = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      dateInfo = `${dateInfo} at ${timeInfo}`;
    } catch (e) {
      dateInfo = 'the scheduled time';
    }
    
    // Create a detailed confirmation message with buttons
    let resultMessage = '';
    let pendingAction: {
      type: 'BOOK_FLIGHT' | 'CANCEL_BOOKING' | 'CHANGE_FLIGHT';
      flightNumber?: string;
      seatClass?: 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
      bookingReference?: string;
      newFlightNumber?: string;
    } | undefined = undefined;
    
    if (actionType === 'book') {
      resultMessage = `I see you're interested in booking flight ${flightNumber} in ${seatClass} class. 
This flight departs from ${selectedFlight.departure} on ${dateInfo} and arrives at ${selectedFlight.arrival}.
The flight duration is ${selectedFlight.duration}.

Would you like me to confirm this booking?`;

      pendingAction = {
        type: 'BOOK_FLIGHT' as const,
        flightNumber,
        seatClass
      };
    } else if (actionType === 'change' && data?.bookingReference) {
      resultMessage = `I see you want to change your booking ${data.bookingReference} to flight ${flightNumber}.
The new flight departs from ${selectedFlight.departure} on ${dateInfo} and arrives at ${selectedFlight.arrival}.
The flight duration is ${selectedFlight.duration}.

Would you like me to confirm this flight change?`;

      pendingAction = {
        type: 'CHANGE_FLIGHT' as const,
        bookingReference: data.bookingReference,
        newFlightNumber: flightNumber
      };
    }
    
    setActionResult({
      success: true,
      message: resultMessage,
      details: { 
        flightNumber, 
        class: seatClass,
        ...(actionType === 'change' && data?.bookingReference ? { bookingReference: data.bookingReference } : {})
      },
      pendingAction
    });
    
    setActionComplete(true);
  };
  
  // Handle confirmation of the action
  const handleConfirmAction = () => {
    if (!actionResult?.pendingAction) return;
    
    const { type, flightNumber, seatClass, bookingReference, newFlightNumber } = actionResult.pendingAction;
    
    // Mark the action as handled
    setActionComplete(true);
    
    if (type === 'BOOK_FLIGHT' && flightNumber && seatClass && onConfirmBooking) {
      // Call the booking action
      onConfirmBooking(flightNumber, seatClass);
      
      // Update the result
      setActionResult({
        success: true,
        message: `Booking confirmed for flight ${flightNumber}`,
        details: {
          flightNumber,
          seatClass,
          status: 'confirmed'
        }
      });
    } 
    else if (type === 'CANCEL_BOOKING' && bookingReference && onConfirmCancellation) {
      // For cancellations, we don't automatically confirm here
      // Instead, let's show the cancellation confirmation component
      // Actual confirmation happens through the CancellationConfirmation component
    }
    else if (type === 'CHANGE_FLIGHT' && bookingReference && newFlightNumber && onConfirmChange) {
      // Call the change action
      onConfirmChange(bookingReference, newFlightNumber);
      
      // Update the result
      setActionResult({
        success: true,
        message: `Flight changed to ${newFlightNumber}`,
        details: {
          bookingReference,
          newFlightNumber,
          status: 'confirmed'
        }
      });
    }
  };
  
  // Handle cancellation of the action
  const handleCancelAction = () => {
    if (!actionResult?.pendingAction) return;
    
    const { type } = actionResult.pendingAction;
    
    if (type === 'BOOK_FLIGHT' && onCancelBooking) {
      onCancelBooking();
    } 
    else if (type === 'CANCEL_BOOKING' && onCancelCancellation) {
      onCancelCancellation();
    }
    else if (type === 'CHANGE_FLIGHT' && onCancelChange) {
      onCancelChange();
    }
    
    // Clear the pending action
    setActionResult({
      ...actionResult,
      pendingAction: undefined
    });
  };
  
  // Determine if this is a booking or flight change operation based on the message
  const determineActionType = (): 'book' | 'change' => {
    const msg = message.toLowerCase();
    return msg.includes('change') ? 'change' : 'book';
  };

  // Process flights data to the format FlightOptions component expects
  const processFlightsData = () => {
    if (!data || !Array.isArray(data)) return [];
    
    return data.map(flight => {
      // Make sure all seat arrays exist
      const safeSeats = {
        economy: Array.isArray(flight.seats?.economy) ? flight.seats.economy : [],
        comfortPlus: Array.isArray(flight.seats?.comfortPlus) ? flight.seats.comfortPlus : [],
        first: Array.isArray(flight.seats?.first) ? flight.seats.first : [],
        deltaOne: Array.isArray(flight.seats?.deltaOne) ? flight.seats.deltaOne : []
      };

      return {
        flightNumber: flight.flightNumber,
        departure: flight.departure,
        arrival: flight.arrival,
        scheduledTime: flight.scheduledTime,
        duration: flight.duration || 'N/A',
        aircraft: flight.aircraft || 'N/A',
        seats: safeSeats
      };
    });
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
          
          {/* Show the cancellation confirmation dialog */}
          {actionResult?.pendingAction?.type === 'CANCEL_BOOKING' && 
           actionResult.pendingAction?.bookingReference && 
           !actionComplete && (
            <CancellationConfirmation
              bookingReference={actionResult.pendingAction.bookingReference}
              bookingDetails={data}
              onConfirm={() => {
                if (onConfirmCancellation && actionResult.pendingAction) {
                  onConfirmCancellation(actionResult.pendingAction.bookingReference as string);
                  setActionComplete(true);
                  setActionResult({
                    success: true,
                    message: `Booking ${actionResult.pendingAction.bookingReference} cancelled`,
                    details: {
                      bookingReference: actionResult.pendingAction.bookingReference,
                      status: 'cancelled'
                    }
                  });
                }
              }}
              onCancel={() => {
                if (onCancelCancellation && actionResult.pendingAction) {
                  onCancelCancellation();
                  setActionComplete(true);
                  setActionResult({
                    success: false,
                    message: 'Cancellation was not confirmed',
                    details: {
                      bookingReference: actionResult.pendingAction.bookingReference,
                      status: 'active'
                    }
                  });
                }
              }}
            />
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
                  {actionResult.pendingAction ? 'Confirmation Required' : 
                   actionResult.success ? 'Action Completed' : 'Action Failed'}
                </h4>
              </div>
              <p className="mt-2 text-sm sm:text-base text-gray-700">{actionResult.message}</p>
              
              {/* Confirmation buttons if there is a pending action */}
              {actionResult.pendingAction && actionResult.pendingAction.type !== 'CANCEL_BOOKING' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleConfirmAction}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleCancelAction}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
              
              {actionResult.details && !actionResult.pendingAction && (
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