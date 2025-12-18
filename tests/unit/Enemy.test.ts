import { Enemy } from '../../src/combat/Enemy';
import { PlayerCharacter } from '../../src/types/GameTypes';

describe('Enemy', () => {
  const mockPlayer: PlayerCharacter = {
    id: 'player_1',
    position: { x: 5, y: 5 },
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

  const mockIsValidPosition = (pos: { x: number; y: number }) => 
    pos.x >= 0 && pos.x < 20 && pos.y >= 0 && pos.y < 20;

  describe('initialization', () => {
    it('should create an enemy with default values', () => {
      const enemy = new Enemy({ name: 'Goblin' });
      
      expect(enemy.name).toBe('Goblin');
      expect(enemy.health).toBe(50);
      expect(enemy.maxHealth).toBe(50);
      expect(enemy.attackPower).toBe(10);
      expect(enemy.defense).toBe(2);
      expect(enemy.aiType).toBe('aggressive');
      expect(enemy.isAlive()).toBe(true);
    });

    it('should create an enemy with custom values', () => {
      const enemy = new Enemy({
        name: 'Orc',
        health: 80,
        maxHealth: 80,
        attackPower: 15,
        defense: 5,
        aiType: 'guard'
      });
      
      expect(enemy.name).toBe('Orc');
      expect(enemy.health).toBe(80);
      expect(enemy.attackPower).toBe(15);
      expect(enemy.aiType).toBe('guard');
    });
  });

  describe('combat', () => {
    it('should take damage correctly', () => {
      const enemy = new Enemy({ name: 'Goblin', health: 30, defense: 2 });
      
      const alive = enemy.takeDamage(10);
      expect(alive).toBe(true);
      expect(enemy.health).toBe(22); // 30 - (10 - 2) = 22
    });

    it('should die when health reaches 0', () => {
      const enemy = new Enemy({ name: 'Goblin', health: 5 });
      
      const alive = enemy.takeDamage(20);
      expect(alive).toBe(false);
      expect(enemy.health).toBe(0);
      expect(enemy.isAlive()).toBe(false);
    });

    it('should always take at least 1 damage', () => {
      const enemy = new Enemy({ name: 'Armored', health: 30, defense: 20 });
      
      enemy.takeDamage(5); // 5 - 20 = -15, but minimum 1 damage
      expect(enemy.health).toBe(29);
    });
  });

  describe('detection and range', () => {
    it('should detect player within range', () => {
      const enemy = new Enemy({ 
        name: 'Guard', 
        position: { x: 3, y: 3 } 
      });
      
      const nearPlayer = { ...mockPlayer, position: { x: 4, y: 4 } };
      const farPlayer = { ...mockPlayer, position: { x: 10, y: 10 } };
      
      expect(enemy.canDetectPlayer(nearPlayer)).toBe(true);
      expect(enemy.canDetectPlayer(farPlayer)).toBe(false);
    });

    it('should determine attack range correctly', () => {
      const enemy = new Enemy({ 
        name: 'Warrior', 
        position: { x: 5, y: 5 } 
      });
      
      const adjacentPlayer = { ...mockPlayer, position: { x: 6, y: 5 } };
      const distantPlayer = { ...mockPlayer, position: { x: 8, y: 5 } };
      
      expect(enemy.canAttackPlayer(adjacentPlayer)).toBe(true);
      expect(enemy.canAttackPlayer(distantPlayer)).toBe(false);
    });
  });

  describe('AI behavior', () => {
    it('should attack when player is in range (aggressive)', () => {
      const enemy = new Enemy({ 
        name: 'Goblin', 
        position: { x: 5, y: 5 },
        aiType: 'aggressive'
      });
      
      const nearPlayer = { ...mockPlayer, position: { x: 6, y: 5 } };
      const action = enemy.decideAction(nearPlayer, mockIsValidPosition);
      
      expect(action.type).toBe('attack');
      expect(action.target).toBe(nearPlayer.id);
    });

    it('should move towards player when detected but not in range', () => {
      const enemy = new Enemy({ 
        name: 'Goblin', 
        position: { x: 5, y: 5 },
        aiType: 'aggressive'
      });
      
      const nearPlayer = { ...mockPlayer, position: { x: 7, y: 5 } };
      const action = enemy.decideAction(nearPlayer, mockIsValidPosition);
      
      expect(action.type).toBe('move');
      expect(action.target).toEqual({ x: 6, y: 5 });
    });

    it('should defend when player is not detected', () => {
      const enemy = new Enemy({ 
        name: 'Goblin', 
        position: { x: 5, y: 5 },
        aiType: 'aggressive'
      });
      
      const farPlayer = { ...mockPlayer, position: { x: 15, y: 15 } };
      const action = enemy.decideAction(farPlayer, mockIsValidPosition);
      
      expect(action.type).toBe('defend');
    });
  });

  describe('patrol behavior', () => {
    it('should set and follow patrol path', () => {
      const enemy = new Enemy({ 
        name: 'Patrol', 
        position: { x: 2, y: 2 }, // Different from patrol start
        aiType: 'patrol'
      });
      
      const patrolPath = [
        { x: 1, y: 1 },
        { x: 3, y: 1 },
        { x: 3, y: 3 },
        { x: 1, y: 3 }
      ];
      
      enemy.setPatrolPath(patrolPath);
      
      const farPlayer = { ...mockPlayer, position: { x: 15, y: 15 } };
      const action = enemy.decideAction(farPlayer, mockIsValidPosition);
      
      expect(action.type).toBe('move');
      // Should move one step towards first patrol point (1,1) from (2,2)
      // The AI moves one step at a time, could be (1,2) or (2,1)
      const target = action.target as { x: number; y: number };
      expect(target).toEqual(expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number)
      }));
      // Should be one step closer to (1,1)
      expect(target.x === 1 || target.x === 2).toBe(true);
      expect(target.y === 1 || target.y === 2).toBe(true);
      expect(target.x !== 2 || target.y !== 2).toBe(true); // Should move from starting position
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const original = new Enemy({
        name: 'Test Enemy',
        position: { x: 10, y: 15 },
        health: 75,
        maxHealth: 100,
        attackPower: 12,
        defense: 3,
        aiType: 'defensive'
      });
      
      const serialized = original.serialize();
      const deserialized = Enemy.deserialize(serialized);
      
      expect(deserialized.name).toBe(original.name);
      expect(deserialized.position).toEqual(original.position);
      expect(deserialized.health).toBe(original.health);
      expect(deserialized.aiType).toBe(original.aiType);
    });
  });

  describe('factory methods', () => {
    it('should create goblin with correct stats', () => {
      const goblin = Enemy.createGoblin({ x: 5, y: 5 });
      
      expect(goblin.name).toBe('Goblin');
      expect(goblin.health).toBe(30);
      expect(goblin.aiType).toBe('aggressive');
    });

    it('should create orc with correct stats', () => {
      const orc = Enemy.createOrc({ x: 5, y: 5 });
      
      expect(orc.name).toBe('Orc');
      expect(orc.health).toBe(60);
      expect(orc.attackPower).toBe(15);
    });

    it('should create guard with correct stats', () => {
      const guard = Enemy.createGuard({ x: 5, y: 5 });
      
      expect(guard.name).toBe('Guard');
      expect(guard.aiType).toBe('guard');
      expect(guard.defense).toBe(5);
    });
  });
});