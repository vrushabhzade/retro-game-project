import { GameState as IGameState, PlayerCharacter, DungeonMap, Item, RoomId, DifficultyLevel, Coordinate } from '../types/GameTypes';
import { GameError } from '../utils/ErrorHandling';
import { Enemy } from '../combat/Enemy';

// Game state management
export class GameState implements IGameState {
  public dungeon: DungeonMap;
  public player: PlayerCharacter;
  public enemies: Enemy[];
  public items: Item[];
  public currentRoom: RoomId;
  public gameTime: number;
  public difficulty: DifficultyLevel;
  public isInCombat: boolean;
  public turnNumber: number;

  constructor(initialState?: Partial<IGameState>) {
    this.dungeon = initialState?.dungeon || this.createEmptyDungeon();
    this.player = initialState?.player || this.createDefaultPlayer();
    this.enemies = initialState?.enemies ? 
      initialState.enemies.map(e => e instanceof Enemy ? e : new Enemy(e)) : [];
    this.items = initialState?.items || [];
    this.currentRoom = initialState?.currentRoom || '';
    this.gameTime = initialState?.gameTime || 0;
    this.difficulty = initialState?.difficulty || 'medium';
    this.isInCombat = initialState?.isInCombat || false;
    this.turnNumber = initialState?.turnNumber || 0;
  }

  private createEmptyDungeon(): DungeonMap {
    return {
      rooms: [],
      corridors: [],
      width: 20,
      height: 20
    };
  }

  private createDefaultPlayer(): PlayerCharacter {
    return {
      id: 'player_1',
      position: { x: 1, y: 1 },
      health: 100,
      maxHealth: 100,
      level: 1,
      experience: 0,
      inventory: [],
      equipment: {},
      stats: {
        strength: 10,
        defense: 5,
        agility: 8,
        intelligence: 7
      }
    };
  }

  // Update player position with collision detection
  updatePlayerPosition(newPosition: Coordinate): boolean {
    if (this.isValidPosition(newPosition)) {
      this.player.position = { ...newPosition };
      this.updateCurrentRoom();
      return true;
    }
    return false;
  }

  // Check if a position is valid (within bounds and not blocked)
  isValidPosition(position: Coordinate): boolean {
    // Check dungeon bounds
    if (position.x < 0 || position.x >= this.dungeon.width ||
        position.y < 0 || position.y >= this.dungeon.height) {
      return false;
    }

    // Check if position is in a room or corridor
    return this.isInRoom(position) || this.isInCorridor(position);
  }

  private isInRoom(position: Coordinate): boolean {
    return this.dungeon.rooms.some(room => 
      position.x >= room.position.x &&
      position.x < room.position.x + room.width &&
      position.y >= room.position.y &&
      position.y < room.position.y + room.height
    );
  }

  private isInCorridor(position: Coordinate): boolean {
    return this.dungeon.corridors.some(corridor =>
      corridor.path.some(pathPoint =>
        pathPoint.x === position.x && pathPoint.y === position.y
      )
    );
  }

  private updateCurrentRoom(): void {
    const room = this.dungeon.rooms.find(room =>
      this.player.position.x >= room.position.x &&
      this.player.position.x < room.position.x + room.width &&
      this.player.position.y >= room.position.y &&
      this.player.position.y < room.position.y + room.height
    );
    
    if (room) {
      this.currentRoom = room.id;
    } else {
      // Player is in a corridor or other area, clear current room
      this.currentRoom = '';
    }
  }

  // Advance game time
  advanceTime(deltaTime: number): void {
    this.gameTime += deltaTime;
  }

  // Advance turn counter
  advanceTurn(): void {
    this.turnNumber++;
  }

  // Serialization for save/load functionality
  serialize(): string {
    try {
      const stateData: IGameState = {
        dungeon: this.dungeon,
        player: this.player,
        enemies: this.enemies.map(e => e.serialize()),
        items: this.items,
        currentRoom: this.currentRoom,
        gameTime: this.gameTime,
        difficulty: this.difficulty,
        isInCombat: this.isInCombat,
        turnNumber: this.turnNumber
      };
      return JSON.stringify(stateData);
    } catch (error) {
      throw new GameError('Failed to serialize game state', 'SERIALIZATION_ERROR', { error });
    }
  }

  // Deserialization for save/load functionality
  static deserialize(serializedState: string): GameState {
    try {
      const stateData: IGameState = JSON.parse(serializedState);
      // Convert enemy data back to Enemy instances
      if (stateData.enemies) {
        stateData.enemies = stateData.enemies.map(e => new Enemy(e));
      }
      return new GameState(stateData);
    } catch (error) {
      throw new GameError('Failed to deserialize game state', 'DESERIALIZATION_ERROR', { error });
    }
  }

  // Validate game state integrity
  validate(): boolean {
    try {
      // Check required properties exist
      if (!this.dungeon || !this.player) {
        return false;
      }

      // Check player position is valid
      if (!this.isValidPosition(this.player.position)) {
        return false;
      }

      // Check dungeon has at least one room
      if (this.dungeon.rooms.length === 0) {
        return false;
      }

      // Check current room exists if set
      if (this.currentRoom && !this.dungeon.rooms.find(r => r.id === this.currentRoom)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Create a deep copy of the current state
  clone(): GameState {
    return GameState.deserialize(this.serialize());
  }
}