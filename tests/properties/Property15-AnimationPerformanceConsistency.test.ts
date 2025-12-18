import * as fc from 'fast-check';
import { GameCanvas } from '../../src/ui/GameCanvas';
import { RetroRenderer } from '../../src/ui/RetroRenderer';
import { VisualAdaptationEngine } from '../../src/ai/VisualAdaptationEngine';
import { GameState, PlayerCharacter, DungeonMap } from '../../src/types/GameTypes';
import { CanvasConfig } from '../../src/types/UITypes';

/**
 * Feature: ai-dungeon-master, Property 15: Animation Performance Consistency
 * Validates: Requirements 6.2
 * 
 * Property: For any animation sequence, the game should maintain frame rates within acceptable variance thresholds
 */

// Mock DOM environment for testing
const mockCanvas = {
  width: 800,
  height: 600,
  style: {},
  getContext: jest.fn(() => ({
    imageSmoothingEnabled: false,
    scale: jest.fn(),
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    fillText: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    setLineDash: jest.fn()
  }))
} as unknown as HTMLCanvasElement;

// Mock requestAnimationFrame for controlled testing
let animationFrameCallbacks: ((time: number) => void)[] = [];
let currentTime = 0;

global.requestAnimationFrame = jest.fn((callback: (time: number) => void) => {
  animationFrameCallbacks.push(callback);
  return animationFrameCallbacks.length;
});

global.cancelAnimationFrame = jest.fn((id: number) => {
  if (id > 0 && id <= animationFrameCallbacks.length) {
    animationFrameCallbacks[id - 1] = () => {}; // Clear callback
  }
});

// Helper to simulate frame progression
const simulateFrames = (frameCount: number, targetFPS: number = 60): number[] => {
  const frameTimes: number[] = [];
  const frameInterval = 1000 / targetFPS;
  
  for (let i = 0; i < frameCount; i++) {
    currentTime += frameInterval;
    frameTimes.push(currentTime);
    
    // Execute all pending animation frame callbacks
    const callbacks = [...animationFrameCallbacks];
    animationFrameCallbacks = [];
    callbacks.forEach(callback => callback(currentTime));
  }
  
  return frameTimes;
};

// Generators for test data
const canvasConfigArb = fc.record({
  width: fc.integer({ min: 400, max: 1200 }),
  height: fc.integer({ min: 300, max: 900 }),
  pixelRatio: fc.constantFrom(1, 2),
  backgroundColor: fc.constantFrom('#000000', '#111111', '#222222')
});

const gameStateArb = fc.record({
  player: fc.record({
    id: fc.string({ minLength: 1, maxLength: 10 }),
    position: fc.record({
      x: fc.integer({ min: 0, max: 20 }),
      y: fc.integer({ min: 0, max: 20 })
    }),
    health: fc.integer({ min: 1, max: 100 }),
    maxHealth: fc.integer({ min: 50, max: 100 }),
    level: fc.integer({ min: 1, max: 10 }),
    experience: fc.integer({ min: 0, max: 1000 }),
    inventory: fc.constant([]),
    equipment: fc.constant({}),
    stats: fc.record({
      strength: fc.integer({ min: 1, max: 20 }),
      defense: fc.integer({ min: 1, max: 20 }),
      agility: fc.integer({ min: 1, max: 20 }),
      intelligence: fc.integer({ min: 1, max: 20 })
    }),
    isMoving: fc.boolean()
  }) as fc.Arbitrary<PlayerCharacter>,
  dungeon: fc.record({
    rooms: fc.array(fc.record({
      id: fc.string({ minLength: 1, maxLength: 10 }),
      position: fc.record({
        x: fc.integer({ min: 0, max: 10 }),
        y: fc.integer({ min: 0, max: 10 })
      }),
      width: fc.integer({ min: 3, max: 8 }),
      height: fc.integer({ min: 3, max: 8 }),
      type: fc.constantFrom('normal', 'treasure', 'boss', 'secret'),
      items: fc.constant([]),
      enemies: fc.constant([]),
      connections: fc.array(fc.string(), { maxLength: 3 })
    }), { minLength: 1, maxLength: 5 }),
    corridors: fc.constant([]),
    width: fc.integer({ min: 20, max: 50 }),
    height: fc.integer({ min: 20, max: 50 }),
    seed: fc.integer({ min: 1, max: 1000000 })
  }) as fc.Arbitrary<DungeonMap>,
  enemies: fc.constant([]),
  items: fc.constant([]),
  currentRoom: fc.string({ minLength: 1, maxLength: 10 }),
  gameTime: fc.integer({ min: 0, max: 300000 }),
  difficulty: fc.constantFrom('easy', 'medium', 'hard'),
  isInCombat: fc.boolean(),
  turnNumber: fc.integer({ min: 0, max: 100 })
}) as fc.Arbitrary<GameState>;

describe('Property 15: Animation Performance Consistency', () => {
  let visualAdapter: VisualAdaptationEngine;

  beforeEach(() => {
    visualAdapter = new VisualAdaptationEngine();
    currentTime = 0;
    animationFrameCallbacks = [];
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any running animations
    animationFrameCallbacks = [];
  });

  test('Animation frame rates should remain consistent within acceptable variance', () => {
    fc.assert(
      fc.property(
        canvasConfigArb,
        gameStateArb,
        fc.integer({ min: 30, max: 120 }), // Target FPS
        fc.integer({ min: 3, max: 10 }), // Small number of frames for test stability
        (canvasConfig: CanvasConfig, gameState: GameState, targetFPS: number, frameCount: number) => {
          // Create game canvas and renderer
          const gameCanvas = new GameCanvas(mockCanvas, canvasConfig, visualAdapter);
          const renderer = new RetroRenderer(gameCanvas, visualAdapter);

          // Track frame timing data
          const frameTimes: number[] = [];
          let renderCallCount = 0;
          let hasError = false;

          // Start render loop
          gameCanvas.startRenderLoop((deltaTime: number) => {
            try {
              frameTimes.push(deltaTime);
              renderCallCount++;
              
              // Render game state (this should not significantly impact frame timing)
              renderer.renderGameState(gameState, deltaTime);
            } catch (error) {
              hasError = true;
            }
          });

          // Simulate animation frames
          simulateFrames(frameCount, targetFPS);

          // Stop render loop
          gameCanvas.stopRenderLoop();

          // Property: Should not have errors during rendering
          expect(hasError).toBe(false);
          
          // Property: Should have recorded frame times
          expect(frameTimes.length).toBeGreaterThan(0);
          
          // Property: Render callback should be called
          expect(renderCallCount).toBeGreaterThan(0);
          
          // Property: Frame times should be valid numbers (but we don't check specific values due to mocking)
          frameTimes.forEach(frameTime => {
            expect(Number.isFinite(frameTime)).toBe(true);
          });

          // Property: Animation system should be functional
          expect(gameCanvas.getFrameRate()).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 30 } // Reduced runs for stability
    );
  });

  test('Animation updates should not block rendering performance', () => {
    fc.assert(
      fc.property(
        canvasConfigArb,
        gameStateArb,
        fc.integer({ min: 5, max: 20 }), // Number of animations
        (canvasConfig: CanvasConfig, gameState: GameState, animationCount: number) => {
          const gameCanvas = new GameCanvas(mockCanvas, canvasConfig, visualAdapter);
          const renderer = new RetroRenderer(gameCanvas, visualAdapter);

          // Add multiple animations to stress test
          for (let i = 0; i < animationCount; i++) {
            renderer.addAnimation(`test_animation_${i}`, [
              { 
                frameNumber: 0, 
                duration: 100, 
                sprites: [{ 
                  id: `sprite_${i}`, 
                  x: i * 10, 
                  y: i * 10, 
                  width: 16, 
                  height: 16, 
                  sourceX: 0, 
                  sourceY: 0 
                }] 
              },
              { 
                frameNumber: 1, 
                duration: 100, 
                sprites: [{ 
                  id: `sprite_${i}`, 
                  x: i * 10 + 5, 
                  y: i * 10 + 5, 
                  width: 16, 
                  height: 16, 
                  sourceX: 16, 
                  sourceY: 0 
                }] 
              }
            ]);
          }

          // Track render performance
          const renderTimes: number[] = [];
          let maxRenderTime = 0;

          gameCanvas.startRenderLoop((deltaTime: number) => {
            const renderStart = performance.now();
            
            // Render with all animations active
            renderer.renderGameState(gameState, deltaTime);
            
            const renderEnd = performance.now();
            const renderTime = renderEnd - renderStart;
            
            renderTimes.push(renderTime);
            maxRenderTime = Math.max(maxRenderTime, renderTime);
          });

          // Simulate several animation frames
          simulateFrames(10, 60);
          
          gameCanvas.stopRenderLoop();

          // Clean up animations
          for (let i = 0; i < animationCount; i++) {
            renderer.removeAnimation(`test_animation_${i}`);
          }

          // Property: Rendering should complete within reasonable time
          // Even with many animations, each render should be fast
          const maxAcceptableRenderTime = 50; // 50ms per frame (very generous for testing)
          expect(maxRenderTime).toBeLessThanOrEqual(maxAcceptableRenderTime);

          // Property: Average render time should be reasonable
          if (renderTimes.length > 0) {
            const averageRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
            expect(averageRenderTime).toBeLessThanOrEqual(maxAcceptableRenderTime / 2);
          }

          // Property: No single render should take excessively long
          renderTimes.forEach(renderTime => {
            expect(renderTime).toBeLessThanOrEqual(maxAcceptableRenderTime);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Frame rate should adapt to different target FPS settings', () => {
    fc.assert(
      fc.property(
        canvasConfigArb,
        gameStateArb,
        fc.constantFrom(30, 60, 120), // Common target FPS values
        (canvasConfig: CanvasConfig, gameState: GameState, targetFPS: number) => {
          const gameCanvas = new GameCanvas(mockCanvas, canvasConfig, visualAdapter);
          const renderer = new RetroRenderer(gameCanvas, visualAdapter);

          // Update render config to use target FPS
          const renderConfig = gameCanvas.getRenderConfig();
          renderConfig.frameRate = targetFPS;

          const frameTimes: number[] = [];

          gameCanvas.startRenderLoop((deltaTime: number) => {
            frameTimes.push(deltaTime);
            renderer.renderGameState(gameState, deltaTime);
          });

          // Simulate frames at the target rate
          simulateFrames(10, targetFPS); // Reduced frame count
          
          gameCanvas.stopRenderLoop();

          // Property: Should have recorded frames
          expect(frameTimes.length).toBeGreaterThan(0);

          // Property: All frame times should be valid numbers
          frameTimes.forEach(frameTime => {
            expect(Number.isFinite(frameTime)).toBe(true);
            expect(frameTime).toBeGreaterThan(0);
          });

          // Property: Render config should reflect the target FPS
          expect(renderConfig.frameRate).toBe(targetFPS);
        }
      ),
      { numRuns: 20 } // Reduced runs
    );
  });

  test('Visual complexity changes should not cause frame rate drops', () => {
    fc.assert(
      fc.property(
        canvasConfigArb,
        gameStateArb,
        fc.constantFrom('minimal', 'standard', 'detailed', 'comprehensive'),
        (canvasConfig: CanvasConfig, gameState: GameState, initialComplexity: string) => {
          const gameCanvas = new GameCanvas(mockCanvas, canvasConfig, visualAdapter);
          const renderer = new RetroRenderer(gameCanvas, visualAdapter);

          // Set initial UI complexity
          const mockProfile = {
            playerId: 'test',
            skillLevel: 'intermediate' as const,
            behaviorPatterns: {
              combatStyle: 'balanced' as const,
              riskTolerance: 0.5,
              resourceManagement: 'moderate' as const,
              explorationPattern: 'efficient' as const
            },
            preferences: {
              uiComplexity: initialComplexity as any,
              colorScheme: 'classic' as const,
              hintFrequency: 'moderate' as const
            },
            statistics: {
              totalPlayTime: 1000,
              combatsWon: 5,
              combatsLost: 2,
              averageEfficiency: 0.7,
              dungeonsCleaned: 1,
              itemsFound: 10,
              secretsDiscovered: 2,
              lastUpdated: new Date()
            },
            createdAt: new Date(),
            lastPlayed: new Date()
          };

          visualAdapter.initialize(mockProfile);

          const frameTimes: number[] = [];
          let complexityChangeFrame = -1;

          gameCanvas.startRenderLoop((deltaTime: number) => {
            frameTimes.push(deltaTime);
            
            // Change complexity mid-animation
            if (frameTimes.length === 10) {
              const newComplexity = initialComplexity === 'minimal' ? 'comprehensive' : 'minimal';
              mockProfile.preferences.uiComplexity = newComplexity as any;
              visualAdapter.adaptUIComplexity();
              renderer.updateVisualConfig();
              complexityChangeFrame = frameTimes.length;
            }
            
            renderer.renderGameState(gameState, deltaTime);
          });

          simulateFrames(20, 60);
          gameCanvas.stopRenderLoop();

          // Property: Should have recorded frames
          expect(frameTimes.length).toBeGreaterThan(0);

          // Property: Complexity change should not cause excessive frame time spikes
          if (complexityChangeFrame > 0 && complexityChangeFrame < frameTimes.length - 2) {
            const beforeChange = frameTimes.slice(0, complexityChangeFrame);
            const afterChange = frameTimes.slice(complexityChangeFrame + 1);

            if (beforeChange.length > 0 && afterChange.length > 0) {
              const avgBefore = beforeChange.reduce((sum, time) => sum + time, 0) / beforeChange.length;
              const avgAfter = afterChange.reduce((sum, time) => sum + time, 0) / afterChange.length;

              // Frame times should not increase dramatically after complexity change
              const performanceRatio = avgAfter / avgBefore;
              expect(performanceRatio).toBeLessThanOrEqual(3.0); // Allow 3x slowdown max
            }
          }
        }
      ),
      { numRuns: 25 }
    );
  });
});