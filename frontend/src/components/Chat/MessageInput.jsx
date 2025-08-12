import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

const MessageInput = ({ onSendMessage, isLoading, disabled }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-white/20 bg-white/10 backdrop-blur-md p-6 mt-4">
      <form onSubmit={handleSubmit} className="flex gap-4 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your ingredients (e.g., chicken, rice, tomatoes, onions)..."
            className="w-full resize-none bg-white/90 backdrop-blur-sm border border-white/30 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white focus:shadow-glow transition-all duration-300 min-h-[56px] max-h-32 text-gray-800 placeholder-gray-500 shadow-card hover:shadow-card-hover"
            disabled={isLoading || disabled}
            rows={1}
          />
          {/* Floating label effect */}
          <div className="absolute -top-2 left-4 px-2 bg-white/90 backdrop-blur-sm rounded-full text-xs text-gray-600 opacity-0 transition-opacity duration-200 pointer-events-none">
            Message
          </div>
        </div>
        <button
          type="submit"
          disabled={!message.trim() || isLoading || disabled}
          className="btn-primary px-6 py-4 rounded-2xl flex items-center justify-center min-w-[56px] shadow-glow hover:shadow-glow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none group"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <PaperAirplaneIcon className="w-5 h-5 transform group-hover:translate-x-0.5 transition-transform duration-200" />
          )}
        </button>
      </form>
      
      {/* Keyboard shortcut hint */}
      <div className="flex justify-between items-center mt-3 text-xs text-white/60">
        <span>Press Enter to analyze ingredients, Shift+Enter for new line</span>
        <div className="flex items-center space-x-2">
          <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 text-white/70">⌘</kbd>
          <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 text-white/70">Enter</kbd>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;