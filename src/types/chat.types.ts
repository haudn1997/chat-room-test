export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  status: 'sent' | 'pending' | 'error';
}

export interface ChatProps {
  displayName: string;
  roomName: string;
  password: string;
  onDisconnect: () => void;
} 