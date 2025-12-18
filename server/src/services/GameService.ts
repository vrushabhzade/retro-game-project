import { v4 as uuidv4 } from 'uuid';
import { GameState, PlayerStats, Inventory, Enemy, Treasure, Door, DungeonCell } from '../types';
import { GameStateModel } from '../models/GameState';
import { logger } from '../utils/logger';

export class GameService {
  private static instance: GameService;

  private constructor() {}

  public static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  /**
   * Create a new game session for a player
   */
  public async createNewGame(playerId: string): Promise<GameState> {
    try {
      const gameId = uuidv4();
      
      const initialPlayerStats: PlayerStats = {
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        level: 1,
        exp: 0,
        expToLevel: 100,
        attack: 15,
        defense: 5,
        gold: 0
      };

      const initialInventory: Inventory = {
        potions: 2,
        keys: 0,
        items: []
      };

      // Generate initial dungeon
      const dungeonData = this.generateDungeon(1);

      const gameState: GameState = {
        id: gameId,
        playerId,
        dungeonLevel: 1,
        playerPosition: { x: 1, y: 1 },
        playerStats: initialPlayerStats,
        inventory: initialInventory,
        dungeonMap: dungeonData.map,
        enemies: dungeonData.enemies,
        treasures: dungeonData.treasures,
        doors: dungeonData.doors,
        gameStatus: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const savedGame = new GameStateModel(gameState);
      await savedGame.save();

      logger.info(`New game created for player ${playerId}`, { gameId });
      return gameState;

    } catch (error) {
      logger.error('Error creating new game:', error);
      throw new Error('Failed to create new game');
    }
  }

  /**
   * Load an existing game state
   */
  public async loadGame(gameId: string, playerId: string): Promise<GameState | null> {
    try {
      const gameState = await GameStateModel.findOne({ 
        id: gameId, 
        playerId,
        gameStatus: { $in: ['active', 'paused'] }
      }).lean();

      if (!gameState) {
        logger.warn(`Game not found: ${gameId} for player ${playerId}`);
        return null;
      }

      return gameState as GameState;

    } catch (error) {
      logger.error('Error loading game:', error);
      throw new Error('Failed to load game');
    }
  }

  /**
   * Save current game state
   */
  public async saveGame(gameState: GameState): Promise<void> {
    try {
      await GameStateModel.updateOne(
        { id: gameState.id },
        { 
          ...gameState,
          updatedAt: new Date()
        },
        { upsert: true }
      );

      logger.debug(`Game saved: ${gameState.id}`);

    } catch (error) {
      logger.error('Error saving game:', error);
      throw new Error('Failed to save game');
    }
  }

  /**
   * Get all active games for a player
   */
  public async getPlayerGames(playerId: string): Promise<GameState[]> {
    try {
      const games = await GameStateModel.find({ 
        playerId,
        gameStatus: { $in: ['active', 'paused'] }
      })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

      return games as GameState[];

    } catch (error) {
      logger.error('Error fetching player games:', error);
      throw new Error('Failed to fetch player games');
    }
  }

  /**
   * Process player movement
   */
  public processMovement(
    gameState: GameState, 
    direction: { x: number; y: number }
  ): { 
    success: boolean; 
    newPosition?: { x: number; y: number };
    events: string[];
    updatedGameState: GameState;
  } {
    const events: string[] = [];
    const newX = gameState.playerPosition.x + direction.x;
    const newY = gameState.playerPosition.y + direction.y;

    // Check bounds
    if (newX < 0 || newX >= gameState.dungeonMap[0].length || 
        newY < 0 || newY >= gameState.dungeonMap.length) {
      return { 
        success: false, 
        events: ['Cannot move outside dungeon bounds'],
        updatedGameState: gameState
      };
    }

    // Check for walls
    const targetCell = gameState.dungeonMap[newY][newX];
    if (targetCell.type === 'wall') {
      return { 
        success: false, 
        events: ['Path blocked by wall'],
        updatedGameState: gameState
      };
    }

    // Update position
    const updatedGameState = {
      ...gameState,
      playerPosition: { x: newX, y: newY }
    };

    // Mark cell as explored
    updatedGameState.dungeonMap[newY][newX].explored = true;

    // Check for treasures
    const treasureIndex = gameState.treasures.findIndex(t => t.x === newX && t.y === newY);
    if (treasureIndex !== -1) {
      const treasure = gameState.treasures[treasureIndex];
      updatedGameState.treasures = gameState.treasures.filter((_, i) => i !== treasureIndex);
      
      if (treasure.type === 'gold') {
        updatedGameState.playerStats.gold += treasure.value;
        events.push(`Found ${treasure.value} gold!`);
      } else if (treasure.type === 'potion') {
        updatedGameState.inventory.potions += 1;
        events.push('Found healing potion!');
      }
    }

    // Check for doors
    const door = gameState.doors.find(d => d.x === newX && d.y === newY);
    if (door) {
      if (door.type === 'exit') {
        events.push('Found dungeon exit!');
        // Handle level progression
        if (gameState.dungeonLevel < 10) {
          const nextLevelData = this.generateDungeon(gameState.dungeonLevel + 1);
          updatedGameState.dungeonLevel += 1;
          updatedGameState.playerPosition = { x: 1, y: 1 };
          updatedGameState.dungeonMap = nextLevelData.map;
          updatedGameState.enemies = nextLevelData.enemies;
          updatedGameState.treasures = nextLevelData.treasures;
          updatedGameState.doors = nextLevelData.doors;
          events.push(`Advanced to level ${updatedGameState.dungeonLevel}!`);
        } else {
          updatedGameState.gameStatus = 'completed';
          events.push('Dungeon completed! Victory!');
        }
      } else if (door.type === 'locked' && !door.isOpen) {
        if (updatedGameState.inventory.keys > 0) {
          updatedGameState.inventory.keys -= 1;
          door.isOpen = true;
          events.push('Used key to unlock door');
        } else {
          events.push('Door is locked - need a key');
        }
      }
    }

    // Check for enemies (combat initiation handled separately)
    const enemy = gameState.enemies.find(e => e.x === newX && e.y === newY);
    if (enemy) {
      events.push(`Encountered ${enemy.type}!`);
    }

    return {
      success: true,
      newPosition: { x: newX, y: newY },
      events,
      updatedGameState
    };
  }

  /**
   * Generate dungeon layout for a given level
   */
  private generateDungeon(level: number): {
    map: DungeonCell[][];
    enemies: Enemy[];
    treasures: Treasure[];
    doors: Door[];
  } {
    const GRID_SIZE = 20;
    const map: DungeonCell[][] = Array(GRID_SIZE).fill(null).map(() => 
      Array(GRID_SIZE).fill(null).map(() => ({ 
        type: 'wall' as const, 
        explored: false 
      }))
    );

    // Generate rooms
    for (let i = 0; i < 8; i++) {
      const roomX = Math.floor(Math.random() * (GRID_SIZE - 8)) + 2;
      const roomY = Math.floor(Math.random() * (GRID_SIZE - 8)) + 2;
      const roomWidth = Math.floor(Math.random() * 4) + 4;
      const roomHeight = Math.floor(Math.random() * 4) + 4;

      for (let y = roomY; y < Math.min(roomY + roomHeight, GRID_SIZE); y++) {
        for (let x = roomX; x < Math.min(roomX + roomWidth, GRID_SIZE); x++) {
          map[y][x] = { type: 'floor', explored: false };
        }
      }
    }

    // Generate corridors
    for (let y = 1; y < GRID_SIZE; y += 3) {
      for (let x = 1; x < GRID_SIZE; x += 3) {
        map[y][x] = { type: 'floor', explored: false };
        if (x + 1 < GRID_SIZE) {
          map[y][x + 1] = { type: 'floor', explored: false };
        }
        if (y + 1 < GRID_SIZE) {
          map[y + 1][x] = { type: 'floor', explored: false };
        }
      }
    }

    // Generate enemies
    const enemies: Enemy[] = [];
    const enemyCount = 3 + level * 2;
    const enemyTypes = ['goblin', 'orc', 'skeleton', 'troll'];
    
    for (let i = 0; i < enemyCount; i++) {
      let x, y;
      do {
        x = Math.floor(Math.random() * GRID_SIZE);
        y = Math.floor(Math.random() * GRID_SIZE);
      } while (map[y][x].type !== 'floor' || (x < 3 && y < 3));

      const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      const baseStats = this.getEnemyBaseStats(enemyType);
      
      enemies.push({
        id: uuidv4(),
        x,
        y,
        type: enemyType,
        hp: baseStats.hp * level,
        maxHp: baseStats.hp * level,
        attack: baseStats.attack + level,
        defense: baseStats.defense,
        exp: baseStats.exp * level,
        gold: baseStats.gold * level,
        aiType: 'random'
      });
    }

    // Generate treasures
    const treasures: Treasure[] = [];
    const treasureCount = 5 + level;
    
    for (let i = 0; i < treasureCount; i++) {
      let x, y;
      do {
        x = Math.floor(Math.random() * GRID_SIZE);
        y = Math.floor(Math.random() * GRID_SIZE);
      } while (map[y][x].type !== 'floor');

      const treasureType = Math.random() > 0.6 ? 'potion' : 'gold';
      const value = treasureType === 'gold' ? 
        10 + level * 5 + Math.floor(Math.random() * 20) : 1;

      treasures.push({
        id: uuidv4(),
        x,
        y,
        type: treasureType,
        value
      });
    }

    // Generate exit door
    const doors: Door[] = [];
    let exitX, exitY;
    do {
      exitX = Math.floor(Math.random() * GRID_SIZE);
      exitY = Math.floor(Math.random() * GRID_SIZE);
    } while (map[exitY][exitX].type !== 'floor');

    doors.push({
      id: uuidv4(),
      x: exitX,
      y: exitY,
      type: 'exit',
      isOpen: true
    });

    return { map, enemies, treasures, doors };
  }

  private getEnemyBaseStats(enemyType: string) {
    const stats = {
      goblin: { hp: 20, attack: 8, defense: 2, exp: 25, gold: 10 },
      orc: { hp: 35, attack: 12, defense: 4, exp: 50, gold: 20 },
      skeleton: { hp: 25, attack: 10, defense: 3, exp: 40, gold: 15 },
      troll: { hp: 50, attack: 15, defense: 6, exp: 75, gold: 30 }
    };

    return stats[enemyType as keyof typeof stats] || stats.goblin;
  }
}

export const gameService = GameService.getInstance();