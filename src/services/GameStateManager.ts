import { GameState, PlayerProfile, AIResponse } from '../types/GameTypes';
import { apiClient } from './ApiClient';
import { webSocketClient } from './WebSocketClient';

export class GameStateManager {
  private static instance: GameStateManager;
  private currentGameState: GameState | null = null;
  private playerProfile: PlayerProfile | null = null;
  private isConnected: boolean = false;
  private gameStateListeners: ((gameState: GameState) => void)[] = [];
  private aiResponseListeners: ((aiResponse: AIResponse) => void)[] = [];

  private constructor() {
    this.setupWebSocketHandlers();
  }

  public static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  private setupWebSocketHandlers(): void {
    webSocketClient.on('game_state_update', (data: any) => {
      if (data.gameState) {
        this.updateGameState(data.gameState);
      }
    });

    webSocketClient.on('ai_response', (aiResponse: AIResponse) => {
      this.notifyAIResponseListeners(aiResponse);
    });

    webSocketClient.on('error', (error: { message: string }) => {
      console.error('WebSocket error in GameStateManager:', error.message);
    });

    webSocketClient.on('disconnected', () => {
      this.isConnected = false;
    });
  }

  public async initialize(token: string): Promise<void> {
    try {
      // Load player profile
      this.playerProfile = await apiClient.getProfile();
      
      // Connect WebSocket
      await webSocketClient.connect(token);
      this.isConnected = true;

      console.log('GameStateManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize GameStateManager:', error);
      throw error;
    }
  }

  public async createNewGame(): Promise<GameState> {
    try {
      const gameState = await apiClient.createNewGame();
      this.currentGameState = gameState;
      
      // Join the game room via WebSocket
      if (this.isConnected) {
        webSocketClient.joinGame(gameState.id);
      }
      
      this.notifyGameStateListeners(gameState);
      return gameState;
    } catch (error) {
      console.error('Failed to create new game:', error);
      throw error;
    }
  }

  public async loadGame(gameId: string): Promise<GameState> {
    try {
      const gameState = await apiClient.loadGame(gameId);
      this.currentGameState = gameState;
      
      // Join the game room via WebSocket
      if (this.isConnected) {
        webSocketClient.joinGame(gameState.id);
      }
      
      this.notifyGameStateListeners(gameState);
      return gameState;
    } catch (error) {
      console.error('Failed to load game:', error);
      throw error;
    }
  }

  public async movePlayer(direction: { x: number; y: number }): Promise<void> {
    if (!this.currentGameState) {
      throw new Error('No active game state');
    }

    try {
      // Send movement via WebSocket for real-time updates
      if (this.isConnected) {
        webSocketClient.sendPlayerAction(this.currentGameState.id, 'move', { direction });
      } else {
        // Fallback to REST API
        const result = await apiClient.movePlayer(this.currentGameState.id, direction);
        this.updateGameState(result.gameState);
        
        if (result.aiResponse) {
          this.notifyAIResponseListeners(result.aiResponse);
        }
      }
    } catch (error) {
      console.error('Failed to move player:', error);
      throw error;
    }
  }

  public async performCombatAction(action: string, target?: string, itemId?: string): Promise<void> {
    if (!this.currentGameState) {
      throw new Error('No active game state');
    }

    try {
      // Send combat action via WebSocket for real-time updates
      if (this.isConnected) {
        webSocketClient.sendPlayerAction(this.currentGameState.id, 'combat_action', {
          action,
          target,
          itemId
        });
      } else {
        // Fallback to REST API
        const result = await apiClient.performCombatAction(this.currentGameState.id, action, target, itemId);
        this.updateGameState(result.gameState);
      }
    } catch (error) {
      console.error('Failed to perform combat action:', error);
      throw error;
    }
  }

  public async requestAIGuidance(context: string = 'general_guidance'): Promise<void> {
    if (!this.currentGameState) {
      throw new Error('No active game state');
    }

    try {
      if (this.isConnected) {
        webSocketClient.requestAIGuidance(this.currentGameState.id, context);
      } else {
        // Fallback to REST API
        const aiResponse = await apiClient.getAIGuidance(this.currentGameState.id, context);
        this.notifyAIResponseListeners(aiResponse);
      }
    } catch (error) {
      console.error('Failed to request AI guidance:', error);
      throw error;
    }
  }

  public async saveGame(): Promise<void> {
    if (!this.currentGameState) {
      throw new Error('No active game state');
    }

    try {
      await apiClient.saveGame(this.currentGameState.id);
      console.log('Game saved successfully');
    } catch (error) {
      console.error('Failed to save game:', error);
      throw error;
    }
  }

  public async updateVisualPreferences(preferences: any): Promise<void> {
    try {
      await apiClient.updateVisualPreferences(preferences);
      
      // Update local player profile
      if (this.playerProfile) {
        this.playerProfile.visualPreferences = {
          ...this.playerProfile.visualPreferences,
          ...preferences
        };
      }
    } catch (error) {
      console.error('Failed to update visual preferences:', error);
      throw error;
    }
  }

  private updateGameState(gameState: GameState): void {
    this.currentGameState = gameState;
    this.notifyGameStateListeners(gameState);
  }

  private notifyGameStateListeners(gameState: GameState): void {
    this.gameStateListeners.forEach(listener => {
      try {
        listener(gameState);
      } catch (error) {
        console.error('Error in game state listener:', error);
      }
    });
  }

  private notifyAIResponseListeners(aiResponse: AIResponse): void {
    this.aiResponseListeners.forEach(listener => {
      try {
        listener(aiResponse);
      } catch (error) {
        console.error('Error in AI response listener:', error);
      }
    });
  }

  // Event subscription methods
  public onGameStateUpdate(listener: (gameState: GameState) => void): () => void {
    this.gameStateListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.gameStateListeners.indexOf(listener);
      if (index !== -1) {
        this.gameStateListeners.splice(index, 1);
      }
    };
  }

  public onAIResponse(listener: (aiResponse: AIResponse) => void): () => void {
    this.aiResponseListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.aiResponseListeners.indexOf(listener);
      if (index !== -1) {
        this.aiResponseListeners.splice(index, 1);
      }
    };
  }

  // Getters
  public getCurrentGameState(): GameState | null {
    return this.currentGameState;
  }

  public getPlayerProfile(): PlayerProfile | null {
    return this.playerProfile;
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public disconnect(): void {
    webSocketClient.disconnect();
    this.isConnected = false;
    this.currentGameState = null;
    this.playerProfile = null;
    this.gameStateListeners = [];
    this.aiResponseListeners = [];
  }
}

export const gameStateManager = GameStateManager.getInstance();