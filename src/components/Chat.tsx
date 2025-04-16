import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatProps } from '../types/chat.types';
import { useChat } from '../hooks/useChat';
import Message from './Message';
import '../styles/Chat.css';

const Chat: React.FC<ChatProps> = ({ displayName, roomName, password, onDisconnect }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, error, isConnecting, sendMessage, disconnect } = useChat({
    roomName,
    password,
    displayName,
    onDisconnect
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessage(newMessage);
      setNewMessage('');
    }
  };

  if (error) {
    return (
      <div className="chat-error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={disconnect}>Go Back</button>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="chat-connecting">
        <h2>Connecting to room...</h2>
        <p>Please wait while we verify your access...</p>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Chat Room: {roomName}</h2>
        <button onClick={disconnect}>Leave Room</button>
      </div>
      <div className="messages-container">
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            isOwnMessage={message.sender === displayName}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default Chat; 