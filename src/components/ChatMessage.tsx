import React, { useEffect, useState } from "react";
import { Message } from '../types';
import { User, Bot, Clock, Star, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ActionResultCard } from './ActionResult';
import { BookingConfirmation } from './BookingConfirmation';
import { CancellationConfirmation } from './CancellationConfirmation';
import { ChangeFlightConfirmation } from './ChangeFlightConfirmation';
import { SeatChangeConfirmation } from './SeatChangeConfirmation';
import { dataManager } from '../utils/dataManager';

interface ChatMessageProps {
  message: Message;
  onConfirmBooking?: (flightNumber: string, seatClass: string, confirmationData: Message['pendingConfirmation']) => void;
  onCancelBooking?: () => void;
  onConfirmCancellation?: (confirmationData: Message['pendingConfirmation']) => void;
  onCancelCancellation?: () => void;
  onConfirmChange?: (confirmationData: Message['pendingConfirmation']) => void;
  onCancelChange?: () => void;
  onConfirmSeatChange?: (confirmationData: Message['pendingConfirmation']) => void;
  onCancelSeatChange?: () => void;
  onHandoffRequest?: (reason: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message,
  onConfirmBooking,
  onCancelBooking,
  onConfirmCancellation,
  onCancelCancellation,
  onConfirmChange,
  onCancelChange,
  onConfirmSeatChange,
  onCancelSeatChange,
  onHandoffRequest
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

  // Format the timestamp
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render the message content
  const renderContent = () => {
    // If there's a pending confirmation, render a confirmation component
    if (pendingConfirmation) {
      // For booking confirmations
      if (pendingConfirmation.type === 'BOOK_FLIGHT' && 
          pendingConfirmation.flightNumber && 
          pendingConfirmation.flightDetails) {
        return (
          <>
            <div className="whitespace-pre-wrap mb-3">{content}</div>
            <BookingConfirmation
              flightDetails={pendingConfirmation.flightDetails}
              flightNumber={pendingConfirmation.flightNumber}
              seatClass={(pendingConfirmation.seatClass || 'economy') as 'economy' | 'comfortPlus' | 'first' | 'deltaOne'}
              onConfirm={() => {
                console.log('[ChatMessage] Confirm button clicked. Pending data:', pendingConfirmation);
                if (onConfirmBooking && pendingConfirmation.seatClass && pendingConfirmation.type === 'BOOK_FLIGHT') {
                  console.log('[ChatMessage] Calling onConfirmBooking...');
                  onConfirmBooking(
                    pendingConfirmation.flightNumber as string, 
                    pendingConfirmation.seatClass,
                    pendingConfirmation
                  );
                  console.log('[ChatMessage] Called onConfirmBooking.');
                } else {
                  console.error('[ChatMessage] onConfirmBooking check failed:', { hasOnConfirm: !!onConfirmBooking, hasSeatClass: !!pendingConfirmation.seatClass, isBookFlight: pendingConfirmation.type === 'BOOK_FLIGHT' });
                }
              }}
              onCancel={onCancelBooking || (() => {})}
            />
          </>
        );
      }
      
      // For cancellation confirmations
      if (pendingConfirmation.type === 'CANCEL_BOOKING' && 
          pendingConfirmation.bookingReference) {
        return (
          <>
            <div className="whitespace-pre-wrap mb-3">{content}</div>
            <CancellationConfirmation
              bookingReference={pendingConfirmation.bookingReference}
              bookingDetails={getBookingDetails(pendingConfirmation.bookingReference)}
              onConfirm={() => {
                if (onConfirmCancellation && pendingConfirmation.type === 'CANCEL_BOOKING') {
                  onConfirmCancellation(pendingConfirmation);
                }
              }}
              onCancel={onCancelCancellation || (() => {})}
            />
          </>
        );
      }
      
      // For flight change confirmations
      if (pendingConfirmation.type === 'CHANGE_FLIGHT' && 
          pendingConfirmation.bookingReference &&
          pendingConfirmation.newFlightNumber &&
          pendingConfirmation.newFlightDetails) {
        return (
          <>
            <div className="whitespace-pre-wrap mb-3">{content}</div>
            <ChangeFlightConfirmation
              bookingReference={pendingConfirmation.bookingReference}
              newFlightNumber={pendingConfirmation.newFlightNumber}
              newFlightDetails={pendingConfirmation.newFlightDetails}
              onConfirm={() => {
                if (onConfirmChange && pendingConfirmation.type === 'CHANGE_FLIGHT') {
                  onConfirmChange(pendingConfirmation);
                }
              }}
              onCancel={onCancelChange || (() => {})}
            />
          </>
        );
      }
      
      // For seat change and upgrade confirmations
      if (pendingConfirmation.type === 'CHANGE_SEAT' && 
          pendingConfirmation.bookingReference) {
        
        const handleSeatConfirm = (seatNumber: string, upgradeClass?: string) => {
          if (onConfirmSeatChange && pendingConfirmation?.bookingReference) {
            // Construct the necessary confirmationData to pass
            // We need bookingReference, targetSeat, and optionally targetClass
            const confirmationData: Message['pendingConfirmation'] = {
              ...pendingConfirmation, // Start with existing data
              type: 'CHANGE_SEAT', // Ensure type is correct
              targetSeat: seatNumber, // The seat selected in the component
              targetClass: upgradeClass as Message['pendingConfirmation']['targetClass'] // The optional upgrade class
            };
            onConfirmSeatChange(confirmationData); // <-- Pass confirmationData
          }
        };
        
        const handleSeatCancel = () => {
          if (onCancelSeatChange) {
            onCancelSeatChange();
          } else {
            console.log('No seat change cancel handler provided');
          }
        };
        
        return (
          <>
            <div className="whitespace-pre-wrap mb-3">{content}</div>
            <SeatChangeConfirmation
              bookingReference={pendingConfirmation.bookingReference}
              bookingDetails={getBookingDetails(pendingConfirmation.bookingReference)}
              targetClass={(pendingConfirmation.targetClass || 'economy') as 'economy' | 'comfortPlus' | 'first' | 'deltaOne'}
              seatPreference={(pendingConfirmation.seatPreference || 'aisle') as 'window' | 'aisle' | 'middle' | 'any'}
              onConfirm={handleSeatConfirm}
              onCancel={handleSeatCancel}
            />
          </>
        );
      }
    }
    
    // If there's an action result, render it
    if (actionResult) {
      return (
        <>
          <div className="whitespace-pre-wrap mb-3">{content}</div>
          <ActionResultCard
            result={actionResult}
            onConfirmBooking={onConfirmBooking}
            onCancelBooking={onCancelBooking}
            onConfirmCancellation={onConfirmCancellation}
            onCancelCancellation={onCancelCancellation}
          />
        </>
      );
    }
    
    // Default case - just render the message content
    return <div className="whitespace-pre-wrap">{content}</div>;
  };

  return (
    <div 
      className={`mb-4 flex ${
        type === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      <div 
        className={`rounded-xl p-4 max-w-[80%] flex flex-col ${
          type === 'user' 
            ? 'bg-blue-500 text-white' 
            : 'bg-white border border-gray-200'
        }`}
      >
        <div className="flex items-center mb-2">
          <div 
            className={`p-1 rounded-full mr-2 ${
              type === 'user' ? 'bg-blue-400' : 'bg-blue-100'
            }`}
          >
            {type === 'user' ? (
              <User className={`w-4 h-4 ${
                type === 'user' ? 'text-white' : 'text-blue-500'
              }`} />
            ) : (
              <Bot className="w-4 h-4 text-blue-500" />
            )}
          </div>
          <div 
            className={`text-xs font-medium ${
              type === 'user' ? 'text-blue-100' : 'text-gray-500'
            }`}
          >
            {type === 'user' ? 'You' : 'Delta Assistant'}
          </div>
          <div 
            className={`ml-auto flex items-center text-xs ${
              type === 'user' ? 'text-blue-100' : 'text-gray-400'
            }`}
          >
            <Clock className="w-3 h-3 mr-1" />
            {formatTime(timestamp)}
          </div>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
};