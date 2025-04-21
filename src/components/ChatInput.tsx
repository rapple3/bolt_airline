import React, { useState, useRef, forwardRef } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
}

// Use forwardRef to accept the ref from the parent (App.tsx)
export const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
  ({ onSendMessage, disabled }, ref) => {
    const [inputValue, setInputValue] = useState('');

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(event.target.value);
    };

    const handleSendClick = () => {
      if (inputValue.trim() && !disabled) {
        onSendMessage(inputValue.trim());
        setInputValue(''); // Clear input after sending
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // Prevent default Enter behavior (newline)
        handleSendClick();
      }
    };

    return (
      <div className="flex items-center space-x-2">
        <input
          ref={ref} // Assign the forwarded ref to the input element
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={disabled}
          className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <button
          onClick={handleSendClick}
          disabled={disabled || !inputValue.trim()}
          className={`p-2 rounded-md text-white ${
            disabled || !inputValue.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          } transition-colors`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    );
  }
);

// Add display name for better debugging in React DevTools
ChatInput.displayName = 'ChatInput';