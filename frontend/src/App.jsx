import React, { useState, useEffect } from 'react';
import Chat from './components/Chat/Chat';
import MessageList from './components/Chat/MessageList';
import MessageInput from './components/Chat/MessageInput';
import axios from 'axios';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  Bars3Icon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  XMarkIcon as CancelIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingName, setEditingName] = useState('');

  // Generate unique session ID
  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Create new chat session
  const createNewSession = () => {
    const newSessionId = generateSessionId();
    const newSession = {
      id: newSessionId,
      name: `Recipe Analysis ${sessions.length + 1}`,
      createdAt: new Date().toISOString(),
      messages: []
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    setMessages([]);
    setError(null);
    
    // Save to localStorage for fallback
    const updatedSessions = [newSession, ...sessions];
    localStorage.setItem('easyrecipe_sessions', JSON.stringify(updatedSessions));
  };

  // Load session with backend integration
  const loadSession = async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setError(null);
      
      // Try to load from backend first
      try {
        const response = await axios.get(`${API_BASE_URL}/api/chat/history/${sessionId}`);
        if (response.data.history && response.data.history.length > 0) {
          // Convert backend data to frontend message format
          const backendMessages = [];
          response.data.history.forEach(chat => {
            // Add user message
            backendMessages.push({
              id: `${chat.id}_user`,
              type: 'user',
              content: chat.ingredients,
              timestamp: chat.timestamp
            });
            // Add AI response
            backendMessages.push({
              id: `${chat.id}_ai`,
              type: 'ai',
              content: chat.recipes,
              timestamp: chat.timestamp
            });
          });
          setMessages(backendMessages);
          
          // Update local session with backend data
          const updatedSessions = sessions.map(s => 
            s.id === sessionId 
              ? { ...s, messages: backendMessages }
              : s
          );
          setSessions(updatedSessions);
          localStorage.setItem('easyrecipe_sessions', JSON.stringify(updatedSessions));
        } else {
          // Fallback to local storage
          setMessages(session.messages || []);
        }
      } catch (error) {
        console.log('Backend not available, using local storage:', error.message);
        // Fallback to local storage
        setMessages(session.messages || []);
      }
    }
  };

  // Start editing session name
  const startEditingSession = (sessionId, currentName) => {
    setEditingSessionId(sessionId);
    setEditingName(currentName);
  };

  // Save edited session name
  const saveSessionName = async () => {
    if (editingName.trim()) {
      try {
        // Update title in backend database
        await axios.put(`${API_BASE_URL}/api/chat/session/${editingSessionId}/title`, {
          title: editingName.trim()
        });
        console.log('Session title updated in backend successfully');
        
        // Update local state
        const updatedSessions = sessions.map(session => 
          session.id === editingSessionId 
            ? { ...session, name: editingName.trim() }
            : session
        );
        setSessions(updatedSessions);
        localStorage.setItem('easyrecipe_sessions', JSON.stringify(updatedSessions));
        
      } catch (error) {
        console.log('Backend not available for title update, proceeding with local update:', error.message);
        
        // Fallback to local storage update only
        const updatedSessions = sessions.map(session => 
          session.id === editingSessionId 
            ? { ...session, name: editingName.trim() }
            : session
        );
        setSessions(updatedSessions);
        localStorage.setItem('easyrecipe_sessions', JSON.stringify(updatedSessions));
      }
    }
    setEditingSessionId(null);
    setEditingName('');
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingSessionId(null);
    setEditingName('');
  };

  // Delete session with backend integration and real-time UI update
  const deleteSession = async (sessionId) => {
    try {
      // Delete from backend first
      await axios.delete(`${API_BASE_URL}/api/chat/session/${sessionId}`);
      console.log('Session deleted from backend successfully');
      
      // Refresh sessions from database to get real-time update
      const response = await axios.get(`${API_BASE_URL}/api/chat/sessions`);
      const updatedSessions = response.data.sessions || [];
      setSessions(updatedSessions);
      
      // Handle current session logic
      if (currentSessionId === sessionId) {
        if (updatedSessions.length > 0) {
          loadSession(updatedSessions[0].id);
        } else {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
      
    } catch (error) {
      console.log('Backend not available for deletion, proceeding with local deletion:', error.message);
      
      // Fallback to local storage deletion
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);
      localStorage.setItem('easyrecipe_sessions', JSON.stringify(updatedSessions));
      
      if (currentSessionId === sessionId) {
        if (updatedSessions.length > 0) {
          loadSession(updatedSessions[0].id);
        } else {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
    }
  };

  // Send message to API
  const sendMessage = async (ingredients) => {
    if (!ingredients.trim()) return;
    
    if (!currentSessionId) {
      createNewSession();
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: ingredients,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/chat/send`, {
        ingredients: ingredients,
        session_id: currentSessionId
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.data.recipes || [],
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Update session in localStorage
      const updatedMessages = [...messages, userMessage, aiMessage];
      const updatedSessions = sessions.map(session => 
        session.id === currentSessionId 
          ? { ...session, messages: updatedMessages }
          : session
      );
      setSessions(updatedSessions);
      localStorage.setItem('easyrecipe_sessions', JSON.stringify(updatedSessions));
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error.response?.data?.detail || 'Failed to get recipe suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load sessions from Supabase on mount
  useEffect(() => {
    const loadSessionsFromDatabase = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/chat/sessions`);
        if (response.data.sessions && response.data.sessions.length > 0) {
          setSessions(response.data.sessions);
          // Load the most recent session
          loadSession(response.data.sessions[0].id);
        } else {
          // No sessions in database, start with empty state
          setSessions([]);
          setCurrentSessionId(null);
          setMessages([]);
        }
      } catch (error) {
        console.log('Failed to load sessions from database:', error.message);
        // Fallback to localStorage if backend is not available
        const savedSessions = localStorage.getItem('easyrecipe_sessions');
        if (savedSessions) {
          const parsedSessions = JSON.parse(savedSessions);
          setSessions(parsedSessions);
          if (parsedSessions.length > 0) {
            loadSession(parsedSessions[0].id);
          }
        }
      }
    };
    
    loadSessionsFromDatabase();
  }, []);

  return (
    <div className="h-screen bg-soft-gradient overflow-hidden">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 ease-in-out overflow-hidden lg:relative absolute inset-y-0 left-0 z-50 ${sidebarOpen ? 'sidebar-mobile' : 'sidebar-mobile closed'}`}>
          <div className="h-full bg-white/80 backdrop-blur-md border-r border-slate-200/40 flex flex-col shadow-lg">
            {/* Header */}
            <div className="p-6 border-b border-slate-200/30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-700">Recipe History</h1>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              
              <button
                onClick={createNewSession}
                className="w-full btn-primary flex items-center justify-center space-x-2"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="font-semibold">New Recipe Chat</span>
              </button>
            </div>
            {/* Sessions List */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => loadSession(session.id)}
                      className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                        currentSessionId === session.id
                          ? 'bg-indigo-50 border-2 border-indigo-200 shadow-md'
                          : 'bg-white/60 hover:bg-white/80 border border-slate-200/60 hover:border-slate-300/60 hover:shadow-md'
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <ChatBubbleLeftRightIcon className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => loadSession(session.id)}>
                        {editingSessionId === session.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="flex-1 text-sm font-semibold text-slate-700 bg-white border border-indigo-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              onKeyPress={(e) => e.key === 'Enter' && saveSessionName()}
                              onBlur={saveSessionName}
                              autoFocus
                            />
                            <button
                              onClick={saveSessionName}
                              className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            >
                              <CancelIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <h3 className="font-semibold text-slate-700 text-sm truncate">
                              {session.name}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {new Date(session.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingSession(session.id, session.name);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                          title="Rename session"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Delete session"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/40 p-4 shadow-sm flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {!sidebarOpen && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200"
                  >
                    <Bars3Icon className="w-6 h-6" />
                  </button>
                )}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <UserCircleIcon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-700">EasyRecipe - Smart Recipe Analyzer</h2>
                    <p className="text-sm text-slate-500">AI-Powered Recipe Suggestions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Container */}
          <div className="flex-1 flex justify-center p-6 min-h-0">
            <div className="w-full max-w-4xl chat-container flex flex-col h-full">
              {currentSessionId ? (
                <Chat
                  messages={messages}
                  onSendMessage={sendMessage}
                  isLoading={isLoading}
                  error={error}
                />
              ) : (
                <>
                  <MessageList messages={messages} loading={isLoading} />
                  <MessageInput onSendMessage={sendMessage} disabled={isLoading} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
