import { Coordinate, DungeonMap, PlayerAction } from '../types/GameTypes';
import { PlayerCharacter } from './PlayerCharacter';
import { GameError } from '../utils/ErrorHandling';

export interface MovementResult {
  success: boolean;
  newPosition?: Coordinate;
  blockedReason?: string;
}

// Grid-based movement validation and control
export class MovementController {
  private dungeon: DungeonMap;
  private player: PlayerCharacter;

  constructor(dungeon: DungeonMap, player: PlayerCharacter) {
    this.dungeon = dungeon;
    this.player = player;
  }

  // Update dungeon reference (for when dungeon changes)
  updateDungeon(dungeon: DungeonMap): void {
    this.dungeon = dungeon;
  }

  // Update player reference
  updatePlayer(player: PlayerCharacter): void {
    this.player = player;
  }

  // Validate and execute a movement action
  executeMovement(action: PlayerAction): MovementResult {
    if (action.type !== 'move' || !action.direction) {
      return {
        success: false,
        blockedReason: 'Invalid movement action'
      };
    }

    const newPosition = this.calculateNewPosition(this.player.position, action.direction);
    const validationResult = this.validateMovement(newPosition);

    if (validationResult.success) {
      this.player.moveTo(newPosition);
      return {
        success: true,
        newPosition: { ...newPosition }
      };
    }

    return validationResult;
  }

  // Calculate new position based on direction
  private calculateNewPosition(currentPosition: Coordinate, direction: string): Coordinate {
    const { x, y } = currentPosition;

    switch (direction) {
      case 'north':
        return { x, y: y - 1 };
      case 'south':
        return { x, y: y + 1 };
      case 'east':
        return { x: x + 1, y };
      case 'west':
        return { x: x - 1, y };
      default:
        throw new GameError(`Invalid movement direction: ${direction}`, 'INVALID_MOVEMENT');
    }
  }

  // Validate if movement to position is allowed
  validateMovement(position: Coordinate): MovementResult {
    // Check dungeon bounds
    if (!this.isWithinBounds(position)) {
      return {
        success: false,
        blockedReason: 'Movement blocked by dungeon boundary'
      };
    }

    // Check if position is walkable (in room or corridor)
    if (!this.isWalkable(position)) {
      return {
        success: false,
        blockedReason: 'Movement blocked by wall'
      };
    }

    // Check for collision with enemies (optional - could allow sharing space)
    // For now, we'll allow sharing space with enemies to trigger encounters

    return {
      success: true,
      newPosition: position
    };
  }

  // Check if position is within dungeon bounds
  private isWithinBounds(position: Coordinate): boolean {
    return position.x >= 0 && 
           position.x < this.dungeon.width &&
           position.y >= 0 && 
           position.y < this.dungeon.height;
  }

  // Check if position is walkable (in a room or corridor)
  private isWalkable(position: Coordinate): boolean {
    return this.isInRoom(position) || this.isInCorridor(position);
  }

  // Check if position is inside any room
  private isInRoom(position: Coordinate): boolean {
    return this.dungeon.rooms.some(room => 
      position.x >= room.position.x &&
      position.x < room.position.x + room.width &&
      position.y >= room.position.y &&
      position.y < room.position.y + room.height
    );
  }

  // Check if position is on any corridor path
  private isInCorridor(position: Coordinate): boolean {
    return this.dungeon.corridors.some(corridor =>
      corridor.path.some(pathPoint =>
        pathPoint.x === position.x && pathPoint.y === position.y
      )
    );
  }

  // Get all valid adjacent positions
  getValidAdjacentPositions(position: Coordinate): Coordinate[] {
    const directions = [
      { x: 0, y: -1 }, // north
      { x: 0, y: 1 },  // south
      { x: 1, y: 0 },  // east
      { x: -1, y: 0 }  // west
    ];

    return directions
      .map(dir => ({ x: position.x + dir.x, y: position.y + dir.y }))
      .filter(pos => this.validateMovement(pos).success);
  }

  // Check if two positions are adjacent
  areAdjacent(pos1: Coordinate, pos2: Coordinate): boolean {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }

  // Calculate Manhattan distance between two positions
  getDistance(pos1: Coordinate, pos2: Coordinate): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  // Find the room containing a position
  getRoomAt(position: Coordinate): string | null {
    const room = this.dungeon.rooms.find(room =>
      position.x >= room.position.x &&
      position.x < room.position.x + room.width &&
      position.y >= room.position.y &&
      position.y < room.position.y + room.height
    );
    
    return room ? room.id : null;
  }

  // Check if position has line of sight to another position
  hasLineOfSight(from: Coordinate, to: Coordinate): boolean {
    // Simple line of sight - check if all positions on the line are walkable
    const positions = this.getLinePositions(from, to);
    return positions.every(pos => this.isWalkable(pos));
  }

  // Get all positions on a line between two points (Bresenham's algorithm simplified)
  private getLinePositions(from: Coordinate, to: Coordinate): Coordinate[] {
    const positions: Coordinate[] = [];
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const sx = from.x < to.x ? 1 : -1;
    const sy = from.y < to.y ? 1 : -1;
    let err = dx - dy;
    
    let x = from.x;
    let y = from.y;
    
    while (true) {
      positions.push({ x, y });
      
      if (x === to.x && y === to.y) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    
    return positions;
  }

  // Get movement direction from current position to target
  getDirectionTo(from: Coordinate, to: Coordinate): string | null {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    // Only return direction for adjacent positions
    if (Math.abs(dx) + Math.abs(dy) !== 1) {
      return null;
    }

    if (dx === 1) return 'east';
    if (dx === -1) return 'west';
    if (dy === 1) return 'south';
    if (dy === -1) return 'north';

    return null;
  }

  // Check if player can move in a specific direction
  canMoveInDirection(direction: string): boolean {
    try {
      const newPosition = this.calculateNewPosition(this.player.position, direction);
      return this.validateMovement(newPosition).success;
    } catch {
      return false;
    }
  }

  // Get current player position
  getPlayerPosition(): Coordinate {
    return { ...this.player.position };
  }

  // Get current room ID for player
  getCurrentRoom(): string | null {
    return this.getRoomAt(this.player.position);
  }
}