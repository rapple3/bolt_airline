import React, { useState, useEffect } from 'react';
import { Plane, RotateCcw, Search, MapPin, Menu, X, User } from 'lucide-react';
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
    content: "Hello! I'm your AI travel assistant. How can I help you today?",
    timestamp: new Date()
  }]);
  const [handoff, setHandoff] = useState<AgentHandoff | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(dataManager.getUserProfile());
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      content: `Hello ${profile.name}! I'm your AI travel assistant. How can I help you today?`,
      timestamp: new Date()
    }]);
    resetChatHistory();
    
    // Update the data manager with the new user
    dataManager.setUserProfile(profile);
    // Close sidebar on mobile after selection
    setSidebarOpen(false);
  };

  const handleAgentHandoff = (reason: string) => {
    const newHandoff: AgentHandoff = {
      customerId: currentUser.id,
      bookingDetails: dataManager.getBookings()[0] || mockBookings[0],
      problemSummary: reason,
      attemptedSolutions: messages
        .filter(m => m.type === 'bot')
        .map(m => m.content),
      nextSteps: ['Review customer history', 'Assess specific needs', 'Provide personalized solution']
    };
    setHandoff(newHandoff);
    setShowHandoffModal(true);
  };

  const handleCloseHandoffModal = () => {
    setShowHandoffModal(false);
  };

  const handleReset = () => {
    setMessages([{
      id: '1',
      type: 'bot',
      content: `Hello ${currentUser.name}! I'm your AI travel assistant. How can I help you today?`,
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
        actionResult: response.actionResult
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
          <h1 className="text-xl font-semibold text-gray-800">Bolt Airlines</h1>
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
              currentUserId={currentUser.id}
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
          
          <div className="mt-4 space-y-2">
            <button
              onClick={handleResetData}
              className="flex items-center justify-center w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Data & Flights
            </button>
            
            <button
              onClick={handleTestFlightSearch}
              className="flex items-center justify-center w-full py-2 px-4 bg-blue-100 hover:bg-blue-200 rounded-md text-blue-700 transition-colors"
            >
              <Search className="w-4 h-4 mr-2" />
              Test Common Routes
            </button>
            
            <button
              onClick={handleTestUncommonRoute}
              className="flex items-center justify-center w-full py-2 px-4 bg-purple-100 hover:bg-purple-200 rounded-md text-purple-700 transition-colors"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Test Uncommon Routes
            </button>
          </div>
          
          <div className="mt-4 md:hidden">
            <UserSelector 
              currentUserId={currentUser.id}
              onSelectUser={handleUserSelect}
            />
          </div>
        </aside>

        {/* Main chat area */}
        <main className="flex-1 flex flex-col">
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
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