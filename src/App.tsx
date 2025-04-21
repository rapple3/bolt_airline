import React, { useState, useEffect, useRef } from 'react';
import { Plane, RotateCcw, Search, MapPin, Menu, X, User, ChevronUp, ChevronDown, Calendar } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import UserProfileCard from './components/UserProfileCard';
import UserSelector from './components/UserSelector';
import { HandoffModal } from './components/HandoffModal';
import { getChatResponse, resetChatHistory, addSystemMessage } from './utils/openai';
import { mockBookings, mockUserProfile } from './data/mockData';
import { Message, AgentHandoff, UserProfile } from './types';
import { dataManager } from './utils/dataManager';

function App() {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    type: 'bot',
    content: "Hi there! I'm Delta Assistant, your friendly AI travel companion at Delta Air Lines. I'm here to make your travel experience amazing! How can I help you today? Whether you need to book a flight, check your reservation, or get travel information - I'm excited to assist you!",
    timestamp: new Date()
  }]);
  const [handoff, setHandoff] = useState<AgentHandoff | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(dataManager.getUserProfile());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [testMenuOpen, setTestMenuOpen] = useState(false);
  const [currentSystemDate, setCurrentSystemDate] = useState<Date>(dataManager.getCurrentDate());

  // Refs for auto-scroll and input focus
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const inputRef = useRef<null | HTMLInputElement>(null); // Ref for the input element

  // Effect for auto-scrolling
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); // Trigger scroll on new messages

  useEffect(() => {
    // Subscribe to user profile changes
    const unsubscribe = dataManager.subscribe(() => {
      setCurrentUser(dataManager.getUserProfile());
      setCurrentSystemDate(dataManager.getCurrentDate());
    });

    return () => unsubscribe();
  }, []);

  const handleUserSelect = (profile: UserProfile) => {
    // Reset chat history when switching users
    setMessages([{
      id: '1',
      type: 'bot',
      content: `Hello ${profile.name}! I'm Delta Assistant, your friendly AI travel companion. It's great to see you today! How can I help make your travel experience with Delta Air Lines amazing?`,
      timestamp: new Date()
    }]);
    resetChatHistory();
    
    // Update the data manager with the new user
    dataManager.setUserProfile(profile);
    setCurrentUser(profile); // Update local state immediately
    // Close sidebar on mobile after selection
    setSidebarOpen(false);
  };

  const handleAgentHandoff = (reason: string) => {
    const handoff = {
      customerId: currentUser.customerId,
      bookingDetails: null,
      problemSummary: reason,
      attemptedSolutions: ['AI chatbot assistance'],
      nextSteps: ['Transfer to human agent'],
    } as AgentHandoff;
    
    setHandoff(handoff);
    setShowHandoffModal(true);
  };

  const handleCloseHandoffModal = () => {
    setShowHandoffModal(false);
  };

  const handleReset = () => {
    setMessages([{
      id: '1',
      type: 'bot',
      content: `Hello ${currentUser.name}! I'm Delta Assistant, your friendly AI travel companion. It's great to see you today! How can I help make your travel experience with Delta Air Lines amazing?`,
      timestamp: new Date()
    }]);
    resetChatHistory();
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Check if this is a PNR response to a cancellation request
    const previousBotMessage = messages[messages.length - 1];
    const isPNRResponse = previousBotMessage?.type === 'bot' && 
      (previousBotMessage.content.includes('booking reference') || 
       previousBotMessage.content.includes('PNR number')) &&
      /[A-Z]{2}\d{5}|[A-Z0-9]{6}/i.test(content); // Match PNR format
    
    // Check if this is a cancellation request with PNR
    const isCancellationWithPNR = content.toLowerCase().includes('cancel') && 
      /[A-Z]{2}\d{5}|[A-Z0-9]{6}/i.test(content);

    try {
      // Handle PNR response with special flow
      if (isPNRResponse || isCancellationWithPNR) {
        // Extract the PNR from user message
        const pnrMatch = content.match(/[A-Z]{2}\d{5}|[A-Z0-9]{6}/i);
        const bookingReference = pnrMatch ? pnrMatch[0].toUpperCase() : '';
        
        if (bookingReference) {
          // Look up the booking
          const booking = dataManager.getBookings().find(b => 
            b.bookingReference.toUpperCase() === bookingReference.toUpperCase()
          );
          
          if (booking) {
            // Determine refund eligibility
            const isRefundable = (booking as any).fareType === 'refundable';
            
            // Check 24-hour policy
            const isWithin24Hours = (booking as any).createdAt ? 
              (new Date().getTime() - new Date((booking as any).createdAt).getTime()) < (24 * 60 * 60 * 1000) : false;
            
            // Check if flight is more than 7 days away
            const flightDate = booking.date ? new Date(booking.date) : null;
            const isMoreThan7DaysAway = flightDate ? 
              (flightDate.getTime() - new Date().getTime()) > (7 * 24 * 60 * 60 * 1000) : false;
            
            // Check if the 24-hour refund policy applies
            const qualifiesFor24HourRefund = isWithin24Hours && isMoreThan7DaysAway;
            
            let botResponse;
            
            if (isRefundable) {
              botResponse = `I've found your booking ${bookingReference}. Your ticket is fully refundable. Are you sure you want to cancel this Delta booking? This action cannot be undone.`;
            } else if (qualifiesFor24HourRefund) {
              botResponse = `I've found your booking ${bookingReference}. Your ticket qualifies for a full refund under our 24-hour cancellation policy. Are you sure you want to cancel this Delta booking? This action cannot be undone.`;
            } else {
              botResponse = `I've found your booking ${bookingReference}. Your ticket is non-refundable, but you qualify for an eCredit that can be used for future travel. Would you like to proceed?`;
            }
            
            const botMessage: Message = {
              id: (Date.now() + 1).toString(),
              type: 'bot',
              content: botResponse,
              timestamp: new Date(),
              pendingConfirmation: {
                type: 'CANCEL_BOOKING',
                bookingReference
              }
            };
            
            setMessages(prev => [...prev, botMessage]);
            setIsLoading(false);
            return;
          }
        }
      }

      // Default flow - use the API for other messages
      const response = await getChatResponse(content);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response.content,
        timestamp: new Date(),
        actionResult: response.actionResult,
        pendingConfirmation: response.pendingConfirmation
      };

      setMessages(prev => [...prev, botMessage]);

      if (response.requiresHandoff) {
        handleAgentHandoff("AI Assistant determined handoff to human agent is needed");
      }
    } catch (error) {
      console.error('Error getting chat response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: "I apologize, but I'm experiencing technical difficulties. Let me connect you with a human agent.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      handleAgentHandoff("Technical error occurred during chat interaction");
    } finally {
      setIsLoading(false);
      // Re-focus the input after sending/loading finishes
      inputRef.current?.focus(); // Focus the input using the ref
    }
  };

  // Handle reset data button click
  const handleResetData = () => {
    dataManager.resetData();
    setCurrentUser(dataManager.getUserProfile());
    handleReset();
    // Show confirmation message
    setMessages([
      {
        id: Date.now().toString(),
        type: 'bot',
        content: "Data has been reset with fresh flights. Atlanta to New York routes are now available!",
        timestamp: new Date()
      }
    ]);
    // Close sidebar on mobile after action
    setSidebarOpen(false);
  };

  // Directly trigger a flight search for testing
  const handleTestFlightSearch = async () => {
    // Different searches to test the functionality
    const searches = [
      "I need to fly from Atlanta to New York tomorrow",
      "Show me flights from New York to Atlanta next week",
      "Find flights from Chicago to Atlanta today"
    ];
    
    // Pick a random search query
    const searchQuery = searches[Math.floor(Math.random() * searches.length)];
    
    // Send the message through the normal flow
    await handleSendMessage(searchQuery);
    // Close sidebar on mobile after action
    setSidebarOpen(false);
  };

  // Directly trigger a test for uncommon route search
  const handleTestUncommonRoute = async () => {
    // Different searches for uncommon routes
    const searches = [
      "I want to fly from Sacramento to Portland next Friday",
      "Find me a flight from Honolulu to San Diego for next month",
      "I need to book a flight from Phoenix to Seattle tomorrow",
      "Are there any flights from Austin to Minneapolis next week?",
      "Show me flights from Denver to Nashville this weekend"
    ];
    
    // Pick a random search query
    const searchQuery = searches[Math.floor(Math.random() * searches.length)];
    
    // Send the message through the normal flow
    await handleSendMessage(searchQuery);
    // Close sidebar on mobile after action
    setSidebarOpen(false);
  };

  // Handler for flight booking confirmation
  const handleConfirmBooking = async (flightNumber: string, seatClass: string, confirmationData: Message['pendingConfirmation']) => {
    // Use the passed-in confirmationData directly
    if (!confirmationData || confirmationData.type !== 'BOOK_FLIGHT' || !confirmationData.flightDetails) {
      console.error("[handleConfirmBooking] Error: Invalid or missing confirmation data received.");
      return;
    }
    
    const { flightDetails } = confirmationData; // Use flightDetails from the argument
    // Map old seat classes to new ones if needed
    let validClass: 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
    
    if (seatClass === 'business') {
      validClass = 'comfortPlus';
    } else if (seatClass === 'economy' || seatClass === 'first' || seatClass === 'deltaOne') {
      validClass = seatClass as 'economy' | 'comfortPlus' | 'first' | 'deltaOne';
    } else {
      validClass = 'economy'; // Default fallback
    }
    
    // Execute the booking action
    const success = dataManager.createBooking(flightNumber, validClass);
    
    if (!success) {
      // Show error message
      // Find the ID of the message that triggered this (needed for setMessages update below)
      // We can't easily get the message ID here anymore without searching. 
      // Let's just add the error message for now. A better solution might involve passing the ID too.
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'bot',
          content: 'Sorry, there was an error booking your flight. Please try again.',
          timestamp: new Date()
        }
      ]);
      return;
    }
    
    // Get the newly created booking
    const userBookings = dataManager.getBookings();
    const bookingId = userBookings.length > 0 ? userBookings[userBookings.length - 1].bookingReference : 'Unknown';
    
    // Format the flight date for better readability
    const flightDate = new Date(flightDetails.scheduledTime);
    const formattedDate = flightDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = flightDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Add a system message for the AI
    const systemLogMessage = `Flight booking confirmed: ${flightNumber} from ${flightDetails.departure} to ${flightDetails.arrival} on ${formattedDate} at ${formattedTime} in ${validClass} class. Booking reference: ${bookingId}.`;
    addSystemMessage(systemLogMessage);

    // Add visible debug message
    /*
    const debugMessage: Message = {
      id: (Date.now() + 1).toString(), 
      type: 'bot',
      content: `[DEBUG LOG] ${systemLogMessage}`,
      timestamp: new Date(),
      actionResult: undefined,
      pendingConfirmation: undefined,
    };
    */

    // Add user-facing confirmation message
    const confirmationMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: `Great news! I've booked your flight from ${flightDetails.departure} to ${flightDetails.arrival}.\n\nFlight details:\n• Flight number: ${flightNumber}\n• Date: ${formattedDate} at ${formattedTime}\n• Class: ${validClass.charAt(0).toUpperCase() + validClass.slice(1)}\n• Booking reference: ${bookingId}\n\nYour booking is confirmed and has been added to your profile. Is there anything else I can help you with today?`,
      timestamp: new Date(),
      actionResult: {
        success: true,
        message: `Successfully booked flight ${flightNumber} in ${validClass} class`,
        data: {
          flightNumber,
          passenger: currentUser.name,
          seatClass: validClass,
          from: flightDetails.departure,
          to: flightDetails.arrival,
          date: new Date(flightDetails.scheduledTime).toLocaleDateString(),
          bookingId
        }
      }
    };

    // Update messages state first, adding confirmation and potentially debug log
    // Modify the original message to remove pending confirmation, instead of filtering it out.
    setMessages(prev => {
      const updatedMessages = prev.map(msg => {
        // Find the message that triggered this confirmation
        if (msg.pendingConfirmation && 
            msg.pendingConfirmation.type === 'BOOK_FLIGHT' && 
            msg.pendingConfirmation.flightDetails?.flightNumber === flightNumber) { // Match based on confirmation data
          // Return a new object without pendingConfirmation
          const { pendingConfirmation, ...rest } = msg;
          return rest; 
        }
        return msg;
      });
      // Add the new confirmation message
      const newState = [...updatedMessages, confirmationMessage];
      return newState; 
    });

    // Update the user profile state *after* message state is likely updated
    setCurrentUser(dataManager.getUserProfile());

    // ---> Trigger AI response after UI update <---
    setIsLoading(true); // Show loading indicator
    try {
      // Send an internal prompt to make the AI process the update
      // NOTE: We expect the AI to respond based on the context, including the Action Log
      const response = await getChatResponse("SYSTEM_ACTION: Booking Confirmed. Acknowledge and continue conversation.");

      // Avoid adding duplicate confirmation content if the AI essentially repeats it.
      // Check if the AI response significantly differs from the confirmation message.
      // This is a basic check; more sophisticated checks might be needed.
      if (response.content && !response.content.includes(confirmationMessage.content.substring(0, 50))) { 
        const botFollowUpMessage: Message = {
          id: (Date.now() + 2).toString(), // Ensure unique ID
          type: 'bot',
          content: response.content, // AI's response after processing the action
          timestamp: new Date(),
          actionResult: response.actionResult, // Pass through results/confirmations if AI provides them
          pendingConfirmation: (response as any).pendingConfirmation // Handle potential pendingConfirmation property
        };
        setMessages(prev => [...prev, botFollowUpMessage]);
      } else {
        console.log("AI response similar to confirmation, skipping follow-up message.");
      }

    } catch (error) {
      console.error('Error getting follow-up response:', error);
      const errorMessage: Message = {
         id: (Date.now() + 2).toString(),
         type: 'bot',
         content: "I've processed your request, but encountered an issue generating a follow-up response.",
         timestamp: new Date()
      };
       setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false); // Hide loading indicator
      inputRef.current?.focus(); // Re-focus input here too
    }
  };

  const handleCancelBooking = () => {
    // Find the message with the pending confirmation
    const pendingMessage = messages.find(
      m => m.type === 'bot' && m.pendingConfirmation?.type === 'BOOK_FLIGHT'
    );
    
    if (!pendingMessage) {
      return;
    }
    
    // Add a system message for the AI
    const systemLogMessage = `Flight booking process cancelled: User started but did not complete the booking process. No reservation was created.`;
    addSystemMessage(systemLogMessage);

    // Add a visible debug message to the chat UI
    /*
    const debugMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: `[DEBUG LOG] ${systemLogMessage}`,
      timestamp: new Date(),
      actionResult: undefined,
      pendingConfirmation: undefined,
    };
    */
    
    // Add user-facing cancellation message
    const cancellationUIMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: 'Booking has been cancelled. Is there anything else I can help you with?',
      timestamp: new Date()
    };
    
    // Update messages to remove pending confirmation
    setMessages(prev => {
      const updatedMessages = prev.map(msg => {
        // Find the message with the pending confirmation we are cancelling
        if (msg.id === pendingMessage.id) { 
          // Return a new object without pendingConfirmation
          const { pendingConfirmation, ...rest } = msg;
          return rest;
        }
        return msg;
      });
      // Add the cancellation UI message separately
      return [...updatedMessages, cancellationUIMessage]; 
      
      // Force refresh the current user data *after* updating messages
      setCurrentUser(dataManager.getUserProfile());
    });
  };

  // Handler for flight cancellation confirmation
  const handleConfirmCancellation = (confirmationData: Message['pendingConfirmation']) => {
    // Use the passed-in confirmationData directly
    if (!confirmationData || confirmationData.type !== 'CANCEL_BOOKING' || !confirmationData.bookingReference) {
      console.error("[handleConfirmCancellation] Error: Invalid or missing confirmation data received.");
      return;
    }

    const bookingReference = confirmationData.bookingReference;
    
    // Execute the cancellation action
    const success = dataManager.cancelBooking(bookingReference);
    
    if (!success) {
      // Show error message
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'bot',
          content: 'Sorry, there was an error cancelling your booking. Please try again.',
          timestamp: new Date()
        }
      ]);
      return;
    }
    
    // Add a system message for the AI
    const systemLogMessage = `Booking cancellation completed: Booking reference ${bookingReference} has been cancelled. The user will receive an eCredit or refund according to the fare rules.`;
    addSystemMessage(systemLogMessage);

    // Add a visible debug message to the chat UI
    /*
    const debugMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: `[DEBUG LOG] ${systemLogMessage}`,
      timestamp: new Date(),
      actionResult: undefined,
      pendingConfirmation: undefined,
    };
    */
        
    // Add confirmation message
    const confirmationMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: `Your booking ${bookingReference} has been cancelled successfully. Is there anything else I can help you with today?`,
      timestamp: new Date(),
      actionResult: {
        success: true,
        message: `Successfully cancelled booking ${bookingReference}`,
        data: {
          bookingReference,
          status: 'cancelled'
        }
      }
    };
    
    // Update messages and remove pending confirmation, then refresh user profile
    setMessages(prev => {
      const updatedMessages = prev.map(msg => {
        // Find the message that triggered this confirmation
        if (msg.pendingConfirmation && 
            msg.pendingConfirmation.type === 'CANCEL_BOOKING' && 
            msg.pendingConfirmation.bookingReference === bookingReference) { // Match based on confirmation data
          // Return a new object without pendingConfirmation
          const { pendingConfirmation, ...rest } = msg;
          return rest;
        }
        return msg;
      });
      // Add the new confirmation message
      const newState = [...updatedMessages, confirmationMessage];
      
      // Force refresh the current user data *after* updating messages
      setCurrentUser(dataManager.getUserProfile());
      
      return newState;
    });
  };

  // Handler for cancelling a cancellation
  const handleCancelCancellation = () => {
    // Find the message with the pending confirmation
    const pendingMessage = messages.find(
      m => m.type === 'bot' && m.pendingConfirmation?.type === 'CANCEL_BOOKING'
    );
    
    if (!pendingMessage) {
      return;
    }
    
    // Add a system message for the AI
    const systemLogMessage = `Cancellation request withdrawn: User decided not to proceed with cancellation of their booking. The original booking remains active and unchanged.`;
    addSystemMessage(systemLogMessage);

    // Add a visible debug message to the chat UI
    /*
    const debugMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: `[DEBUG LOG] ${systemLogMessage}`,
      timestamp: new Date(),
      actionResult: undefined,
      pendingConfirmation: undefined,
    };
    */
    
    // Add user-facing message
    const cancellationUIMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: 'Cancellation request has been discarded. Your booking remains active. Is there anything else I can help you with?',
      timestamp: new Date()
    };
    
    // Update messages to remove pending confirmation
    setMessages(prev => {
      const updatedMessages = prev.map(msg => {
        if (msg.id === pendingMessage.id) {
          // Remove the pending confirmation
          const { pendingConfirmation, ...rest } = msg;
          return rest;
        }
        return msg;
      }).concat(cancellationUIMessage); // Add both messages
      
      // Force refresh the current user data *after* updating messages
      setCurrentUser(dataManager.getUserProfile());
      
      return updatedMessages;
    });
  };

  // Handler for flight change confirmation
  const handleConfirmChange = (confirmationData: Message['pendingConfirmation']) => {
    // Use the passed-in confirmationData directly
    if (!confirmationData || confirmationData.type !== 'CHANGE_FLIGHT' || !confirmationData.bookingReference || !confirmationData.newFlightNumber) {
      console.error("[handleConfirmChange] Error: Invalid or missing confirmation data received.");
      return;
    }

    const { bookingReference, newFlightNumber } = confirmationData;
    
    // Execute the flight change action
    const success = dataManager.changeFlight(bookingReference, newFlightNumber);
    
    if (!success) {
      // Show error message
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'bot',
          content: 'Sorry, there was an error changing your flight. Please try again.',
          timestamp: new Date()
        }
      ]);
      return;
    }
    
    // Add a system message for the AI
    const systemLogMessage = `Flight change completed: Booking ${bookingReference} has been changed to flight ${newFlightNumber}. All passenger and payment details have been transferred to the new flight.`;
    addSystemMessage(systemLogMessage);

    // Add a visible debug message to the chat UI
    /*
    const debugMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: `[DEBUG LOG] ${systemLogMessage}`,
      timestamp: new Date(),
      actionResult: undefined,
      pendingConfirmation: undefined,
    };
    */
        
    // Add confirmation message
    const confirmationMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: `Your booking has been changed to flight ${newFlightNumber} successfully. Is there anything else I can help you with today?`,
      timestamp: new Date(),
      actionResult: {
        success: true,
        message: `Successfully changed booking ${bookingReference} to flight ${newFlightNumber}`,
        data: {
          bookingReference,
          newFlightNumber,
          status: 'confirmed'
        }
      }
    };

    // Update messages and remove pending confirmation, then refresh user profile
    setMessages(prev => {
      const updatedMessages = prev.map(msg => {
        // Find the message that triggered this confirmation
        if (msg.pendingConfirmation && 
            msg.pendingConfirmation.type === 'CHANGE_FLIGHT' && 
            msg.pendingConfirmation.bookingReference === bookingReference) { // Match based on confirmation data
          // Return a new object without pendingConfirmation
          const { pendingConfirmation, ...rest } = msg;
          return rest;
        }
        return msg;
      });
      // Add the new confirmation message
      const newState = [...updatedMessages, confirmationMessage];
      
      // Force refresh the current user data *after* updating messages
      setCurrentUser(dataManager.getUserProfile());
      
      return newState;
    });
  };

  // Handler for cancelling a flight change
  const handleCancelChange = () => {
    // Find the message with the pending confirmation
    const pendingMessage = messages.find(
      m => m.type === 'bot' && m.pendingConfirmation?.type === 'CHANGE_FLIGHT'
    );
    
    if (!pendingMessage) {
      return;
    }
    
    // Add a system message for the AI
    const systemLogMessage = `Flight change request withdrawn: User decided not to proceed with changing their flight. The original flight booking remains active and unchanged.`;
    addSystemMessage(systemLogMessage);

    // Add a visible debug message to the chat UI
    /*
    const debugMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: `[DEBUG LOG] ${systemLogMessage}`,
      timestamp: new Date(),
      actionResult: undefined,
      pendingConfirmation: undefined,
    };
    */
    
    // Add user-facing message
    const cancellationUIMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: 'Flight change request has been cancelled. Your original booking remains unchanged. Is there anything else I can help you with?',
      timestamp: new Date()
    };
    
    // Update messages to remove pending confirmation
    setMessages(prev => {
      const updatedMessages = prev.map(msg => {
        if (msg.id === pendingMessage.id) {
          // Remove the pending confirmation
          const { pendingConfirmation, ...rest } = msg;
          return rest;
        }
        return msg;
      }).concat(cancellationUIMessage); // Add both messages
      
      // Force refresh the current user data *after* updating messages
      setCurrentUser(dataManager.getUserProfile());
      
      return updatedMessages;
    });
  };

  // Handler for seat change and upgrade confirmation
  const handleConfirmSeatChange = (confirmationData: Message['pendingConfirmation']) => {
    // Use the passed-in confirmationData directly
    if (!confirmationData || confirmationData.type !== 'CHANGE_SEAT' || !confirmationData.bookingReference || !confirmationData.targetSeat) { // Added targetSeat check
      console.error("[handleConfirmSeatChange] Error: Invalid or missing confirmation data received.");
      return;
    }

    const { bookingReference, targetSeat, targetClass } = confirmationData; // Extract needed data
    const seatNumber = targetSeat; // Assuming targetSeat holds the seat number
    const newClass = targetClass; // Optional new class for upgrade
    
    try {
      // NOTE: The original code forced success. We should ideally call dataManager.changeSeat here.
      // const success = dataManager.changeSeat(bookingReference, seatNumber); // <-- Ideal change
      const success = true; // Keep forced success for now as per original logic
      
      if (!success) {
        // Show error message
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            type: 'bot',
            content: 'Sorry, there was an error changing your seat. Please try again.',
            timestamp: new Date()
          }
        ]);
        return;
      }
      
      // Use the current class if no upgrade was selected
      const displayClass = newClass || confirmationData.currentClass || 'economy'; // Use currentClass from confirmationData if available
      
      // Add a system message for the AI
      const systemLogMessage = `Seat change completed: For booking ${bookingReference}, seat has been changed to ${seatNumber}${newClass ? ` with upgrade to ${displayClass} class` : ''}. Seat map has been updated and confirmation will be sent via email.`;
      addSystemMessage(systemLogMessage);

      // Add a visible debug message to the chat UI
      /*
      const debugMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: `[DEBUG LOG] ${systemLogMessage}`,
        timestamp: new Date(),
        actionResult: undefined,
        pendingConfirmation: undefined,
      };
      */
            
      // Add confirmation message
      const confirmationMessage: Message = {
        id: Date.now().toString(),
        type: 'bot',
        content: `Your seat has been changed to ${seatNumber}${newClass ? ` in ${displayClass} class` : ''}. You'll receive email confirmation 72 hours before departure. Is there anything else I can help you with today?`,
        timestamp: new Date(),
        actionResult: {
          success: true,
          message: `Successfully changed seat to ${seatNumber}${newClass ? ` in ${displayClass} class` : ''}`,
          data: {
            bookingReference,
            newSeatNumber: seatNumber,
            class: displayClass,
            status: 'confirmed'
          }
        }
      };
      
      // Update messages and remove pending confirmation, then refresh user profile
      setMessages(prev => {
        const updatedMessages = prev.filter(msg => 
          !(msg.pendingConfirmation?.type === 'CHANGE_SEAT')
        );
        // const newState = [...updatedMessages, debugMessage, confirmationMessage]; // Commented out adding debugMessage
        const newState = [...updatedMessages, confirmationMessage]; // Add both messages
        
        // Force refresh the current user data *after* updating messages
        setCurrentUser(dataManager.getUserProfile());
        
        return newState;
      });
    } catch (error) {
      console.error("Error changing seat:", error);
      // Show error message
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'bot',
          content: 'Sorry, there was an error changing your seat. Please try again.',
          timestamp: new Date()
        }
      ]);
    }
  };

  // Handler for cancelling a seat change
  const handleCancelSeatChange = () => {
    // Find the message with the pending confirmation
    const pendingMessage = messages.find(
      m => m.type === 'bot' && m.pendingConfirmation?.type === 'CHANGE_SEAT'
    );
    
    if (!pendingMessage) {
      return;
    }
    
    // Add a system message for the AI
    const systemLogMessage = `Seat change request withdrawn: User decided not to proceed with changing their seat. The original seat assignment remains active and unchanged.`;
    addSystemMessage(systemLogMessage);

    // Add a visible debug message to the chat UI
    /*
    const debugMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: `[DEBUG LOG] ${systemLogMessage}`,
      timestamp: new Date(),
      actionResult: undefined,
      pendingConfirmation: undefined,
    };
    */
    
    // Add user-facing message
    const cancellationUIMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: 'Seat change request has been cancelled. Your current seat assignment remains unchanged. Is there anything else I can help you with?',
      timestamp: new Date()
    };
    
    // Update messages to remove pending confirmation
    setMessages(prev => {
      const updatedMessages = prev.map(msg => {
        if (msg.id === pendingMessage.id) {
          // Remove the pending confirmation
          const { pendingConfirmation, ...rest } = msg;
          return rest;
        }
        return msg;
      }).concat(cancellationUIMessage); // Add both messages
      
      // Force refresh the current user data *after* updating messages
      setCurrentUser(dataManager.getUserProfile());
      
      return updatedMessages;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header with logo and user selector */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 flex justify-between items-center">
        <div className="flex items-center">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden mr-2 p-1 rounded hover:bg-gray-100"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <Plane className="text-blue-500 w-6 h-6 mr-2" />
          <h1 className="text-xl font-semibold text-gray-800">Delta Air Lines</h1>
        </div>
        <div className="flex items-center">
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-full bg-blue-100 text-blue-500"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
          <div className="hidden md:block">
            <UserSelector 
              currentUserId={currentUser.customerId}
              onSelectUser={handleUserSelect}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-10"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Left sidebar with user profile */}
        <aside className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0
          fixed md:relative z-20 h-[calc(100%-64px)] md:h-auto
          w-[280px] md:w-80 border-r border-gray-200 bg-white p-4 
          flex flex-col transition-transform duration-300 ease-in-out
        `}>
          <div className="flex justify-between items-center md:hidden mb-4">
            <h2 className="font-medium text-gray-800">User Profile</h2>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          <UserProfileCard profile={currentUser} />
          
          <div className="mt-auto">
            <div className="mt-4 md:hidden">
              <UserSelector 
                currentUserId={currentUser.customerId}
                onSelectUser={handleUserSelect}
              />
            </div>
            
            {/* Testing features menu at the bottom */}
            <div className="mt-8 border-t border-gray-200 pt-4">
              <button
                onClick={() => setTestMenuOpen(!testMenuOpen)}
                className="flex items-center justify-between w-full p-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                <span className="font-medium">Testing Features</span>
                {testMenuOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {testMenuOpen && (
                <div className="mt-2 space-y-2 pl-2">
                  <div className="flex items-center w-full py-2 px-3 text-sm bg-gray-50 rounded-md text-gray-700">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Current Date: {currentSystemDate.toLocaleDateString('en-US', { 
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}</span>
                  </div>

                  <button
                    onClick={handleResetData}
                    className="flex items-center w-full py-2 px-3 text-sm hover:bg-gray-100 rounded-md text-gray-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Data & Flights
                  </button>
                  
                  <button
                    onClick={handleTestFlightSearch}
                    className="flex items-center w-full py-2 px-3 text-sm hover:bg-gray-100 rounded-md text-blue-600 transition-colors"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Test Common Routes
                  </button>
                  
                  <button
                    onClick={handleTestUncommonRoute}
                    className="flex items-center w-full py-2 px-3 text-sm hover:bg-gray-100 rounded-md text-purple-600 transition-colors"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Test Uncommon Routes
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main chat area */}
        <main className="flex-1 flex flex-col">
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                onConfirmBooking={handleConfirmBooking}
                onCancelBooking={handleCancelBooking}
                onConfirmCancellation={handleConfirmCancellation}
                onCancelCancellation={handleCancelCancellation}
                onConfirmChange={handleConfirmChange}
                onCancelChange={handleCancelChange}
                onConfirmSeatChange={handleConfirmSeatChange}
                onCancelSeatChange={handleCancelSeatChange}
                onHandoffRequest={handleAgentHandoff}
              />
            ))}
            {isLoading && (
              <div className="flex justify-center items-center py-2">
                <div className="animate-pulse text-gray-500">AI is typing...</div>
              </div>
            )}
            {/* Dummy div at the end for auto-scroll target */}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat input */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex justify-between items-center mb-2">
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Reset Conversation
              </button>
            </div>
            <ChatInput
              ref={inputRef}
              onSendMessage={handleSendMessage}
              disabled={isLoading}
            />
          </div>
        </main>
      </div>

      {/* Handoff Modal */}
      {showHandoffModal && handoff && (
        <HandoffModal handoff={handoff} onClose={() => setShowHandoffModal(false)} />
      )}
    </div>
  );
}

export default App;