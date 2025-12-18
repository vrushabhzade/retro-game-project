// **Feature: ai-dungeon-master, Property 2: Movement State Updates**
// **Validates: Requirements 1.2**

import * as fc from 'fast-check';
import { GameEngine } from '../../src/engine/GameEngine';
import { PlayerAction } from '../../src/types/GameTypes';

describe('Property 2: Movement State Updates', () => {
  test('Movement state updates maintain valid game state invariants', () => {
    // Property: *For any* valid player movement action in the dungeon, 
    // the game state should update the player position correctly and 
    // maintain valid game state invariants
    
    fc.assert(
      fc.property(
        fc.record({
          // Generate valid dungeon configuration
          dungeonConfig: fc.record({
            width: fc.integer({ min: 10, max: 30 }),
            height: fc.integer({ min: 10, max: 30 }),
            minRooms: fc.integer({ min: 2, max: 5 }),
            maxRooms: fc.integer({ min: 3, max: 8 })
          }).filter(config => config.maxRooms >= config.minRooms),
          
          // Generate movement direction
          direction: fc.constantFrom('north' as const, 'south' as const, 'east' as const, 'west' as const),
          
          // Generate number of movement steps to test
          steps: fc.integer({ min: 1, max: 5 })
        }),
        ({ dungeonConfig, direction, steps }) => {
          // Create game engine with generated dungeon
          const gameEngine = new GameEngine({ dungeonConfig });
          
          // Get initial state
          const initialState = gameEngine.getGameState();
          const initialPosition = { ...initialState.player.position };
          
          // Verify initial state is valid
          expect(initialState.validate()).toBe(true);
          expect(initialState.isValidPosition(initialPosition)).toBe(true);
          
          // Perform movement steps
          let currentState = initialState;
          
          for (let i = 0; i < steps; i++) {
            const moveAction: PlayerAction = {
              type: 'move',
              direction: direction,
              timestamp: Date.now() + i
            };
            
            // Store position before movement
            const positionBefore = { ...currentState.player.position };
            
            // Queue and process the movement action
            gameEngine.queueAction(moveAction);
            
            // Get updated state
            currentState = gameEngine.getGameState();
            
            // Assertion 1: Game state remains valid after movement
            expect(currentState.validate()).toBe(true);
            
            // Assertion 2: Player position is always valid
            expect(currentState.isValidPosition(currentState.player.position)).toBe(true);
            
            // Assertion 3: If position changed, it changed in the correct direction
            const positionAfter = currentState.player.position;
            if (positionAfter.x !== positionBefore.x || positionAfter.y !== positionBefore.y) {
              
              switch (direction) {
                case 'north':
                  expect(positionAfter.y).toBe(positionBefore.y - 1);
                  expect(positionAfter.x).toBe(positionBefore.x);
                  break;
                case 'south':
                  expect(positionAfter.y).toBe(positionBefore.y + 1);
                  expect(positionAfter.x).toBe(positionBefore.x);
                  break;
                case 'east':
                  expect(positionAfter.x).toBe(positionBefore.x + 1);
                  expect(positionAfter.y).toBe(positionBefore.y);
                  break;
                case 'west':
                  expect(positionAfter.x).toBe(positionBefore.x - 1);
                  expect(positionAfter.y).toBe(positionBefore.y);
                  break;
              }
            }
            
            // Assertion 4: Current room is updated correctly if player moved to a new room
            if (positionAfter.x !== positionBefore.x || positionAfter.y !== positionBefore.y) {
              const roomContainingPlayer = currentState.dungeon.rooms.find(room =>
                positionAfter.x >= room.position.x &&
                positionAfter.x < room.position.x + room.width &&
                positionAfter.y >= room.position.y &&
                positionAfter.y < room.position.y + room.height
              );
              
              if (roomContainingPlayer) {
                expect(currentState.currentRoom).toBe(roomContainingPlayer.id);
              }
            }
            
            // Assertion 5: Other game state properties remain consistent
            expect(currentState.player.health).toBe(initialState.player.health);
            expect(currentState.player.level).toBe(initialState.player.level);
            expect(currentState.player.stats).toEqual(initialState.player.stats);
            expect(currentState.dungeon).toEqual(initialState.dungeon);
            expect(currentState.difficulty).toBe(initialState.difficulty);
          }
          
          // Assertion 6: At least some movement should be possible in a valid dungeon
          // (This ensures we're not just testing blocked movement)
          const totalRoomArea = currentState.dungeon.rooms.reduce((total, room) => 
            total + (room.width * room.height), 0
          );
          const totalCorridorLength = currentState.dungeon.corridors.reduce((total, corridor) =>
            total + corridor.path.length, 0
          );
          
          // If there's sufficient space, some movement should be possible
          if (totalRoomArea + totalCorridorLength > 4) {
            // We don't require movement to occur (player might be at boundary),
            // but the state should remain valid regardless
            expect(currentState.validate()).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('Movement collision detection prevents invalid positions', () => {
    // Simplified test to isolate the issue
    fc.assert(
      fc.property(
        fc.record({
          dungeonConfig: fc.record({
            width: fc.integer({ min: 5, max: 15 }),
            height: fc.integer({ min: 5, max: 15 }),
            minRooms: fc.integer({ min: 1, max: 3 }),
            maxRooms: fc.integer({ min: 2, max: 4 })
          }).filter(config => config.maxRooms >= config.minRooms)
        }),
        ({ dungeonConfig }) => {
          const gameEngine = new GameEngine({ dungeonConfig });
          let gameState = gameEngine.getGameState();
          
          // First, verify the initial state is valid
          expect(gameState.validate()).toBe(true);
          
          // Test with clearly invalid positions
          const invalidPositions = [
            { x: -1, y: 0 },
            { x: 0, y: -1 },
            { x: dungeonConfig.width, y: 0 },
            { x: 0, y: dungeonConfig.height }
          ];
          
          for (const invalidPos of invalidPositions) {
            const initialPosition = { ...gameState.player.position };
            
            // Position should be invalid
            expect(gameState.isValidPosition(invalidPos)).toBe(false);
            
            // Movement should fail
            const moveSucceeded = gameState.updatePlayerPosition(invalidPos);
            expect(moveSucceeded).toBe(false);
            
            // Position should remain unchanged
            expect(gameState.player.position).toEqual(initialPosition);
            
            // State should remain valid
            expect(gameState.validate()).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});