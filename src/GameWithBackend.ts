import { GameEngine, GameEngineConfig } from './engine/GameEngine';
import { AIResponse } from './types/GameTypes';
import { gameStateManager } from './services/GameStateManager';
import { apiClient } from './services/ApiClient';
import { logger } from './utils/ErrorHandling';

/**
 * Enhanced Game Engine with Backend Integration
 * Connects the existing frontend game engine with the backend services
 */
export class GameWithBackend extends GameEngine {
  private isBackendConnected: boolean = false;
  private currentGameId: string | null = null;

  constructor(config?: Partial<GameEngineConfig>) {
    super(config);
    this.setupBackendIntegration();
  }

  private setupBackendIntegration(): void {
    // Listen for backend game state updates
    gameStateManager.onGameStateUpdate((backendGameState) => {
      this.syncWithBackendState(backendGameState);
    });

    // Listen for AI responses
    gameStateManager.onAIResponse((aiResponse) => {
      this.handleAIResponse(aiResponse);
    });
  }

  /**
   * Initialize game with backend authentication
   */
  public async initializeWithBackend(username: string, password: string): Promise<void> {
    try {
      // Login to backend
      const { player, token } = await apiClient.login(username, password);
      logger.info('Player authenticated:', player.username);

      // Initialize game state manager
      await gameStateManager.initialize(token);
      this.isBackendConnected = true;

      logger.info('Backend integration initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize backend integration:', error);
      throw error;
    }
  }

  /**
   * Create new game with backend persistence
   */
  public async createNewGameWithBackend(): Promise<void> {
    try {
      if (!this.isBackendConnected) {
        throw new Error('Backend not connected');
      }

      const backendGameState = await gameStateManager.createNewGame();
      this.currentGameId = backendGameState.id || null;
      
      // Sync frontend state with backend
      this.syncWithBackendState(backendGameState);
      
      logger.info('New game created with backend:', this.currentGameId);
    } catch (error) {
      logger.error('Failed to create new game with backend:', error);
      throw error;
    }
  }

  /**
   * Load existing game from backend
   */
  public async loadGameFromBackend(gameId: string): Promise<void> {
    try {
      if (!this.isBackendConnected) {
        throw new Error('Backend not connected');
      }

      const backendGameState = await gameStateManager.loadGame(gameId);
      this.currentGameId = gameId;
      
      // Sync frontend state with backend
      this.syncWithBackendState(backendGameState);
      
      logger.info('Game loaded from backend:', gameId);
    } catch (error) {
      logger.error('Failed to load game from backend:', error);
      throw error;
    }
  }

  /**
   * Enhanced move player with backend synchronization
   */
  public async movePlayerWithBackend(direction: { x: number; y: number }): Promise<boolean> {
    try {
      if (!this.isBackendConnected || !this.currentGameId) {
        // Fallback to local movement if backend not available
        return this.movePlayerLocal(direction);
      }

      // Send movement to backend (will trigger game state update via WebSocket)
      await gameStateManager.movePlayer(direction);
      
      return true;
    } catch (error) {
      logger.error('Failed to move player with backend:', error);
      
      // Fallback to local movement
      return this.movePlayerLocal(direction);
    }
  }

  /**
   * Local movement fallback
   */
  private movePlayerLocal(direction: { x: number; y: number }): boolean {
    // Convert direction to PlayerAction format
    const directionMap: { [key: string]: string } = {
      '0,-1': 'north',
      '0,1': 'south',
      '-1,0': 'west',
      '1,0': 'east'
    };
    
    const directionKey = `${direction.x},${direction.y}`;
    const directionName = directionMap[directionKey];
    
    if (directionName) {
      this.queueAction({
        type: 'move',
        direction: directionName as any,
        timestamp: Date.now()
      });
      return true;
    }
    
    return false;
  }

  /**
   * Request AI guidance from backend
   */
  public async requestAIGuidance(context: string = 'general_guidance'): Promise<void> {
    try {
      if (!this.isBackendConnected || !this.currentGameId) {
        logger.warn('Backend not connected, cannot request AI guidance');
        return;
      }

      await gameStateManager.requestAIGuidance(context);
    } catch (error) {
      logger.error('Failed to request AI guidance:', error);
    }
  }

  /**
   * Save game to backend
   */
  public async saveGameToBackend(): Promise<void> {
    try {
      if (!this.isBackendConnected || !this.currentGameId) {
        logger.warn('Backend not connected, cannot save game');
        return;
      }

      await gameStateManager.saveGame();
      logger.info('Game saved to backend');
    } catch (error) {
      logger.error('Failed to save game to backend:', error);
    }
  }

  /**
   * Sync frontend game state with backend state
   */
  private syncWithBackendState(backendGameState: any): void {
    try {
      // Get current game state
      const currentState = this.getGameState();
      
      // Update player position
      if (backendGameState.playerPosition) {
        currentState.player.position = backendGameState.playerPosition;
      }

      // Update player stats (map backend format to frontend format)
      if (backendGameState.playerStats) {
        currentState.player.health = backendGameState.playerStats.hp;
        currentState.player.maxHealth = backendGameState.playerStats.maxHp;
        currentState.player.level = backendGameState.playerStats.level;
        currentState.player.experience = backendGameState.playerStats.exp;
      }

      // Update inventory (basic mapping)
      if (backendGameState.inventory) {
        // Map backend inventory to frontend format
        currentState.player.inventory = backendGameState.inventory.items || [];
      }

      // Update enemies (convert backend format to frontend Enemy instances)
      if (backendGameState.enemies) {
        // Map backend enemies to frontend format
        currentState.enemies = backendGameState.enemies.map((enemy: any) => ({
          id: enemy.id,
          name: enemy.type,
          position: { x: enemy.x, y: enemy.y },
          health: enemy.hp,
          maxHealth: enemy.maxHp,
          attackPower: enemy.attack,
          defense: enemy.defense || 0,
          aiType: enemy.aiType || 'aggressive'
        }));
      }

      logger.debug('Frontend state synced with backend');
    } catch (error) {
      logger.error('Failed to sync with backend state:', error);
    }
  }

  /**
   * Handle AI response from backend
   */
  private handleAIResponse(aiResponse: AIResponse): void {
    try {
      // Log AI response for now (could integrate with UI later)
      logger.info(`AI ${aiResponse.type}: ${aiResponse.message}`);

      // Log AI reasoning for debugging
      if (aiResponse.reasoning && aiResponse.reasoning.length > 0) {
        logger.debug('AI Reasoning:', aiResponse.reasoning);
      }

      // Handle suggested actions
      if (aiResponse.suggestedActions && aiResponse.suggestedActions.length > 0) {
        logger.info('AI Suggested Actions:', aiResponse.suggestedActions);
      }
    } catch (error) {
      logger.error('Failed to handle AI response:', error);
    }
  }

  /**
   * Enhanced input handling with backend integration
   */
  public handleKeyPress(event: KeyboardEvent): void {
    // Handle backend-specific controls
    switch (event.key.toLowerCase()) {
      case 'h':
        // Request AI guidance
        this.requestAIGuidance('player_requested_help');
        break;
      
      case 's':
        if (event.ctrlKey) {
          // Save game
          event.preventDefault();
          this.saveGameToBackend();
          break;
        }
        // Fall through to movement handling
      
      default:
        // Handle movement with backend sync
        if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(event.key.toLowerCase())) {
          const direction = this.getDirectionFromKey(event.key);
          if (direction) {
            this.movePlayerWithBackend(direction);
            return; // Don't call parent handler
          }
        }
        
        // Handle other game actions
        this.handleGameAction(event);
        break;
    }
  }

  /**
   * Handle other game actions
   */
  private handleGameAction(event: KeyboardEvent): void {
    switch (event.key.toLowerCase()) {
      case ' ':
        // Space for attack
        this.queueAction({
          type: 'attack',
          timestamp: Date.now()
        });
        break;
      case 'e':
        // E for use item
        this.queueAction({
          type: 'use_item',
          timestamp: Date.now()
        });
        break;
      case 'shift':
        // Shift for defend
        this.queueAction({
          type: 'defend',
          timestamp: Date.now()
        });
        break;
    }
  }

  private getDirectionFromKey(key: string): { x: number; y: number } | null {
    switch (key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        return { x: 0, y: -1 };
      case 's':
      case 'arrowdown':
        return { x: 0, y: 1 };
      case 'a':
      case 'arrowleft':
        return { x: -1, y: 0 };
      case 'd':
      case 'arrowright':
        return { x: 1, y: 0 };
      default:
        return null;
    }
  }

  /**
   * Get backend connection status
   */
  public isConnectedToBackend(): boolean {
    return this.isBackendConnected && gameStateManager.getConnectionStatus();
  }

  /**
   * Disconnect from backend
   */
  public disconnectFromBackend(): void {
    gameStateManager.disconnect();
    this.isBackendConnected = false;
    this.currentGameId = null;
    logger.info('Disconnected from backend');
  }

  /**
   * Get current game ID
   */
  public getCurrentGameId(): string | null {
    return this.currentGameId;
  }
}