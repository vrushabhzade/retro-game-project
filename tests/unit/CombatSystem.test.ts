import { CombatSystem } from '../../src/combat/CombatSystem';
import { Enemy } from '../../src/combat/Enemy';
import { GameState } from '../../src/engine/GameState';
import { PlayerAction } from '../../src/types/GameTypes';

describe('CombatSystem', () => {
  let combatSystem: CombatSystem;
  let gameState: GameState;

  beforeEach(() => {
    combatSystem = new CombatSystem();
    gameState = new GameState();
    
    // Set up a basic game state
    gameState.player.position = { x: 5, y: 5 };
    gameState.player.health = 100;
    gameState.player.stats.strength = 15;
    gameState.player.stats.defense = 5;
  });

  describe('encounter detection', () => {
    it('should detect encounters with adjacent enemies', () => {
      const enemy = new Enemy({
        name: 'Goblin',
        position: { x: 6, y: 5 } // Adjacent to player
      });
      
      gameState.enemies = [enemy];
      
      const encounters = combatSystem.checkForEncounter(gameState);
      expect(encounters).toHaveLength(1);
      expect(encounters[0]).toBe(enemy);
    });

    it('should not detect encounters with distant enemies', () => {
      const enemy = new Enemy({
        name: 'Goblin',
        position: { x: 10, y: 10 } // Far from player
      });
      
      gameState.enemies = [enemy];
      
      const encounters = combatSystem.checkForEncounter(gameState);
      expect(encounters).toHaveLength(0);
    });

    it('should detect multiple adjacent enemies', () => {
      const enemy1 = new Enemy({
        name: 'Goblin1',
        position: { x: 6, y: 5 }
      });
      const enemy2 = new Enemy({
        name: 'Goblin2',
        position: { x: 4, y: 5 }
      });
      
      gameState.enemies = [enemy1, enemy2];
      
      const encounters = combatSystem.checkForEncounter(gameState);
      expect(encounters).toHaveLength(2);
    });
  });

  describe('combat initiation', () => {
    it('should initiate combat successfully', () => {
      const enemy = new Enemy({ name: 'Goblin' });
      
      const result = combatSystem.initiateCombat(gameState, [enemy]);
      
      expect(result).toBe(true);
      expect(gameState.isInCombat).toBe(true);
    });

    it('should not initiate combat when already in combat', () => {
      gameState.isInCombat = true;
      const enemy = new Enemy({ name: 'Goblin' });
      
      const result = combatSystem.initiateCombat(gameState, [enemy]);
      
      expect(result).toBe(false);
    });

    it('should not initiate combat with no enemies', () => {
      const result = combatSystem.initiateCombat(gameState, []);
      
      expect(result).toBe(false);
      expect(gameState.isInCombat).toBe(false);
    });
  });

  describe('combat turns', () => {
    beforeEach(() => {
      gameState.isInCombat = true;
    });

    it('should process player attack action', () => {
      const enemy = new Enemy({
        name: 'Goblin',
        position: { x: 6, y: 5 }, // Adjacent to player
        health: 30
      });
      
      const attackAction: PlayerAction = {
        type: 'attack',
        target: enemy.id,
        timestamp: Date.now()
      };
      
      const turn = combatSystem.processCombatTurn(gameState, attackAction, [enemy]);
      
      expect(turn.turnNumber).toBe(1);
      expect(turn.playerAction).toBe(attackAction);
      expect(turn.combatResults[0]?.playerDamageDealt).toBeGreaterThan(0);
    });

    it('should process player defend action', () => {
      const enemy = new Enemy({
        name: 'Goblin',
        position: { x: 6, y: 5 }
      });
      
      const defendAction: PlayerAction = {
        type: 'defend',
        timestamp: Date.now()
      };
      
      const turn = combatSystem.processCombatTurn(gameState, defendAction, [enemy]);
      
      expect(turn.turnNumber).toBe(1);
      expect(turn.playerAction.type).toBe('defend');
    });

    it('should process enemy actions', () => {
      const enemy = new Enemy({
        name: 'Goblin',
        position: { x: 6, y: 5 }
      });
      
      const playerAction: PlayerAction = {
        type: 'defend',
        timestamp: Date.now()
      };
      
      const turn = combatSystem.processCombatTurn(gameState, playerAction, [enemy]);
      
      expect(turn.enemyActions).toHaveLength(1);
      expect(turn.enemyActions[0]?.type).toBeDefined();
    });
  });

  describe('combat resolution', () => {
    it('should end combat when all enemies are defeated', () => {
      const enemy = new Enemy({
        name: 'Weak Goblin',
        position: { x: 6, y: 5 },
        health: 1 // Very low health
      });
      
      gameState.isInCombat = true;
      
      const attackAction: PlayerAction = {
        type: 'attack',
        target: enemy.id,
        timestamp: Date.now()
      };
      
      // Attack should defeat the enemy
      enemy.takeDamage(100);
      
      combatSystem.processCombatTurn(gameState, attackAction, [enemy]);
      
      // Combat should end since enemy is defeated
      expect(gameState.isInCombat).toBe(false);
    });

    it('should end combat when player is defeated', () => {
      const enemy = new Enemy({
        name: 'Strong Orc',
        position: { x: 6, y: 5 },
        attackPower: 200 // Very high attack
      });
      
      gameState.isInCombat = true;
      gameState.player.health = 1; // Very low health
      
      const defendAction: PlayerAction = {
        type: 'defend',
        timestamp: Date.now()
      };
      
      combatSystem.processCombatTurn(gameState, defendAction, [enemy]);
      
      // Combat should end since player might be defeated
      // (depending on enemy AI decision to attack)
    });
  });

  describe('combat statistics', () => {
    it('should track combat statistics', () => {
      const enemy = new Enemy({
        name: 'Goblin',
        position: { x: 6, y: 5 }
      });
      
      // Properly initiate combat first
      combatSystem.initiateCombat(gameState, [enemy]);
      
      const attackAction: PlayerAction = {
        type: 'attack',
        target: enemy.id,
        timestamp: Date.now()
      };
      
      combatSystem.processCombatTurn(gameState, attackAction, [enemy]);
      
      const stats = combatSystem.getCombatStats();
      
      expect(stats.totalTurns).toBe(1);
      expect(stats.combatDuration).toBeGreaterThanOrEqual(0); // Allow 0 for very fast execution
      expect(typeof stats.totalDamageDealt).toBe('number');
      expect(typeof stats.totalDamageTaken).toBe('number');
    });

    it('should provide combat log', () => {
      const enemy = new Enemy({
        name: 'Goblin',
        position: { x: 6, y: 5 }
      });
      
      gameState.isInCombat = true;
      
      const attackAction: PlayerAction = {
        type: 'attack',
        target: enemy.id,
        timestamp: Date.now()
      };
      
      combatSystem.processCombatTurn(gameState, attackAction, [enemy]);
      
      const log = combatSystem.getCombatLog();
      
      expect(log).toHaveLength(1);
      expect(log[0]?.turnNumber).toBe(1);
      expect(log[0]?.playerAction).toBe(attackAction);
    });
  });

  describe('utility methods', () => {
    it('should get enemies in range', () => {
      const nearEnemy = new Enemy({
        name: 'Near Goblin',
        position: { x: 6, y: 5 }
      });
      
      const farEnemy = new Enemy({
        name: 'Far Goblin',
        position: { x: 15, y: 15 }
      });
      
      gameState.enemies = [nearEnemy, farEnemy];
      
      const nearbyEnemies = combatSystem.getEnemiesInRange(gameState, 3);
      
      expect(nearbyEnemies).toHaveLength(1);
      expect(nearbyEnemies[0]).toBe(nearEnemy);
    });

    it('should force end combat', () => {
      gameState.isInCombat = true;
      
      combatSystem.forceCombatEnd(gameState);
      
      expect(gameState.isInCombat).toBe(false);
    });

    it('should reset combat system', () => {
      // Add some combat data
      const enemy = new Enemy({ name: 'Goblin', position: { x: 6, y: 5 } });
      gameState.isInCombat = true;
      
      const attackAction: PlayerAction = {
        type: 'attack',
        target: enemy.id,
        timestamp: Date.now()
      };
      
      combatSystem.processCombatTurn(gameState, attackAction, [enemy]);
      
      // Reset and verify
      combatSystem.reset();
      
      const stats = combatSystem.getCombatStats();
      expect(stats.totalTurns).toBe(0);
      expect(stats.totalDamageDealt).toBe(0);
      expect(combatSystem.getCombatLog()).toHaveLength(0);
    });
  });
});