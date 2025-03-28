import React from 'react';
import { Message } from '../types';
import { User, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { ActionResultCard } from './ActionResult';
import { BookingConfirmation } from './BookingConfirmation';

interface ChatMessageProps {
  message: Message;
  onConfirmBooking?: (flightNumber: string, seatClass: string) => void;
  onCancelBooking?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message,
  onConfirmBooking,
  onCancelBooking
}) => {
  const { type, content, timestamp, actionResult, pendingConfirmation } = message;

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
        {type === 'bot' && pendingConfirmation && pendingConfirmation.type === 'BOOK_FLIGHT' && (
          <div className="mt-2">
            <BookingConfirmation
              flightNumber={pendingConfirmation.flightNumber}
              seatClass={pendingConfirmation.seatClass}
              flightDetails={pendingConfirmation.flightDetails}
              onConfirm={() => {
                if (onConfirmBooking) {
                  onConfirmBooking(
                    pendingConfirmation.flightNumber, 
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
        
        {/* Display action result if present */}
        {type === 'bot' && actionResult && (
          <div className="mt-2">
            <ActionResultCard result={actionResult} />
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