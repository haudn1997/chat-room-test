import React from 'react';
import { Message as MessageType } from '../types/chat.types';
import '../styles/Message.css';

interface MessageProps {
  message: MessageType;
  isOwnMessage: boolean;
}

// Move formatTimestamp outside component to avoid recreation on each render
const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Message: React.FC<MessageProps> = ({ message, isOwnMessage }) => {
  return (
    <div
      className={`message ${isOwnMessage ? 'sent' : 'received'} ${
        message.status === 'pending' ? 'pending' : ''
      }`}
    >
      <div className="message-header">
        <span className="sender">{message.sender}</span>
        <span className="timestamp">{formatTimestamp(message.timestamp)}</span>
        {message.status === 'pending' && (
          <span className="status pending">Pending</span>
        )}
        {message.status === 'error' && <span className="status error">Error</span>}
      </div>
      <div className="message-content">{message.content}</div>
    </div>
  );
};

export default Message; 