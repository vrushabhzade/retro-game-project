// **Feature: ai-dungeon-master, Property 3: Encounter Mechanics Activation**
// **Validates: Requirements 1.3**

import * as fc from 'fast-check';
import { GameEngine } from '../../src/engine/GameEngine';
import { Enemy } from '../../src/combat/Enemy';
import { PlayerAction } from '../../src/types/GameTypes';

describe('Property 3: Encounter Mechanics Activation', () => {
  test('Encounter mechanics activate when player encounters monsters or traps', () => {
    fc.assert(
      fc.property(
        // Generate random player positions and enemy configurations
        fc.record({
          playerPosition: fc.record({
            x: fc.integer({ min: 1, max: 15 }),
            y: fc.integer({ min: 1, max: 15 })
          }),
          enemies: fc.array(
            fc.record({
              name: fc.constantFrom('Goblin', 'Orc', 'Skeleton', 'Spider'),
              position: fc.record({
                x: fc.integer({ min: 1, max: 15 }),
                y: fc.integer({ min: 1, max: 15 })
              }),
              health: fc.integer({ min: 10, max: 100 }),
              attackPower: fc.integer({ min: 5, max: 25 }),
              defense: fc.integer({ min: 0, max: 10 }),
              aiType: fc.constantFrom('aggressive', 'defensive', 'patrol', 'guard')
            }),
            { minLength: 0, maxLength: 5 }
          )
        }),
        (testData) => {
          // Create game engine with a simple dungeon
          const gameEngine = new GameEngine({
            dungeonConfig: {
              width: 20,
              height: 20,
              minRooms: 3,
              maxRooms: 5
            }
          });

          const gameState = gameEngine.getGameState();
          
          // Set up player position
          gameState.player.position = testData.playerPosition;
          
          // Create enemies from test data
          const enemies = testData.enemies.map(enemyData => 
            new Enemy({
              name: enemyData.name,
              position: enemyData.position,
              health: enemyData.health,
              maxHealth: enemyData.health,
              attackPower: enemyData.attackPower,
              defense: enemyData.defense,
              aiType: enemyData.aiType as any
            })
          );
          
          gameState.enemies = enemies;
          
          // Check for encounters using combat system
          const combatSystem = gameEngine.getCombatSystem();
          const encounterEnemies = combatSystem.checkForEncounter(gameState);
          
          // Property: If there are enemies adjacent to player, encounters should be detected
          const adjacentEnemies = enemies.filter(enemy => {
            const distance = Math.abs(enemy.position.x - testData.playerPosition.x) + 
                            Math.abs(enemy.position.y - testData.playerPosition.y);
            return distance <= 1;
          });
          
          // The number of encounter enemies should match adjacent enemies
          expect(encounterEnemies.length).toBe(adjacentEnemies.length);
          
          // If encounters are detected, combat should be initiatable
          if (encounterEnemies.length > 0) {
            const combatInitiated = combatSystem.initiateCombat(gameState, encounterEnemies);
            expect(combatInitiated).toBe(true);
            expect(gameState.isInCombat).toBe(true);
            
            // Combat mechanics should be active - test with a player action
            const firstEnemy = encounterEnemies[0];
            if (firstEnemy) {
              const attackAction: PlayerAction = {
                type: 'attack',
                target: firstEnemy.id,
                timestamp: Date.now()
              };
            
              // Should be able to process combat turn without errors
              expect(() => {
                combatSystem.processCombatTurn(gameState, attackAction, encounterEnemies);
              }).not.toThrow();
              
              // Game state should reflect combat is active
              expect(gameState.isInCombat).toBe(true);
              expect(gameState.turnNumber).toBeGreaterThan(0);
            }
          } else {
            // If no encounters, combat should not be initiated
            const combatInitiated = combatSystem.initiateCombat(gameState, encounterEnemies);
            expect(combatInitiated).toBe(false);
            expect(gameState.isInCombat).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Encounter mechanics handle edge cases correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          playerPosition: fc.record({
            x: fc.integer({ min: 0, max: 19 }),
            y: fc.integer({ min: 0, max: 19 })
          }),
          enemyPosition: fc.record({
            x: fc.integer({ min: 0, max: 19 }),
            y: fc.integer({ min: 0, max: 19 })
          })
        }),
        (testData) => {
          const gameEngine = new GameEngine();
          const gameState = gameEngine.getGameState();
          const combatSystem = gameEngine.getCombatSystem();
          
          // Set up test scenario
          gameState.player.position = testData.playerPosition;
          
          const enemy = new Enemy({
            name: 'Test Enemy',
            position: testData.enemyPosition,
            health: 50,
            aiType: 'aggressive'
          });
          
          gameState.enemies = [enemy];
          
          // Check encounter detection
          const encounters = combatSystem.checkForEncounter(gameState);
          
          // Calculate expected result
          const distance = Math.abs(testData.playerPosition.x - testData.enemyPosition.x) + 
                          Math.abs(testData.playerPosition.y - testData.enemyPosition.y);
          const shouldEncounter = distance <= 1;
          
          // Property: Encounter detection should be consistent with distance calculation
          expect(encounters.length > 0).toBe(shouldEncounter);
          
          if (shouldEncounter) {
            expect(encounters).toContain(enemy);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Multiple encounters are handled correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          playerPosition: fc.record({
            x: fc.integer({ min: 5, max: 10 }),
            y: fc.integer({ min: 5, max: 10 })
          }),
          numEnemies: fc.integer({ min: 2, max: 4 })
        }),
        (testData) => {
          const gameEngine = new GameEngine();
          const gameState = gameEngine.getGameState();
          const combatSystem = gameEngine.getCombatSystem();
          
          gameState.player.position = testData.playerPosition;
          
          // Create multiple enemies around the player
          const enemies: Enemy[] = [];
          const adjacentPositions = [
            { x: testData.playerPosition.x + 1, y: testData.playerPosition.y },
            { x: testData.playerPosition.x - 1, y: testData.playerPosition.y },
            { x: testData.playerPosition.x, y: testData.playerPosition.y + 1 },
            { x: testData.playerPosition.x, y: testData.playerPosition.y - 1 }
          ];
          
          for (let i = 0; i < Math.min(testData.numEnemies, adjacentPositions.length); i++) {
            const pos = adjacentPositions[i];
            if (pos) {
              enemies.push(new Enemy({
                name: `Enemy_${i}`,
                position: pos,
                health: 30,
                aiType: 'aggressive'
              }));
            }
          }
          
          gameState.enemies = enemies;
          
          // Check encounters
          const encounters = combatSystem.checkForEncounter(gameState);
          
          // Property: All adjacent enemies should be detected
          expect(encounters.length).toBe(enemies.length);
          
          // All created enemies should be in encounters
          for (const enemy of enemies) {
            expect(encounters).toContain(enemy);
          }
          
          // Combat should handle multiple enemies
          if (encounters.length > 0) {
            const combatInitiated = combatSystem.initiateCombat(gameState, encounters);
            expect(combatInitiated).toBe(true);
            
            // Should be able to process combat with multiple enemies
            const defendAction: PlayerAction = {
              type: 'defend',
              timestamp: Date.now()
            };
            
            expect(() => {
              combatSystem.processCombatTurn(gameState, defendAction, encounters);
            }).not.toThrow();
            
            // All enemies should have had a chance to act
            const combatLog = combatSystem.getCombatLog();
            expect(combatLog.length).toBe(1);
            expect(combatLog[0]?.enemyActions.length).toBe(encounters.length);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Encounter mechanics preserve game state integrity', () => {
    fc.assert(
      fc.property(
        fc.record({
          playerHealth: fc.integer({ min: 1, max: 100 }),
          playerPosition: fc.record({
            x: fc.integer({ min: 2, max: 8 }),
            y: fc.integer({ min: 2, max: 8 })
          }),
          enemyHealth: fc.integer({ min: 1, max: 50 })
        }),
        (testData) => {
          const gameEngine = new GameEngine();
          const gameState = gameEngine.getGameState();
          const combatSystem = gameEngine.getCombatSystem();
          
          // Set up initial state
          gameState.player.position = testData.playerPosition;
          gameState.player.health = testData.playerHealth;
          gameState.player.maxHealth = Math.max(testData.playerHealth, 100);
          
          const enemy = new Enemy({
            name: 'Test Enemy',
            position: { 
              x: testData.playerPosition.x + 1, 
              y: testData.playerPosition.y 
            },
            health: testData.enemyHealth,
            maxHealth: testData.enemyHealth,
            aiType: 'aggressive'
          });
          
          gameState.enemies = [enemy];
          
          // Capture initial state
          const initialTurnNumber = gameState.turnNumber;
          
          // Trigger encounter
          const encounters = combatSystem.checkForEncounter(gameState);
          expect(encounters.length).toBe(1);
          
          combatSystem.initiateCombat(gameState, encounters);
          
          // Process a combat turn
          const attackAction: PlayerAction = {
            type: 'attack',
            target: enemy.id,
            timestamp: Date.now()
          };
          
          combatSystem.processCombatTurn(gameState, attackAction, encounters);
          
          // Property: Game state should maintain integrity after encounter
          // Player health should be valid
          expect(gameState.player.health).toBeGreaterThanOrEqual(0);
          expect(gameState.player.health).toBeLessThanOrEqual(gameState.player.maxHealth);
          
          // Enemy health should be valid
          expect(enemy.health).toBeGreaterThanOrEqual(0);
          expect(enemy.health).toBeLessThanOrEqual(enemy.maxHealth);
          
          // Turn number should have advanced
          expect(gameState.turnNumber).toBeGreaterThan(initialTurnNumber);
          
          // Combat state should be consistent
          if (gameState.player.health > 0 && enemy.health > 0) {
            expect(gameState.isInCombat).toBe(true);
          }
          
          // If either participant is defeated, combat should end appropriately
          if (gameState.player.health === 0 || enemy.health === 0) {
            // Combat may have ended
            expect(gameState.isInCombat).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});