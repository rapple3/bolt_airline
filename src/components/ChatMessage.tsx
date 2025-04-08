import React from 'react';
import { Message } from '../types';
import { User, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { ActionResultCard } from './ActionResult';
import { BookingConfirmation } from './BookingConfirmation';
import { CancellationConfirmation } from './CancellationConfirmation';
import { ChangeFlightConfirmation } from './ChangeFlightConfirmation';
import { dataManager } from '../utils/dataManager';

interface ChatMessageProps {
  message: Message;
  onConfirmBooking?: (flightNumber: string, seatClass: string) => void;
  onCancelBooking?: () => void;
  onConfirmCancellation?: (bookingReference: string) => void;
  onCancelCancellation?: () => void;
  onConfirmChange?: (bookingReference: string, newFlightNumber: string) => void;
  onCancelChange?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message,
  onConfirmBooking,
  onCancelBooking,
  onConfirmCancellation,
  onCancelCancellation,
  onConfirmChange,
  onCancelChange
}) => {
  const { type, content, timestamp, actionResult, pendingConfirmation } = message;

  // Get booking details if we have a reference
  const getBookingDetails = (reference: string) => {
    const bookings = dataManager.getBookings();
    return bookings.find(b => b.bookingReference === reference);
  };

  // Get flight details if we have a flight number
  const getFlightDetails = (flightNumber: string) => {
    const flights = dataManager.getFlights();
    return flights.find(f => f.flightNumber === flightNumber) || null;
  };

  return (
    <div className={`flex gap-3 ${type === 'user' ? 'justify-end' : ''}`}>
      {type === 'bot' && (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Bot size={16} className="text-blue-600" />
        </div>
      )}
      
      <div className={`max-w-[80%] ${type === 'user' ? 'order-1' : 'order-2'}`}>
        <div
          className={`rounded-lg p-3 ${
            type === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        
        {/* Display booking confirmation if present */}
        {type === 'bot' && pendingConfirmation?.type === 'BOOK_FLIGHT' && pendingConfirmation.flightNumber && pendingConfirmation.flightDetails && (
          <div className="mt-2">
            <BookingConfirmation
              flightNumber={pendingConfirmation.flightNumber}
              seatClass={pendingConfirmation.seatClass || 'economy'}
              flightDetails={pendingConfirmation.flightDetails}
              onConfirm={() => {
                if (onConfirmBooking && pendingConfirmation.seatClass) {
                  onConfirmBooking(
                    pendingConfirmation.flightNumber as string, 
                    pendingConfirmation.seatClass
                  );
                }
              }}
              onCancel={() => {
                if (onCancelBooking) {
                  onCancelBooking();
                }
              }}
            />
          </div>
        )}
        
        {/* Display cancellation confirmation if present */}
        {type === 'bot' && pendingConfirmation?.type === 'CANCEL_BOOKING' && pendingConfirmation.bookingReference && (
          <div className="mt-2">
            <CancellationConfirmation
              bookingReference={pendingConfirmation.bookingReference}
              bookingDetails={getBookingDetails(pendingConfirmation.bookingReference)}
              onConfirm={() => {
                if (onConfirmCancellation) {
                  onConfirmCancellation(pendingConfirmation.bookingReference as string);
                }
              }}
              onCancel={() => {
                if (onCancelCancellation) {
                  onCancelCancellation();
                }
              }}
            />
          </div>
        )}
        
        {/* Display change flight confirmation if present */}
        {type === 'bot' && pendingConfirmation?.type === 'CHANGE_FLIGHT' && 
         pendingConfirmation.bookingReference && pendingConfirmation.newFlightNumber && 
         pendingConfirmation.newFlightDetails && (
          <div className="mt-2">
            <ChangeFlightConfirmation
              bookingReference={pendingConfirmation.bookingReference}
              currentFlight={
                pendingConfirmation.flightNumber 
                  ? getFlightDetails(pendingConfirmation.flightNumber) 
                  : null
              }
              newFlightNumber={pendingConfirmation.newFlightNumber}
              newFlightDetails={pendingConfirmation.newFlightDetails}
              onConfirm={() => {
                if (onConfirmChange) {
                  onConfirmChange(
                    pendingConfirmation.bookingReference as string,
                    pendingConfirmation.newFlightNumber as string
                  );
                }
              }}
              onCancel={() => {
                if (onCancelChange) {
                  onCancelChange();
                }
              }}
            />
          </div>
        )}
        
        {/* Display action result if present */}
        {type === 'bot' && actionResult && (
          <div className="mt-2">
            <ActionResultCard 
              result={actionResult}
              onConfirmBooking={onConfirmBooking}
              onCancelBooking={onCancelBooking} 
              onConfirmCancellation={onConfirmCancellation}
              onCancelCancellation={onCancelCancellation}
              onConfirmChange={onConfirmChange}
              onCancelChange={onCancelChange}
            />
          </div>
        )}
        
        <div
          className={`text-xs mt-1 text-gray-500 ${
            type === 'user' ? 'text-right' : ''
          }`}
        >
          {format(new Date(timestamp), 'h:mm a')}
        </div>
      </div>
      
      {type === 'user' && (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <User size={16} className="text-white" />
        </div>
      )}
    </div>
  );
};