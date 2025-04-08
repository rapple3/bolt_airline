import React, { useState, useEffect } from 'react';
import { Plane, RotateCcw, Search, MapPin, Menu, X, User, ChevronUp, ChevronDown } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import UserProfileCard from './components/UserProfileCard';
import UserSelector from './components/UserSelector';
import { HandoffModal } from './components/HandoffModal';
import { getChatResponse, resetChatHistory } from './utils/openai';
import { mockBookings, mockUserProfile } from './data/mockData';
import { Message, AgentHandoff, UserProfile } from './types';
import { dataManager } from './utils/dataManager';

function App() {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    type: 'bot',
    content: "Hi there! I'm Delta Assistant, your friendly AI travel companion at Delta Airlines. I'm here to make your travel experience amazing! How can I help you today? Whether you need to book a flight, check your reservation, or get travel information - I'm excited to assist you!",
    timestamp: new Date()
  }]);
  const [handoff, setHandoff] = useState<AgentHandoff | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(dataManager.getUserProfile());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [testMenuOpen, setTestMenuOpen] = useState(false);

  useEffect(() => {
    // Subscribe to user profile changes
    const unsubscribe = dataManager.subscribe(() => {
      setCurrentUser(dataManager.getUserProfile());
    });

    return () => unsubscribe();
  }, []);

  const handleUserSelect = (profile: UserProfile) => {
    // Reset chat history when switching users
    setMessages([{
      id: '1',
      type: 'bot',
      content: `Hello ${profile.name}! I'm Delta Assistant, your friendly AI travel companion. It's great to see you today! How can I help make your travel experience with Delta Airlines amazing?`,
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
      content: `Hello ${currentUser.name}! I'm Delta Assistant, your friendly AI travel companion. It's great to see you today! How can I help make your travel experience with Delta Airlines amazing?`,
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

    try {
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
  const handleConfirmBooking = (flightNumber: string, seatClass: string) => {
    // Find the message with the pending confirmation
    const pendingMessage = messages.find(
      m => m.type === 'bot' && m.pendingConfirmation?.type === 'BOOK_FLIGHT'
    );
    
    if (!pendingMessage?.pendingConfirmation || !pendingMessage.pendingConfirmation.flightDetails) {
      return;
    }
    
    const { flightDetails } = pendingMessage.pendingConfirmation;
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
    
    // Add confirmation message
    const confirmationMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: `Your booking for flight ${flightNumber} has been confirmed!`,
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
    
    // Update messages and remove pending confirmation from the previous message
    setMessages(prev => {
      return prev.map(msg => {
        if (msg.id === pendingMessage.id) {
          // Remove the pending confirmation
          const { pendingConfirmation, ...rest } = msg;
          return rest;
        }
        return msg;
      }).concat(confirmationMessage);
    });
  };

  const handleCancelBooking = () => {
    // Find the message with the pending confirmation
    const pendingMessage = messages.find(
      m => m.type === 'bot' && m.pendingConfirmation?.type === 'BOOK_FLIGHT'
    );
    
    if (!pendingMessage) {
      return;
    }
    
    // Update messages to remove pending confirmation
    setMessages(prev => {
      return prev.map(msg => {
        if (msg.id === pendingMessage.id) {
          // Remove the pending confirmation
          const { pendingConfirmation, ...rest } = msg;
          return rest;
        }
        return msg;
      }).concat({
        id: Date.now().toString(),
        type: 'bot',
        content: 'Booking has been cancelled. Is there anything else I can help you with?',
        timestamp: new Date()
      });
    });
  };

  // Handler for flight cancellation confirmation
  const handleConfirmCancellation = (bookingReference: string) => {
    // Find the message with the pending confirmation
    const pendingMessage = messages.find(
      m => m.type === 'bot' && m.pendingConfirmation?.type === 'CANCEL_BOOKING'
    );
    
    if (!pendingMessage?.pendingConfirmation) {
      return;
    }
    
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
    
    // Add confirmation message
    const confirmationMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: `Your booking ${bookingReference} has been cancelled successfully.`,
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
    
    // Update messages and remove pending confirmation from the previous message
    setMessages(prev => {
      return prev.map(msg => {
        if (msg.id === pendingMessage.id) {
          // Remove the pending confirmation
          const { pendingConfirmation, ...rest } = msg;
          return rest;
        }
        return msg;
      }).concat(confirmationMessage);
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
    
    // Update messages to remove pending confirmation
    setMessages(prev => {
      return prev.map(msg => {
        if (msg.id === pendingMessage.id) {
          // Remove the pending confirmation
          const { pendingConfirmation, ...rest } = msg;
          return rest;
        }
        return msg;
      }).concat({
        id: Date.now().toString(),
        type: 'bot',
        content: 'Cancellation request has been discarded. Your booking remains active. Is there anything else I can help you with?',
        timestamp: new Date()
      });
    });
  };

  // Handler for flight change confirmation
  const handleConfirmChange = (bookingReference: string, newFlightNumber: string) => {
    // Find the message with the pending confirmation
    const pendingMessage = messages.find(
      m => m.type === 'bot' && m.pendingConfirmation?.type === 'CHANGE_FLIGHT'
    );
    
    if (!pendingMessage?.pendingConfirmation) {
      return;
    }
    
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
    
    // Add confirmation message
    const confirmationMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: `Your booking has been changed to flight ${newFlightNumber} successfully.`,
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
    
    // Update messages and remove pending confirmation from the previous message
    setMessages(prev => {
      return prev.map(msg => {
        if (msg.id === pendingMessage.id) {
          // Remove the pending confirmation
          const { pendingConfirmation, ...rest } = msg;
          return rest;
        }
        return msg;
      }).concat(confirmationMessage);
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
    
    // Update messages to remove pending confirmation
    setMessages(prev => {
      return prev.map(msg => {
        if (msg.id === pendingMessage.id) {
          // Remove the pending confirmation
          const { pendingConfirmation, ...rest } = msg;
          return rest;
        }
        return msg;
      }).concat({
        id: Date.now().toString(),
        type: 'bot',
        content: 'Flight change request has been cancelled. Your original booking remains unchanged. Is there anything else I can help you with?',
        timestamp: new Date()
      });
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
          <h1 className="text-xl font-semibold text-gray-800">Delta Airlines</h1>
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
              />
            ))}
            {isLoading && (
              <div className="flex justify-center items-center py-2">
                <div className="animate-pulse text-gray-500">AI is typing...</div>
              </div>
            )}
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
            <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
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