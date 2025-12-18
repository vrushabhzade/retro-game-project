import { Enemy as IEnemy, Coordinate, PlayerCharacter, EnemyAction } from '../types/GameTypes';
import { GameError } from '../utils/ErrorHandling';

// Enemy representation and AI behavior
export class Enemy implements IEnemy {
  public id: string;
  public name: string;
  public position: Coordinate;
  public health: number;
  public maxHealth: number;
  public attackPower: number;
  public defense: number;
  public aiType: 'aggressive' | 'defensive' | 'patrol' | 'guard';
  
  private _lastAction: EnemyAction | null = null;
  private patrolPath: Coordinate[] = [];
  private patrolIndex: number = 0;
  private guardPosition: Coordinate;
  private detectionRange: number = 3;
  private attackRange: number = 1;

  constructor(config: Partial<IEnemy> & { name: string }) {
    this.id = config.id || `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = config.name;
    this.position = config.position || { x: 0, y: 0 };
    this.health = config.health || 50;
    this.maxHealth = config.maxHealth || this.health;
    this.attackPower = config.attackPower || 10;
    this.defense = config.defense || 2;
    this.aiType = config.aiType || 'aggressive';
    
    this.guardPosition = { ...this.position };
    this.validateEnemy();
  }

  private validateEnemy(): void {
    if (this.health < 0 || this.health > this.maxHealth) {
      throw new GameError('Invalid enemy health values', 'INVALID_ENEMY_DATA');
    }
    if (this.attackPower < 0 || this.defense < 0) {
      throw new GameError('Invalid enemy combat stats', 'INVALID_ENEMY_DATA');
    }
  }

  // Take damage and return true if still alive
  takeDamage(damage: number): boolean {
    const actualDamage = Math.max(1, damage - this.defense); // Minimum 1 damage
    this.health = Math.max(0, this.health - actualDamage);
    return this.health > 0;
  }

  // Check if enemy is alive
  isAlive(): boolean {
    return this.health > 0;
  }

  // Calculate distance to a target position
  private getDistanceTo(target: Coordinate): number {
    return Math.abs(this.position.x - target.x) + Math.abs(this.position.y - target.y);
  }

  // Check if player is within detection range
  canDetectPlayer(player: PlayerCharacter): boolean {
    return this.getDistanceTo(player.position) <= this.detectionRange;
  }

  // Check if player is within attack range
  canAttackPlayer(player: PlayerCharacter): boolean {
    return this.getDistanceTo(player.position) <= this.attackRange;
  }

  // Get next position towards target
  private getNextPositionTowards(target: Coordinate): Coordinate {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    
    let nextX = this.position.x;
    let nextY = this.position.y;
    
    // Move one step towards target (Manhattan distance)
    if (Math.abs(dx) > Math.abs(dy)) {
      nextX += dx > 0 ? 1 : -1;
    } else if (dy !== 0) {
      nextY += dy > 0 ? 1 : -1;
    }
    
    return { x: nextX, y: nextY };
  }

  // Set patrol path for patrol AI type
  setPatrolPath(path: Coordinate[]): void {
    if (path.length < 2) {
      throw new GameError('Patrol path must have at least 2 points', 'INVALID_PATROL_PATH');
    }
    this.patrolPath = [...path];
    this.patrolIndex = 0;
  }

  // AI decision making - returns the action the enemy wants to take
  decideAction(player: PlayerCharacter, isValidPosition: (pos: Coordinate) => boolean): EnemyAction {
    const timestamp = Date.now();
    
    if (!this.isAlive()) {
      return { type: 'defend', timestamp };
    }

    // Check if player is detected
    const playerDetected = this.canDetectPlayer(player);
    
    switch (this.aiType) {
      case 'aggressive':
        return this.aggressiveAI(player, playerDetected, isValidPosition, timestamp);
      
      case 'defensive':
        return this.defensiveAI(player, playerDetected, isValidPosition, timestamp);
      
      case 'patrol':
        return this.patrolAI(player, playerDetected, isValidPosition, timestamp);
      
      case 'guard':
        return this.guardAI(player, playerDetected, isValidPosition, timestamp);
      
      default:
        return { type: 'defend', timestamp };
    }
  }

  private aggressiveAI(player: PlayerCharacter, playerDetected: boolean, isValidPosition: (pos: Coordinate) => boolean, timestamp: number): EnemyAction {
    if (!playerDetected) {
      return { type: 'defend', timestamp };
    }

    // Attack if in range
    if (this.canAttackPlayer(player)) {
      return {
        type: 'attack',
        target: player.id,
        damage: this.attackPower,
        timestamp
      };
    }

    // Move towards player
    const nextPosition = this.getNextPositionTowards(player.position);
    if (isValidPosition(nextPosition)) {
      return {
        type: 'move',
        target: nextPosition,
        timestamp
      };
    }

    return { type: 'defend', timestamp };
  }

  private defensiveAI(player: PlayerCharacter, playerDetected: boolean, isValidPosition: (pos: Coordinate) => boolean, timestamp: number): EnemyAction {
    if (!playerDetected) {
      return { type: 'defend', timestamp };
    }

    // Attack if player is very close
    if (this.canAttackPlayer(player)) {
      return {
        type: 'attack',
        target: player.id,
        damage: this.attackPower,
        timestamp
      };
    }

    // Move away from player if too close
    const distanceToPlayer = this.getDistanceTo(player.position);
    if (distanceToPlayer <= 2) {
      const dx = this.position.x - player.position.x;
      const dy = this.position.y - player.position.y;
      
      const nextPosition = {
        x: this.position.x + (dx > 0 ? 1 : dx < 0 ? -1 : 0),
        y: this.position.y + (dy > 0 ? 1 : dy < 0 ? -1 : 0)
      };
      
      if (isValidPosition(nextPosition)) {
        return {
          type: 'move',
          target: nextPosition,
          timestamp
        };
      }
    }

    return { type: 'defend', timestamp };
  }

  private patrolAI(player: PlayerCharacter, playerDetected: boolean, isValidPosition: (pos: Coordinate) => boolean, timestamp: number): EnemyAction {
    // If player detected, switch to aggressive behavior
    if (playerDetected) {
      return this.aggressiveAI(player, playerDetected, isValidPosition, timestamp);
    }

    // Continue patrol if path is set
    if (this.patrolPath.length > 0) {
      const targetPosition = this.patrolPath[this.patrolIndex];
      
      // If reached current patrol point, move to next
      if (targetPosition && this.position.x === targetPosition.x && this.position.y === targetPosition.y) {
        this.patrolIndex = (this.patrolIndex + 1) % this.patrolPath.length;
        return { type: 'defend', timestamp };
      }
      
      // Move towards current patrol point
      if (targetPosition) {
        const nextPosition = this.getNextPositionTowards(targetPosition);
        if (isValidPosition(nextPosition)) {
          return {
            type: 'move',
            target: nextPosition,
            timestamp
          };
        }
      }
    }

    return { type: 'defend', timestamp };
  }

  private guardAI(player: PlayerCharacter, playerDetected: boolean, isValidPosition: (pos: Coordinate) => boolean, timestamp: number): EnemyAction {
    // If player detected and close, attack
    if (playerDetected && this.canAttackPlayer(player)) {
      return {
        type: 'attack',
        target: player.id,
        damage: this.attackPower,
        timestamp
      };
    }

    // Return to guard position if moved away
    const distanceFromGuardPost = this.getDistanceTo(this.guardPosition);
    if (distanceFromGuardPost > 0) {
      const nextPosition = this.getNextPositionTowards(this.guardPosition);
      if (isValidPosition(nextPosition)) {
        return {
          type: 'move',
          target: nextPosition,
          timestamp
        };
      }
    }

    return { type: 'defend', timestamp };
  }

  // Execute an action (update enemy state based on action)
  executeAction(action: EnemyAction): void {
    this._lastAction = action;
    
    if (action.type === 'move' && action.target && typeof action.target === 'object') {
      this.position = { ...action.target as Coordinate };
    }
  }

  // Get enemy status for display
  getStatus(): string {
    return `${this.name} (${this.health}/${this.maxHealth} HP) - ${this.aiType}`;
  }

  // Get last action performed by enemy
  getLastAction(): EnemyAction | null {
    return this._lastAction;
  }

  // Serialize enemy data
  serialize(): IEnemy {
    return {
      id: this.id,
      name: this.name,
      position: { ...this.position },
      health: this.health,
      maxHealth: this.maxHealth,
      attackPower: this.attackPower,
      defense: this.defense,
      aiType: this.aiType
    };
  }

  // Create enemy from serialized data
  static deserialize(data: IEnemy): Enemy {
    return new Enemy(data);
  }

  // Factory method for creating common enemy types
  static createGoblin(position: Coordinate): Enemy {
    return new Enemy({
      name: 'Goblin',
      position,
      health: 30,
      maxHealth: 30,
      attackPower: 8,
      defense: 1,
      aiType: 'aggressive'
    });
  }

  static createOrc(position: Coordinate): Enemy {
    return new Enemy({
      name: 'Orc',
      position,
      health: 60,
      maxHealth: 60,
      attackPower: 15,
      defense: 3,
      aiType: 'aggressive'
    });
  }

  static createGuard(position: Coordinate): Enemy {
    return new Enemy({
      name: 'Guard',
      position,
      health: 80,
      maxHealth: 80,
      attackPower: 12,
      defense: 5,
      aiType: 'guard'
    });
  }

  static createPatrolling(name: string, position: Coordinate, patrolPath: Coordinate[]): Enemy {
    const enemy = new Enemy({
      name,
      position,
      health: 40,
      maxHealth: 40,
      attackPower: 10,
      defense: 2,
      aiType: 'patrol'
    });
    enemy.setPatrolPath(patrolPath);
    return enemy;
  }
}