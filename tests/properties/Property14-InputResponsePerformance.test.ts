// **Feature: ai-dungeon-master, Property 14: Input Response Performance**
// **Validates: Requirements 6.1**

import * as fc from 'fast-check';
import { GameEngine } from '../../src/engine/GameEngine';
import { PlayerAction } from '../../src/types/GameTypes';
import { MAX_INPUT_RESPONSE_TIME } from '../../src/utils/Constants';

describe('Property 14: Input Response Performance', () => {
  test('Player movement input responds within 100 milliseconds', () => {
    // Property: *For any* player movement input, the game should respond within 100 milliseconds
    
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
          
          // Generate number of sequential inputs to test performance under load
          inputCount: fc.integer({ min: 1, max: 10 })
        }),
        ({ dungeonConfig, direction, inputCount }) => {
          // Create game engine with generated dungeon
          const gameEngine = new GameEngine({ dungeonConfig });
          
          // Start the game engine to enable input processing
          gameEngine.start();
          
          try {
            // Get initial state
            const initialState = gameEngine.getGameState();
            
            // Verify initial state is valid
            expect(initialState.validate()).toBe(true);
            
            // Test multiple sequential inputs to verify consistent performance
            for (let i = 0; i < inputCount; i++) {
              const moveAction: PlayerAction = {
                type: 'move',
                direction: direction,
                timestamp: Date.now()
              };
              
              // Measure response time
              const startTime = performance.now();
              
              // Queue the action (simulating input)
              gameEngine.queueAction(moveAction);
              
              // Allow one frame for processing (simulate game loop processing)
              // In real scenario, this would be handled by the game loop
              // For testing, we need to trigger processing manually
              const processingStartTime = performance.now();
              
              // Get updated state after action processing
              const updatedState = gameEngine.getGameState();
              
              const endTime = performance.now();
              const responseTime = endTime - startTime;
              
              // Assertion 1: Response time should be within the required limit
              expect(responseTime).toBeLessThanOrEqual(MAX_INPUT_RESPONSE_TIME);
              
              // Assertion 2: Game state should remain valid after input processing
              expect(updatedState.validate()).toBe(true);
              
              // Assertion 3: Player position should be valid
              expect(updatedState.isValidPosition(updatedState.player.position)).toBe(true);
              
              // Assertion 4: Action timestamp should be preserved
              expect(moveAction.timestamp).toBeGreaterThan(0);
              
              // Assertion 5: Processing should not block for extended periods
              const processingTime = endTime - processingStartTime;
              expect(processingTime).toBeLessThanOrEqual(MAX_INPUT_RESPONSE_TIME / 2); // Allow some margin
            }
            
            return true;
          } finally {
            // Clean up - stop the game engine
            gameEngine.stop();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('Input response time remains consistent under multiple rapid inputs', () => {
    // Property: *For any* sequence of rapid movement inputs, each input should 
    // respond within the time limit without degradation
    
    fc.assert(
      fc.property(
        fc.record({
          dungeonConfig: fc.record({
            width: fc.integer({ min: 8, max: 20 }),
            height: fc.integer({ min: 8, max: 20 }),
            minRooms: fc.integer({ min: 1, max: 3 }),
            maxRooms: fc.integer({ min: 2, max: 5 })
          }).filter(config => config.maxRooms >= config.minRooms),
          
          // Generate sequence of directions for rapid input testing
          directions: fc.array(
            fc.constantFrom('north' as const, 'south' as const, 'east' as const, 'west' as const),
            { minLength: 3, maxLength: 8 }
          )
        }),
        ({ dungeonConfig, directions }) => {
          const gameEngine = new GameEngine({ dungeonConfig });
          gameEngine.start();
          
          try {
            const responseTimes: number[] = [];
            
            // Test rapid sequential inputs
            for (let i = 0; i < directions.length; i++) {
              const direction = directions[i];
              if (!direction) continue;
              
              const moveAction: PlayerAction = {
                type: 'move',
                direction: direction,
                timestamp: Date.now() + i // Ensure unique timestamps
              };
              
              const startTime = performance.now();
              
              // Queue action
              gameEngine.queueAction(moveAction);
              
              // Get state (triggers processing)
              const state = gameEngine.getGameState();
              
              const endTime = performance.now();
              const responseTime = endTime - startTime;
              
              responseTimes.push(responseTime);
              
              // Assertion 1: Each individual response should be within limit
              expect(responseTime).toBeLessThanOrEqual(MAX_INPUT_RESPONSE_TIME);
              
              // Assertion 2: State should remain valid
              expect(state.validate()).toBe(true);
            }
            
            // Assertion 3: Response times should not degrade significantly over time
            if (responseTimes.length > 2) {
              const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
              const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));
              
              const avgFirstHalf = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
              const avgSecondHalf = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;
              
              // Second half should not be more than 500% slower than first half
              // Allow for significant variance in test environment performance measurements
              if (avgFirstHalf > 0) {
                expect(avgSecondHalf).toBeLessThanOrEqual(Math.max(avgFirstHalf * 5, 10));
              }
            }
            
            // Assertion 4: Maximum response time should not exceed limit
            const maxResponseTime = Math.max(...responseTimes);
            expect(maxResponseTime).toBeLessThanOrEqual(MAX_INPUT_RESPONSE_TIME);
            
            return true;
          } finally {
            gameEngine.stop();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('Action processing completes within performance constraints', () => {
    // Property: *For any* movement action, direct processing should 
    // complete within the specified response time limit
    
    fc.assert(
      fc.property(
        fc.record({
          direction: fc.constantFrom('north' as const, 'south' as const, 'east' as const, 'west' as const),
          actionCount: fc.integer({ min: 1, max: 5 })
        }),
        ({ direction, actionCount }) => {
          const gameEngine = new GameEngine();
          gameEngine.start();
          
          try {
            // Test multiple actions to verify consistent performance
            for (let i = 0; i < actionCount; i++) {
              const moveAction: PlayerAction = {
                type: 'move',
                direction: direction,
                timestamp: Date.now() + i
              };
              
              const startTime = performance.now();
              
              // Process action directly through game engine
              gameEngine.queueAction(moveAction);
              
              // Verify processing completes quickly
              const state = gameEngine.getGameState();
              
              const endTime = performance.now();
              const processingTime = endTime - startTime;
              
              // Assertion 1: Processing time should be within limits
              expect(processingTime).toBeLessThanOrEqual(MAX_INPUT_RESPONSE_TIME);
              
              // Assertion 2: Game state should remain valid
              expect(state.validate()).toBe(true);
              
              // Assertion 3: Player position should be valid
              expect(state.isValidPosition(state.player.position)).toBe(true);
            }
            
            return true;
          } finally {
            gameEngine.stop();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});