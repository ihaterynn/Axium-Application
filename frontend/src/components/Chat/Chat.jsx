import React from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const Chat = ({ messages, onSendMessage, isLoading, error }) => {
  return (
    <div className="flex flex-col h-full">
      <MessageList 
        messages={messages} 
        isLoading={isLoading} 
        error={error}
      />
      <MessageInput 
        onSendMessage={onSendMessage} 
        isLoading={isLoading}
        placeholder="Enter your available ingredients (e.g., tomatoes, pasta, garlic, cheese)..."
      />
    </div>
  );
};

export default Chat;