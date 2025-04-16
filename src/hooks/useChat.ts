import { useState, useCallback, useEffect } from 'react';
import { Message } from '../types/chat.types';
import { mqttService } from '../services/mqttService';
import { storageService } from '../services/storageService';

interface UseChatProps {
  roomName: string;
  password: string;
  displayName: string;
  onDisconnect: () => void;
}

export const useChat = ({ roomName, password, displayName, onDisconnect }: UseChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);

  const handleNewMessage = useCallback((message: Message, isUpdate: boolean) => {
    setMessages(prevMessages => {
      let updatedMessages;
      if (isUpdate) {
        updatedMessages = prevMessages.map(m => 
          m.id === message.id ? message : m
        );
      } else {
        const exists = prevMessages.some(m => m.id === message.id);
        if (!exists) {
          updatedMessages = [...prevMessages, message];
        } else {
          updatedMessages = prevMessages;
        }
      }
      
      if (updatedMessages !== prevMessages) {
        storageService.saveMessage(message, roomName);
      }
      
      return updatedMessages;
    });
  }, [roomName]);

  useEffect(() => {
    storageService.cleanupDuplicates(roomName);
    const savedMessages = storageService.getMessages(roomName);
    setMessages(savedMessages);

    setIsConnecting(true);
    setError(null);

    mqttService.setConnectionCallback((success, errorMessage) => {
      setIsConnecting(false);
      if (!success) {
        setError(errorMessage || 'Failed to connect to room');
        onDisconnect();
      }
    });

    mqttService.connect(roomName, password, displayName);
    mqttService.setMessageCallback(handleNewMessage);

    return () => {
      mqttService.disconnect();
    };
  }, [roomName, password, displayName, onDisconnect, handleNewMessage]);

  const sendMessage = useCallback((content: string) => {
    if (content.trim()) {
      mqttService.sendMessage(content.trim(), displayName);
    }
  }, [displayName]);

  const disconnect = useCallback(() => {
    mqttService.disconnect();
    onDisconnect();
  }, [onDisconnect]);

  return {
    messages,
    error,
    isConnecting,
    sendMessage,
    disconnect
  };
}; 