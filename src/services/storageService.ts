import { Message } from '../types/chat.types';

class StorageService {
  private getStorageKey(roomName: string): string {
    return `chat_messages_${roomName}`;
  }

  saveMessage(message: Message, roomName: string): void {
    const messages = this.getMessages(roomName);
    const existingIndex = messages.findIndex(m => m.id === message.id);

    if (existingIndex !== -1) {
      // Update existing message
      messages[existingIndex] = message;
    } else {
      // Add new message
      messages.push(message);
    }

    localStorage.setItem(this.getStorageKey(roomName), JSON.stringify(messages));
  }

  getMessages(roomName: string): Message[] {
    const messages = localStorage.getItem(this.getStorageKey(roomName));
    return messages ? JSON.parse(messages) : [];
  }

  clearMessages(roomName: string): void {
    localStorage.removeItem(this.getStorageKey(roomName));
  }

  // Clear all messages for all rooms
  clearAllMessages(): void {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('chat_messages_')) {
        localStorage.removeItem(key);
      }
    }
  }

  // Remove duplicate messages for a room
  cleanupDuplicates(roomName: string): void {
    const messages = this.getMessages(roomName);
    const uniqueMessages = messages.reduce((acc: Message[], current) => {
      const exists = acc.find(m => m.id === current.id);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);
    
    if (uniqueMessages.length !== messages.length) {
      localStorage.setItem(this.getStorageKey(roomName), JSON.stringify(uniqueMessages));
    }
  }
}

export const storageService = new StorageService(); 