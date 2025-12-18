// **Feature: ai-dungeon-master, Property 11: Game State Persistence Round Trip**
// **Validates: Requirements 5.1, 5.3**

import * as fc from 'fast-check';
import { GameState } from '../../src/engine/GameState';
import { GameEngine } from '../../src/engine/GameEngine';
import { Item } from '../../src/types/GameTypes';
import { Enemy } from '../../src/combat/Enemy';

describe('Property 11: Game State Persistence Round Trip', () => {
  test('Game state persistence round trip maintains equivalence', () => {
    // Property: *For any* valid game state, saving and then loading should restore 
    // an equivalent game state with identical dungeon layout, player position, 
    // and all game elements
    
    fc.assert(
      fc.property(
        fc.record({
          // Generate dungeon configuration
          dungeonConfig: fc.record({
            width: fc.integer({ min: 10, max: 30 }),
            height: fc.integer({ min: 10, max: 30 }),
            minRooms: fc.integer({ min: 2, max: 5 }),
            maxRooms: fc.integer({ min: 3, max: 8 })
          }).filter(config => config.maxRooms >= config.minRooms),
          
          // Generate game time progression
          gameTime: fc.integer({ min: 0, max: 10000 }),
          turnNumber: fc.integer({ min: 0, max: 100 }),
          
          // Generate player modifications
          playerHealthDelta: fc.integer({ min: -50, max: 0 }),
          playerExperience: fc.integer({ min: 0, max: 1000 }),
          
          // Generate combat state
          isInCombat: fc.boolean(),
          
          // Generate difficulty
          difficulty: fc.constantFrom('easy' as const, 'medium' as const, 'hard' as const)
        }),
        ({ dungeonConfig, gameTime, turnNumber, playerHealthDelta, playerExperience, isInCombat, difficulty }) => {
          // Create a game engine with generated dungeon
          const gameEngine = new GameEngine({ dungeonConfig });
          let originalState = gameEngine.getGameState();
          
          // Ensure we have a valid initial state
          expect(originalState.validate()).toBe(true);
          
          // Modify the game state to create a more complex scenario
          originalState.gameTime = gameTime;
          originalState.turnNumber = turnNumber;
          originalState.difficulty = difficulty;
          originalState.isInCombat = isInCombat;
          
          // Modify player state
          originalState.player.health = Math.max(1, originalState.player.health + playerHealthDelta);
          originalState.player.experience = playerExperience;
          
          // Ensure modified state is still valid
          expect(originalState.validate()).toBe(true);
          
          // Perform the round trip: serialize then deserialize
          const serializedState = originalState.serialize();
          const restoredState = GameState.deserialize(serializedState);
          
          // Assertion 1: Restored state should be valid
          expect(restoredState.validate()).toBe(true);
          
          // Assertion 2: Dungeon layout should be identical
          expect(restoredState.dungeon).toEqual(originalState.dungeon);
          
          // Assertion 3: Player position should be identical
          expect(restoredState.player.position).toEqual(originalState.player.position);
          
          // Assertion 4: Player character should be completely identical
          expect(restoredState.player).toEqual(originalState.player);
          
          // Assertion 5: All game elements should be identical
          expect(restoredState.enemies).toEqual(originalState.enemies);
          expect(restoredState.items).toEqual(originalState.items);
          expect(restoredState.currentRoom).toEqual(originalState.currentRoom);
          
          // Assertion 6: Game state metadata should be identical
          expect(restoredState.gameTime).toBe(originalState.gameTime);
          expect(restoredState.difficulty).toBe(originalState.difficulty);
          expect(restoredState.isInCombat).toBe(originalState.isInCombat);
          expect(restoredState.turnNumber).toBe(originalState.turnNumber);
          
          // Assertion 7: Complete state equivalence
          expect(restoredState).toEqual(originalState);
          
          // Assertion 8: Serialization should be deterministic (same input -> same output)
          const secondSerialization = restoredState.serialize();
          expect(secondSerialization).toBe(serializedState);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('Game state persistence handles edge cases correctly', () => {
    // Test edge cases like empty inventories, no enemies, etc.
    fc.assert(
      fc.property(
        fc.record({
          dungeonConfig: fc.record({
            width: fc.integer({ min: 5, max: 15 }),
            height: fc.integer({ min: 5, max: 15 }),
            minRooms: fc.integer({ min: 1, max: 3 }),
            maxRooms: fc.integer({ min: 1, max: 4 })
          }).filter(config => config.maxRooms >= config.minRooms),
          
          // Test with minimal/maximal values
          gameTime: fc.constantFrom(0, Number.MAX_SAFE_INTEGER),
          turnNumber: fc.constantFrom(0, Number.MAX_SAFE_INTEGER)
        }),
        ({ dungeonConfig, gameTime, turnNumber }) => {
          const gameEngine = new GameEngine({ dungeonConfig });
          let originalState = gameEngine.getGameState();
          
          // Set edge case values
          originalState.gameTime = gameTime;
          originalState.turnNumber = turnNumber;
          
          // Clear arrays to test empty collections
          originalState.enemies = [];
          originalState.items = [];
          originalState.player.inventory = [];
          originalState.player.equipment = {};
          
          // Ensure state is still valid
          expect(originalState.validate()).toBe(true);
          
          // Perform round trip
          const serializedState = originalState.serialize();
          const restoredState = GameState.deserialize(serializedState);
          
          // Verify complete equivalence
          expect(restoredState).toEqual(originalState);
          expect(restoredState.validate()).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
  
  test('Game state persistence preserves complex nested structures', () => {
    // Test with complex player equipment and inventory
    fc.assert(
      fc.property(
        fc.record({
          dungeonConfig: fc.record({
            width: fc.integer({ min: 10, max: 20 }),
            height: fc.integer({ min: 10, max: 20 }),
            minRooms: fc.integer({ min: 2, max: 4 }),
            maxRooms: fc.integer({ min: 3, max: 6 })
          }).filter(config => config.maxRooms >= config.minRooms)
        }),
        ({ dungeonConfig }) => {
          const gameEngine = new GameEngine({ dungeonConfig });
          let originalState = gameEngine.getGameState();
          
          // Add complex inventory items
          const weaponItem: Item = {
            id: 'sword_1',
            name: 'Magic Sword',
            type: 'weapon',
            position: { x: 0, y: 0 },
            properties: { damage: 15, enchantment: 'fire', durability: 100 }
          };
          
          const armorItem: Item = {
            id: 'armor_1',
            name: 'Plate Armor',
            type: 'armor',
            position: { x: 1, y: 1 },
            properties: { defense: 20, weight: 50, material: 'steel' }
          };
          
          originalState.player.inventory = [weaponItem, armorItem];
          originalState.player.equipment.weapon = weaponItem;
          originalState.player.equipment.armor = armorItem;
          
          // Add complex enemy data
          originalState.enemies = [
            new Enemy({
              id: 'orc_1',
              name: 'Orc Warrior',
              position: { x: 5, y: 5 },
              health: 80,
              maxHealth: 100,
              attackPower: 25,
              defense: 10,
              aiType: 'aggressive'
            })
          ];
          
          // Ensure state is valid
          expect(originalState.validate()).toBe(true);
          
          // Perform round trip
          const serializedState = originalState.serialize();
          const restoredState = GameState.deserialize(serializedState);
          
          // Verify all complex structures are preserved
          expect(restoredState.player.inventory).toEqual(originalState.player.inventory);
          expect(restoredState.player.equipment).toEqual(originalState.player.equipment);
          expect(restoredState.enemies).toEqual(originalState.enemies);
          expect(restoredState).toEqual(originalState);
          expect(restoredState.validate()).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});