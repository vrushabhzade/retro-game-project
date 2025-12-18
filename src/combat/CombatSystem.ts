import { Enemy } from './Enemy';
import { GameState } from '../engine/GameState';
import { PlayerAction, EnemyAction, Coordinate, PlayerCharacter } from '../types/GameTypes';
import { GameError } from '../utils/ErrorHandling';

export interface CombatResult {
  playerDamageDealt: number;
  playerDamageTaken: number;
  enemyDefeated: boolean;
  playerDefeated: boolean;
  experienceGained: number;
  combatEnded: boolean;
}

export interface CombatTurn {
  turnNumber: number;
  playerAction: PlayerAction;
  enemyActions: EnemyAction[];
  combatResults: CombatResult[];
  gameStateAfter: any; // Simplified for now
}

// Combat system with real-time mechanics
export class CombatSystem {
  private combatLog: CombatTurn[] = [];
  private currentTurn: number = 0;
  private combatStartTime: number = 0;

  constructor() {
    this.reset();
  }

  // Reset combat system state
  reset(): void {
    this.combatLog = [];
    this.currentTurn = 0;
    this.combatStartTime = 0;
  }

  // Check if player position triggers an encounter
  checkForEncounter(gameState: GameState): Enemy[] {
    const encounterEnemies: Enemy[] = [];
    const playerPos = gameState.player.position;
    
    // Check for enemies in the same room or adjacent positions
    for (const enemy of gameState.enemies) {
      if (this.isInEncounterRange(playerPos, enemy.position)) {
        encounterEnemies.push(enemy);
      }
    }
    
    return encounterEnemies;
  }

  // Check if two positions are within encounter range
  private isInEncounterRange(pos1: Coordinate, pos2: Coordinate): boolean {
    const distance = Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    return distance <= 1; // Adjacent or same position triggers encounter
  }

  // Initiate combat encounter
  initiateCombat(gameState: GameState, enemies: Enemy[]): boolean {
    if (gameState.isInCombat) {
      return false; // Already in combat
    }

    if (enemies.length === 0) {
      return false; // No enemies to fight
    }

    gameState.isInCombat = true;
    this.combatStartTime = Date.now();
    this.currentTurn = 0;
    this.combatLog = [];

    return true;
  }

  // Process a combat turn with player action
  processCombatTurn(
    gameState: GameState, 
    playerAction: PlayerAction, 
    enemies: Enemy[]
  ): CombatTurn {
    if (!gameState.isInCombat) {
      throw new GameError('Cannot process combat turn when not in combat', 'INVALID_COMBAT_STATE');
    }

    this.currentTurn++;

    // Process player action first
    const playerResults = this.processPlayerAction(gameState, playerAction, enemies);

    // Process enemy actions
    const enemyActions: EnemyAction[] = [];
    const enemyResults: CombatResult[] = [];

    for (const enemy of enemies) {
      if (enemy.isAlive()) {
        const enemyAction = enemy.decideAction(gameState.player, (pos) => gameState.isValidPosition(pos));
        enemyActions.push(enemyAction);
        
        const result = this.processEnemyAction(gameState, enemyAction, enemy);
        enemyResults.push(result);
        
        enemy.executeAction(enemyAction);
      }
    }

    // Combine all combat results
    const allResults = [playerResults, ...enemyResults];

    // Create turn record
    const combatTurn: CombatTurn = {
      turnNumber: this.currentTurn,
      playerAction,
      enemyActions,
      combatResults: allResults,
      gameStateAfter: this.captureGameStateSnapshot(gameState)
    };

    this.combatLog.push(combatTurn);

    // Check if combat should end
    const combatEnded = this.checkCombatEnd(gameState, enemies);
    if (combatEnded) {
      this.endCombat(gameState);
    }

    gameState.advanceTurn();
    return combatTurn;
  }

  // Process player's combat action
  private processPlayerAction(
    gameState: GameState, 
    action: PlayerAction, 
    enemies: Enemy[]
  ): CombatResult {
    const result: CombatResult = {
      playerDamageDealt: 0,
      playerDamageTaken: 0,
      enemyDefeated: false,
      playerDefeated: false,
      experienceGained: 0,
      combatEnded: false
    };

    switch (action.type) {
      case 'attack':
        result.playerDamageDealt = this.processPlayerAttack(gameState, action, enemies);
        break;
      
      case 'defend':
        // Defending reduces incoming damage by 50% this turn
        // This will be applied when processing enemy attacks
        break;
      
      case 'use_item':
        this.processPlayerItemUse(gameState, action);
        break;
      
      case 'move':
        // Movement during combat (tactical positioning)
        if (action.target && typeof action.target === 'object') {
          const newPos = action.target as Coordinate;
          if (gameState.isValidPosition(newPos)) {
            gameState.player.position = { ...newPos };
          }
        }
        break;
    }

    return result;
  }

  // Process player attack action
  private processPlayerAttack(
    gameState: GameState, 
    action: PlayerAction, 
    enemies: Enemy[]
  ): number {
    if (!action.target) {
      return 0;
    }

    // Find target enemy
    const targetEnemy = enemies.find(e => e.id === action.target);
    if (!targetEnemy || !targetEnemy.isAlive()) {
      return 0;
    }

    // Check if enemy is in attack range
    const distance = Math.abs(gameState.player.position.x - targetEnemy.position.x) + 
                    Math.abs(gameState.player.position.y - targetEnemy.position.y);
    
    if (distance > 1) {
      return 0; // Out of range
    }

    // Calculate damage
    const baseDamage = gameState.player.stats.strength;
    const weaponDamage = gameState.player.equipment.weapon?.properties['attack'] || 0;
    const totalDamage = baseDamage + weaponDamage;

    // Apply damage to enemy
    const enemyAlive = targetEnemy.takeDamage(totalDamage);
    
    // Award experience if enemy defeated
    if (!enemyAlive) {
      const expGained = this.calculateExperienceReward(targetEnemy);
      // Experience will be handled by the game engine
      console.log(`Player gained ${expGained} experience`);
    }

    return totalDamage;
  }

  // Process player item usage
  private processPlayerItemUse(gameState: GameState, action: PlayerAction): void {
    if (!action.item) {
      return;
    }

    const item = action.item;
    
    // Handle consumable items
    if (item.type === 'consumable') {
      switch (item.properties['effect']) {
        case 'heal':
          const healAmount = item.properties['amount'] || 20;
          gameState.player.health = Math.min(gameState.player.maxHealth, gameState.player.health + healAmount);
          break;
        
        case 'strength_boost':
          // Temporary stat boost (would need turn tracking for duration)
          break;
      }
      
      // Remove consumable item from inventory
      const itemIndex = gameState.player.inventory.findIndex(i => i.id === item.id);
      if (itemIndex >= 0) {
        gameState.player.inventory.splice(itemIndex, 1);
      }
    }
  }

  // Process enemy action
  private processEnemyAction(
    gameState: GameState, 
    action: EnemyAction, 
    enemy: Enemy
  ): CombatResult {
    const result: CombatResult = {
      playerDamageDealt: 0,
      playerDamageTaken: 0,
      enemyDefeated: false,
      playerDefeated: false,
      experienceGained: 0,
      combatEnded: false
    };

    switch (action.type) {
      case 'attack':
        if (action.target === gameState.player.id && action.damage) {
          const damage = this.calculateEnemyDamage(enemy, gameState);
          // Apply damage to player
          const actualDamage = Math.max(1, damage - this.getPlayerDefense(gameState.player));
          gameState.player.health = Math.max(0, gameState.player.health - actualDamage);
          result.playerDamageTaken = actualDamage;
          result.playerDefeated = gameState.player.health <= 0;
        }
        break;
      
      case 'move':
        // Enemy movement is handled in enemy.executeAction()
        break;
      
      case 'special_ability':
        // Handle special enemy abilities
        this.processEnemySpecialAbility(gameState, action, enemy);
        break;
    }

    return result;
  }

  // Calculate damage dealt by enemy to player
  private calculateEnemyDamage(enemy: Enemy, _gameState: GameState): number {
    return enemy.attackPower;
  }

  // Get player's effective defense
  private getPlayerDefense(player: PlayerCharacter): number {
    let defense = player.stats.defense;
    
    if (player.equipment.armor) {
      defense += player.equipment.armor.properties['defense'] || 0;
    }
    
    return defense;
  }

  // Process enemy special abilities
  private processEnemySpecialAbility(
    _gameState: GameState, 
    _action: EnemyAction, 
    _enemy: Enemy
  ): void {
    // Placeholder for special abilities like poison, stun, etc.
    // Implementation would depend on specific enemy types and abilities
  }

  // Calculate experience reward for defeating an enemy
  private calculateExperienceReward(enemy: Enemy): number {
    const baseExp = 10;
    const healthMultiplier = enemy.maxHealth / 10;
    const attackMultiplier = enemy.attackPower / 5;
    
    return Math.floor(baseExp + healthMultiplier + attackMultiplier);
  }

  // Check if combat should end
  private checkCombatEnd(gameState: GameState, enemies: Enemy[]): boolean {
    // Combat ends if player is defeated
    if (gameState.player.health <= 0) {
      return true;
    }
    
    // Combat ends if all enemies are defeated
    const aliveEnemies = enemies.filter(e => e.isAlive());
    if (aliveEnemies.length === 0) {
      return true;
    }
    
    // Combat ends if player moves far enough away from all enemies
    const playerPos = gameState.player.position;
    const nearbyEnemies = aliveEnemies.filter(e => 
      this.isInEncounterRange(playerPos, e.position)
    );
    
    return nearbyEnemies.length === 0;
  }

  // End combat and clean up
  private endCombat(gameState: GameState): void {
    gameState.isInCombat = false;
    
    // Remove defeated enemies from game state
    gameState.enemies = gameState.enemies.filter(e => e.isAlive());
  }

  // Capture simplified game state snapshot for combat log
  private captureGameStateSnapshot(gameState: GameState): any {
    return {
      playerHealth: gameState.player.health,
      playerPosition: { ...gameState.player.position },
      turnNumber: gameState.turnNumber,
      timestamp: Date.now()
    };
  }

  // Get combat statistics
  getCombatStats(): {
    totalTurns: number;
    combatDuration: number;
    totalDamageDealt: number;
    totalDamageTaken: number;
  } {
    const totalDamageDealt = this.combatLog.reduce((total, turn) => 
      total + turn.combatResults.reduce((turnTotal, result) => 
        turnTotal + result.playerDamageDealt, 0), 0);
    
    const totalDamageTaken = this.combatLog.reduce((total, turn) => 
      total + turn.combatResults.reduce((turnTotal, result) => 
        turnTotal + result.playerDamageTaken, 0), 0);

    return {
      totalTurns: this.combatLog.length,
      combatDuration: this.combatStartTime > 0 ? Date.now() - this.combatStartTime : 0,
      totalDamageDealt,
      totalDamageTaken
    };
  }

  // Get full combat log for analysis
  getCombatLog(): CombatTurn[] {
    return [...this.combatLog];
  }

  // Check if position is valid for combat movement
  isValidCombatPosition(gameState: GameState, position: Coordinate): boolean {
    // Use game state's position validation
    return gameState.isValidPosition(position);
  }

  // Get enemies within detection range of player
  getEnemiesInRange(gameState: GameState, range: number = 3): Enemy[] {
    const playerPos = gameState.player.position;
    
    return gameState.enemies.filter(enemy => {
      const distance = Math.abs(playerPos.x - enemy.position.x) + 
                      Math.abs(playerPos.y - enemy.position.y);
      return distance <= range && enemy.isAlive();
    });
  }

  // Force end combat (for testing or special scenarios)
  forceCombatEnd(gameState: GameState): void {
    this.endCombat(gameState);
  }
}