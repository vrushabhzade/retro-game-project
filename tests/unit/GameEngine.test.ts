import { GameEngine } from '../../src/engine/GameEngine';
import { PlayerAction } from '../../src/types/GameTypes';

describe('GameEngine', () => {
  let gameEngine: GameEngine;

  beforeEach(() => {
    gameEngine = new GameEngine({
      dungeonConfig: {
        width: 20,
        height: 20,
        minRooms: 3,
        maxRooms: 5
      }
    });
  });

  afterEach(() => {
    gameEngine.stop();
  });

  test('should initialize with valid game state', () => {
    const gameState = gameEngine.getGameState();
    
    expect(gameState.dungeon).toBeDefined();
    expect(gameState.dungeon.rooms.length).toBeGreaterThan(0);
    expect(gameState.player).toBeDefined();
    expect(gameState.player.position).toBeDefined();
    expect(gameState.validate()).toBe(true);
  });

  test('should handle movement actions', () => {
    const moveAction: PlayerAction = {
      type: 'move',
      direction: 'north',
      timestamp: Date.now()
    };

    gameEngine.queueAction(moveAction);
    
    // Process the action (simulate one frame)
    gameEngine.start();
    setTimeout(() => {
      gameEngine.stop();
      const newState = gameEngine.getGameState();
      
      // Position should either change (if move was valid) or stay the same (if blocked)
      expect(newState.player.position).toBeDefined();
      expect(newState.validate()).toBe(true);
    }, 50);
  });

  test('should serialize and deserialize game state', () => {
    const originalState = gameEngine.getGameState();
    const serialized = gameEngine.saveGame();
    
    expect(serialized).toBeDefined();
    expect(typeof serialized).toBe('string');

    // Create new engine and load the state
    const newEngine = new GameEngine();
    newEngine.loadGame(serialized);
    const loadedState = newEngine.getGameState();

    expect(loadedState.player.position).toEqual(originalState.player.position);
    expect(loadedState.dungeon.rooms.length).toBe(originalState.dungeon.rooms.length);
    expect(loadedState.validate()).toBe(true);

    newEngine.stop();
  });

  test('should generate new dungeon', () => {
    gameEngine.generateNewDungeon({
      width: 25,
      height: 25,
      minRooms: 6,
      maxRooms: 10
    });

    const newState = gameEngine.getGameState();
    
    expect(newState.dungeon.width).toBe(25);
    expect(newState.dungeon.height).toBe(25);
    expect(newState.dungeon.rooms.length).toBeGreaterThanOrEqual(6);
    expect(newState.validate()).toBe(true);
  });

  test('should maintain game state integrity', () => {
    const gameState = gameEngine.getGameState();
    
    // Test various game state properties
    expect(gameState.gameTime).toBeGreaterThanOrEqual(0);
    expect(gameState.turnNumber).toBeGreaterThanOrEqual(0);
    expect(gameState.player.health).toBeGreaterThan(0);
    expect(gameState.player.maxHealth).toBeGreaterThan(0);
    expect(gameState.difficulty).toMatch(/^(easy|medium|hard)$/);
  });
});