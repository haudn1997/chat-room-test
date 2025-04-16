import mqtt, { MqttClient } from 'mqtt';
import { encryptMessage, decryptMessage } from '../utils/encryption';
import { Message } from '../types/chat.types';

class MQTTService {
  private client: MqttClient | null = null;
  private messageQueue: Message[] = [];
  private roomName: string = '';
  private password: string = '';
  private onMessageCallback: ((message: Message, isUpdate: boolean) => void) | null = null;
  private onConnectionCallback: ((success: boolean, error?: string) => void) | null = null;
  private onConnectionStatusCallback: ((isConnected: boolean) => void) | null = null;
  private isConnected: boolean = false;
  private messageCounter: number = 0;
  private currentUser: string = '';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly RECONNECT_INTERVAL = 5000; // 5 seconds

  private generateUniqueId(): string {
    this.messageCounter += 1;
    return `${Date.now()}_${this.messageCounter}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async connect(roomName: string, password: string, displayName: string): Promise<void> {
    this.roomName = roomName;
    this.password = password;
    this.currentUser = displayName;
    this.messageCounter = 0;

    console.log('Connecting to MQTT broker...');
    this.client = mqtt.connect('wss://test.mosquitto.org:8081', {
      reconnectPeriod: 0, // Disable auto reconnect - we'll handle it manually
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', async () => {
      console.log('Connected to MQTT broker successfully');
      this.isConnected = true;
      
      if (this.onConnectionStatusCallback) {
        this.onConnectionStatusCallback(true);
      }

      // Subscribe to room verification topic first
      const verificationTopic = `chat/${this.roomName}/verify`;
      const roomTopic = `chat/${this.roomName}`;
      
      try {
        // Send a verification message
        const verificationMessage = {
          type: 'verify',
          timestamp: Date.now(),
          sender: this.currentUser
        };
        
        const encryptedVerification = await encryptMessage(
          JSON.stringify(verificationMessage),
          this.password
        );

        // Subscribe to verification topic
        this.client?.subscribe(verificationTopic, async (err) => {
          if (err) {
            console.error('Verification subscribe error:', err);
            if (this.onConnectionCallback) {
              this.onConnectionCallback(false, 'Failed to connect to room');
            }
            return;
          }

          // Publish verification message
          this.client?.publish(verificationTopic, encryptedVerification);
        });

        // Subscribe to main room topic
        this.client?.subscribe(roomTopic, (err) => {
          if (err) {
            console.error('Room subscribe error:', err);
            if (this.onConnectionCallback) {
              this.onConnectionCallback(false, 'Failed to connect to room');
            }
          }
        });

        // Process any pending messages
        this.processPendingMessages();

      } catch (error) {
        console.error('Error during room verification:', error);
        if (this.onConnectionCallback) {
          this.onConnectionCallback(false, 'Failed to verify room password');
        }
      }
    });

    this.client.on('message', async (topic, message) => {
      try {
        // Handle verification messages
        if (topic === `chat/${this.roomName}/verify`) {
          try {
            await decryptMessage(message.toString(), this.password);
            // If we can decrypt the verification message, password is correct
            if (this.onConnectionCallback) {
              this.onConnectionCallback(true);
            }
          } catch (error) {
            console.error('Password verification failed:', error);
            if (this.onConnectionCallback) {
              this.onConnectionCallback(false, 'Incorrect room password');
            }
            this.disconnect();
            return;
          }
          return;
        }

        // Handle regular chat messages
        if (topic === `chat/${this.roomName}`) {
          try {
            const decryptedContent = await decryptMessage(message.toString(), this.password);
            const parsedMessage = JSON.parse(decryptedContent);

            if (parsedMessage.sender === this.currentUser) {
              const pendingMessage = this.messageQueue.find(m => m.id === parsedMessage.id);
              if (pendingMessage) {
                pendingMessage.status = 'sent';
                this.messageQueue = this.messageQueue.filter(m => m.id !== parsedMessage.id);
                if (this.onMessageCallback) {
                  this.onMessageCallback(pendingMessage, true);
                }
              }
            } else {
              if (this.onMessageCallback) {
                this.onMessageCallback({
                  ...parsedMessage,
                  status: 'sent'
                }, false);
              }
            }
          } catch (error) {
            console.error('Error processing message:', error);
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    this.client.on('error', (error) => {
      console.error('MQTT Error:', error);
      this.handleDisconnection();
    });

    this.client.on('close', () => {
      console.log('MQTT Connection closed');
      this.handleDisconnection();
    });

    this.client.on('offline', () => {
      console.log('MQTT Client went offline');
      this.handleDisconnection();
    });
  }

  private handleDisconnection(): void {
    if (this.isConnected) {
      this.isConnected = false;
      if (this.onConnectionStatusCallback) {
        this.onConnectionStatusCallback(false);
      }

      // Mark all messages in queue as pending
      this.messageQueue.forEach(message => {
        if (message.status === 'sent') {
          message.status = 'pending';
          if (this.onMessageCallback) {
            this.onMessageCallback(message, true);
          }
        }
      });

      // Start reconnection timer if not already started
      if (!this.reconnectTimer) {
        this.reconnectTimer = setInterval(() => {
          if (!this.isConnected && this.client) {
            console.log('Attempting to reconnect...');
            this.client.reconnect();
          }
        }, this.RECONNECT_INTERVAL);
      }
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      console.log('Disconnecting from MQTT broker');
      this.client.end();
      this.client = null;
      this.isConnected = false;
      this.messageQueue = [];
    }
  }

  sendMessage(content: string, sender: string): void {
    console.log('Attempting to send message:', content);
    const message: Message = {
      id: this.generateUniqueId(),
      sender,
      content,
      timestamp: Date.now(),
      status: 'pending'
    };

    // Add message to queue and notify UI immediately
    this.messageQueue.push(message);
    if (this.onMessageCallback) {
      this.onMessageCallback(message, false);
    }

    // Try to send the message if connected
    if (this.isConnected) {
      this.processPendingMessages();
    }
  }

  private async processPendingMessages(): Promise<void> {
    if (!this.client?.connected || !this.isConnected) {
      console.log('Client not connected, messages will be sent when connection is restored');
      return;
    }

    for (const message of this.messageQueue) {
      if (message.status === 'pending') {
        try {
          const encryptedMessage = await encryptMessage(
            JSON.stringify(message),
            this.password
          );
          
          this.client?.publish(`chat/${this.roomName}`, encryptedMessage);
        } catch (error) {
          console.error('Error sending message:', error);
          message.status = 'error';
          if (this.onMessageCallback) {
            this.onMessageCallback(message, true);
          }
        }
      }
    }
  }

  setMessageCallback(callback: (message: Message, isUpdate: boolean) => void): void {
    this.onMessageCallback = callback;
  }

  setConnectionCallback(callback: (success: boolean, error?: string) => void): void {
    this.onConnectionCallback = callback;
  }

  setConnectionStatusCallback(callback: (isConnected: boolean) => void): void {
    this.onConnectionStatusCallback = callback;
  }
}

export const mqttService = new MQTTService(); 