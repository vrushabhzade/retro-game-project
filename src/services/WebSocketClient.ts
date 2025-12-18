import { io, Socket } from 'socket.io-client';
import { WebSocketMessage } from '../types/GameTypes';

export type WebSocketEventHandler = (data: any) => void;

export class WebSocketClient {
  private socket: Socket | null = null;
  private serverUrl: string;
  private isConnected: boolean = false;
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map();

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
  }

  public connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.disconnect();
      }

      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        
        // Authenticate with the server
        this.socket!.emit('authenticate', { token });
      });

      this.socket.on('authenticated', (data: { playerId: string }) => {
        console.log('WebSocket authenticated for player:', data.playerId);
        this.isConnected = true;
        resolve();
      });

      this.socket.on('auth_error', (error: { message: string }) => {
        console.error('WebSocket authentication failed:', error.message);
        this.disconnect();
        reject(new Error(error.message));
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.emit('disconnected', {});
      });

      this.socket.on('error', (error: { message: string }) => {
        console.error('WebSocket error:', error.message);
        this.emit('error', error);
      });

      // Game-specific event handlers
      this.socket.on('game_state_update', (message: WebSocketMessage) => {
        this.emit('game_state_update', message.payload);
      });

      this.socket.on('ai_response', (message: WebSocketMessage) => {
        this.emit('ai_response', message.payload);
      });

      this.socket.on('combat_analysis', (message: WebSocketMessage) => {
        this.emit('combat_analysis', message.payload);
      });

      this.socket.on('broadcast', (message: WebSocketMessage) => {
        this.emit('broadcast', message.payload);
      });

      // Connection timeout
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.eventHandlers.clear();
  }

  public joinGame(gameId: string): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('join_game', { gameId });
  }

  public sendPlayerAction(gameId: string, action: string, payload: any): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('player_action', {
      gameId,
      action,
      payload,
    });
  }

  public requestAIGuidance(gameId: string, context: string): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('request_ai_guidance', {
      gameId,
      context,
    });
  }

  // Event handling
  public on(event: string, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  public off(event: string, handler?: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      return;
    }

    if (handler) {
      const handlers = this.eventHandlers.get(event)!;
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.eventHandlers.delete(event);
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const webSocketClient = new WebSocketClient();