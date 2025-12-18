import { GameState } from './GameState';
import { DungeonGenerator, DungeonConfig } from '../dungeon/DungeonGenerator';
import { PlayerAction, Coordinate } from '../types/GameTypes';
import { GameError, handleError } from '../utils/ErrorHandling';
import { MAX_INPUT_RESPONSE_TIME } from '../utils/Constants';
import { MovementController } from '../player/MovementController';
import { PlayerCharacter } from '../player/PlayerCharacter';
import { CombatSystem, CombatTurn } from '../combat/CombatSystem';
import { Enemy } from '../combat/Enemy';
import { PerformanceManager } from '../utils/PerformanceManager';

export interface GameEngineConfig {
  targetFrameRate: number;
  dungeonConfig: DungeonConfig;
}

// Core game engine - main game loop and state management
export class GameEngine {
  private gameState: GameState;
  private dungeonGenerator: DungeonGenerator;
  private movementController: MovementController;
  private playerCharacter: PlayerCharacter;
  private combatSystem: CombatSystem;
  private isRunning: boolean = false;
  private lastFrameTime: number = 0;
  private frameId: number | null = null;
  private config: GameEngineConfig;
  private inputQueue: PlayerAction[] = [];
  private performanceManager: PerformanceManager;

  constructor(config?: Partial<GameEngineConfig>) {
    this.config = {
      targetFrameRate: 60,
      dungeonConfig: {
        width: 30,
        height: 30,
        minRooms: 5,
        maxRooms: 12
      },
      ...config
    };

    this.dungeonGenerator = new DungeonGenerator();
    this.gameState = new GameState();
    this.combatSystem = new CombatSystem();
    this.performanceManager = PerformanceManager.getInstance();
    
    // Initialize player character and movement controller
    this.playerCharacter = new PlayerCharacter(this.gameState.player);
    this.movementController = new MovementController(this.gameState.dungeon, this.playerCharacter);
    
    this.initializeGame();
  }

  private initializeGame(): void {
    try {
      // Generate initial dungeon
      const dungeon = this.dungeonGenerator.generate(this.config.dungeonConfig);
      this.gameState.dungeon = dungeon;

      // Place player in first room
      if (dungeon.rooms.length > 0) {
        const firstRoom = dungeon.rooms[0];
        if (firstRoom) {
          const playerPosition = {
            x: firstRoom.position.x + Math.floor(firstRoom.width / 2),
            y: firstRoom.position.y + Math.floor(firstRoom.height / 2)
          };
          
          this.gameState.player.position = playerPosition;
          this.playerCharacter.moveTo(playerPosition);
          this.gameState.currentRoom = firstRoom.id;
        }
      }

      // Initialize enemies and items from dungeon
      // Convert basic enemy data to Enemy instances
      this.gameState.enemies = dungeon.rooms.flatMap(room => 
        room.enemies.map(enemyData => new Enemy(enemyData))
      );
      this.gameState.items = dungeon.rooms.flatMap(room => room.items);

      // Update movement controller with new dungeon
      this.movementController.updateDungeon(dungeon);

    } catch (error) {
      handleError(error as Error, 'Failed to initialize game', { context: 'GameEngine.initializeGame' });
      throw new GameError('Failed to initialize game', 'INITIALIZATION_ERROR');
    }
  }

  // Start the main game loop
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  // Stop the game loop
  stop(): void {
    this.isRunning = false;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  // Main game loop with performance optimization
  private gameLoop(): void {
    if (!this.isRunning) {
      return;
    }

    const frameStartTime = performance.now();
    const deltaTime = frameStartTime - this.lastFrameTime;

    try {
      // Process input (critical priority)
      this.performanceManager.startSystemTimer('input');
      this.processInput();
      const inputResult = this.performanceManager.endSystemTimer('input');

      // Update game state (critical priority)
      this.performanceManager.startSystemTimer('gameLogic');
      this.update(deltaTime);
      const gameLogicResult = this.performanceManager.endSystemTimer('gameLogic');

      // Advance game time
      this.gameState.advanceTime(deltaTime);

      // Record frame performance
      const frameTime = performance.now() - frameStartTime;
      this.performanceManager.recordFrameTime(frameTime);

      this.lastFrameTime = frameStartTime;

      // Schedule next frame
      this.frameId = requestAnimationFrame(() => this.gameLoop());

      // Log performance warnings if needed
      if (inputResult.performanceImpact === 'high' || gameLogicResult.performanceImpact === 'high') {
        console.warn('Performance impact detected in critical systems', {
          input: inputResult,
          gameLogic: gameLogicResult
        });
      }

    } catch (error) {
      handleError(error as Error, 'Game loop error', { context: 'GameEngine.gameLoop' });
      this.stop();
    }
  }

  // Process queued input actions with performance monitoring
  private processInput(): void {
    const startTime = performance.now();
    const inputBudget = this.performanceManager.getSystemBudget('input');

    while (this.inputQueue.length > 0 && 
           (performance.now() - startTime) < Math.min(MAX_INPUT_RESPONSE_TIME, inputBudget)) {
      const action = this.inputQueue.shift();
      if (action) {
        this.handlePlayerAction(action);
      }
    }

    // If we couldn't process all input due to performance constraints, prioritize the most recent
    if (this.inputQueue.length > 5) {
      // Keep only the 3 most recent actions to prevent input lag
      this.inputQueue = this.inputQueue.slice(-3);
    }
  }

  // Handle individual player actions
  private handlePlayerAction(action: PlayerAction): void {
    try {
      switch (action.type) {
        case 'move':
          this.handleMovement(action);
          break;
        case 'attack':
          this.handleAttack(action);
          break;
        case 'use_item':
          this.handleItemUse(action);
          break;
        case 'defend':
          this.handleDefend(action);
          break;
        default:
          console.warn('Unknown action type:', action.type);
      }
    } catch (error) {
      handleError(error as Error, 'Player action error', { context: 'GameEngine.handlePlayerAction', action });
    }
  }

  private handleMovement(action: PlayerAction): void {
    if (!action.direction) {
      return;
    }

    // If in combat, handle as combat movement
    if (this.gameState.isInCombat) {
      this.handleCombatAction(action);
      return;
    }

    // Use MovementController for validation and execution
    const movementResult = this.movementController.executeMovement(action);
    
    if (movementResult.success && movementResult.newPosition) {
      // Update game state with new position
      this.gameState.updatePlayerPosition(movementResult.newPosition);
      
      // Update current room
      const newRoom = this.movementController.getCurrentRoom();
      if (newRoom) {
        this.gameState.currentRoom = newRoom;
      }

      // Check for encounters after movement
      this.checkEncounters();
    } else {
      // Movement was blocked - could trigger UI feedback here
      console.log(`Movement blocked: ${movementResult.blockedReason}`);
    }
  }

  private handleAttack(action: PlayerAction): void {
    if (this.gameState.isInCombat) {
      this.handleCombatAction(action);
    } else {
      // Not in combat - initiate combat if enemy is nearby
      const nearbyEnemies = this.combatSystem.checkForEncounter(this.gameState);
      if (nearbyEnemies.length > 0) {
        this.combatSystem.initiateCombat(this.gameState, nearbyEnemies);
        this.handleCombatAction(action);
      }
    }
  }

  private handleItemUse(action: PlayerAction): void {
    if (this.gameState.isInCombat) {
      this.handleCombatAction(action);
    } else {
      // Basic item use implementation outside of combat
      if (action.item) {
        const itemIndex = this.gameState.player.inventory.findIndex(i => i.id === action.item?.id);
        if (itemIndex >= 0) {
          // Handle consumable items
          if (action.item.type === 'consumable') {
            // Apply item effects
            if (action.item.properties['effect'] === 'heal') {
              const healAmount = action.item.properties['amount'] || 20;
              this.playerCharacter.heal(healAmount);
            }
            // Remove consumable items from inventory
            this.gameState.player.inventory.splice(itemIndex, 1);
          }
        }
      }
    }
  }

  private handleDefend(action: PlayerAction): void {
    if (this.gameState.isInCombat) {
      this.handleCombatAction(action);
    } else {
      // Not in combat - just advance the turn
      this.gameState.advanceTurn();
    }
  }

  // Handle actions during combat
  private handleCombatAction(action: PlayerAction): void {
    const aliveEnemies = this.gameState.enemies.filter(e => e.isAlive());
    
    if (aliveEnemies.length === 0) {
      // No enemies left, end combat
      this.combatSystem.forceCombatEnd(this.gameState);
      return;
    }

    try {
      const combatTurn = this.combatSystem.processCombatTurn(
        this.gameState, 
        action, 
        aliveEnemies
      );
      
      // Log combat turn for debugging
      console.log(`Combat Turn ${combatTurn.turnNumber}: Player ${action.type}, ${combatTurn.enemyActions.length} enemy actions`);
      
    } catch (error) {
      handleError(error as Error, 'Combat action error', { context: 'GameEngine.handleCombatAction', action });
      // Force end combat on error to prevent stuck state
      this.combatSystem.forceCombatEnd(this.gameState);
    }
  }

  // Update game systems
  private update(deltaTime: number): void {
    // Update enemy AI (basic implementation)
    this.updateEnemies(deltaTime);

    // Check for encounters
    this.checkEncounters();

    // Validate game state
    if (!this.gameState.validate()) {
      throw new GameError('Game state validation failed', 'INVALID_STATE');
    }
  }

  private updateEnemies(_deltaTime: number): void {
    // Only update enemy AI when not in combat
    if (this.gameState.isInCombat) {
      return;
    }

    // Update enemy AI behavior outside of combat
    for (const enemy of this.gameState.enemies) {
      if (!enemy.isAlive()) {
        continue;
      }

      // Use enemy AI to decide actions
      const action = enemy.decideAction(
        this.gameState.player, 
        (pos) => this.gameState.isValidPosition(pos)
      );

      // Execute non-combat actions (like patrol movement)
      if (action.type === 'move' && action.target && typeof action.target === 'object') {
        enemy.executeAction(action);
      }
    }
  }

  private checkEncounters(): void {
    if (this.gameState.isInCombat) {
      return; // Already in combat
    }

    // Use combat system to check for encounters
    const encounterEnemies = this.combatSystem.checkForEncounter(this.gameState);
    
    if (encounterEnemies.length > 0) {
      console.log(`Encounter initiated with ${encounterEnemies.length} enemies`);
      this.combatSystem.initiateCombat(this.gameState, encounterEnemies);
    }
  }

  // Public API methods
  queueAction(action: PlayerAction): void {
    this.inputQueue.push(action);
  }

  getGameState(): GameState {
    return this.gameState.clone();
  }

  saveGame(): string {
    return this.gameState.serialize();
  }

  loadGame(serializedState: string): void {
    try {
      this.gameState = GameState.deserialize(serializedState);
      if (!this.gameState.validate()) {
        throw new GameError('Loaded game state is invalid', 'INVALID_LOADED_STATE');
      }
    } catch (error) {
      handleError(error as Error, 'Failed to load game', { context: 'GameEngine.loadGame' });
      throw new GameError('Failed to load game', 'LOAD_ERROR');
    }
  }

  // Generate a new dungeon
  generateNewDungeon(config?: DungeonConfig): void {
    const dungeonConfig = config || this.config.dungeonConfig;
    const newDungeon = this.dungeonGenerator.generate(dungeonConfig);
    
    this.gameState.dungeon = newDungeon;
    // Convert basic enemy data to Enemy instances
    this.gameState.enemies = newDungeon.rooms.flatMap(room => 
      room.enemies.map(enemyData => new Enemy(enemyData))
    );
    this.gameState.items = newDungeon.rooms.flatMap(room => room.items);
    
    // Reset player position to first room
    if (newDungeon.rooms.length > 0) {
      const firstRoom = newDungeon.rooms[0];
      if (firstRoom) {
        const playerPosition = {
          x: firstRoom.position.x + Math.floor(firstRoom.width / 2),
          y: firstRoom.position.y + Math.floor(firstRoom.height / 2)
        };
        
        this.gameState.player.position = playerPosition;
        this.playerCharacter.moveTo(playerPosition);
        this.gameState.currentRoom = firstRoom.id;
      }
    }
    
    // Update movement controller with new dungeon
    this.movementController.updateDungeon(newDungeon);
  }

  // Check if game is currently running
  isGameRunning(): boolean {
    return this.isRunning;
  }

  // Get player character instance
  getPlayerCharacter(): PlayerCharacter {
    return this.playerCharacter;
  }

  // Get movement controller instance
  getMovementController(): MovementController {
    return this.movementController;
  }

  // Check if player can move in a specific direction
  canPlayerMove(direction: string): boolean {
    return this.movementController.canMoveInDirection(direction);
  }

  // Get valid adjacent positions for player
  getValidPlayerMoves(): Coordinate[] {
    return this.movementController.getValidAdjacentPositions(this.playerCharacter.position);
  }

  // Combat system methods
  getCombatSystem(): CombatSystem {
    return this.combatSystem;
  }

  // Check if currently in combat
  isInCombat(): boolean {
    return this.gameState.isInCombat;
  }

  // Get enemies in detection range
  getNearbyEnemies(range: number = 3): Enemy[] {
    return this.combatSystem.getEnemiesInRange(this.gameState, range);
  }

  // Get current combat log
  getCombatLog(): CombatTurn[] {
    return this.combatSystem.getCombatLog();
  }

  // Force end combat (for testing or special scenarios)
  endCombat(): void {
    this.combatSystem.forceCombatEnd(this.gameState);
  }

  // Get combat statistics
  getCombatStats() {
    return this.combatSystem.getCombatStats();
  }

  // Performance management methods

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics() {
    return this.performanceManager.getPerformanceMetrics();
  }

  /**
   * Enable or disable performance optimization mode
   */
  setPerformanceMode(enabled: boolean): void {
    this.performanceManager.enablePerformanceMode(enabled);
  }

  /**
   * Check if a system should be throttled
   */
  shouldThrottleSystem(systemName: string): boolean {
    return this.performanceManager.shouldThrottleSystem(systemName);
  }

  /**
   * Get adaptive settings for rendering and AI systems
   */
  getAdaptiveSettings() {
    return this.performanceManager.getAdaptiveSettings();
  }

  /**
   * Enable or disable specific systems for performance
   */
  setSystemEnabled(systemName: string, enabled: boolean): void {
    this.performanceManager.setSystemEnabled(systemName, enabled);
  }
}