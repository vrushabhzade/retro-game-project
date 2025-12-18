import * as fc from 'fast-check';
import { PerformanceManager } from '../../src/utils/PerformanceManager';
import { GameEngine } from '../../src/engine/GameEngine';
import { AIMentorSystem } from '../../src/ai/AIMentorSystem';
import { VisualAdaptationEngine } from '../../src/ai/VisualAdaptationEngine';
import { CombatAnalysisSystem } from '../../src/combat/CombatAnalysis';
import { PlayerProfile } from '../../src/player/PlayerProfile';


/**
 * Feature: ai-dungeon-master, Property 16: Gameplay Priority Under Load
 * Validates: Requirements 6.3, 6.4
 * 
 * Property: For any situation where multiple AI systems are processing, 
 * user interactions should remain responsive and not be blocked
 */

describe('Property 16: Gameplay Priority Under Load', () => {
  let performanceManager: PerformanceManager;
  let gameEngine: GameEngine;
  let aiMentor: AIMentorSystem;
  let visualAdapter: VisualAdaptationEngine;
  let combatAnalysis: CombatAnalysisSystem;

  beforeEach(() => {
    performanceManager = PerformanceManager.getInstance();
    
    // Initialize game engine with test configuration
    gameEngine = new GameEngine({
      targetFrameRate: 60,
      dungeonConfig: {
        width: 10,
        height: 10,
        minRooms: 3,
        maxRooms: 5
      }
    });

    // Initialize AI systems
    aiMentor = new AIMentorSystem();
    visualAdapter = new VisualAdaptationEngine();
    combatAnalysis = new CombatAnalysisSystem();

    // Initialize with test profile
    const testProfile = new PlayerProfile('test-player');
    testProfile.skillLevel = 'intermediate';
    testProfile.statistics.combatsWon = 15;
    testProfile.statistics.combatsLost = 5;
    testProfile.statistics.averageEfficiency = 0.75;

    aiMentor.initialize(testProfile);
    visualAdapter.initialize(testProfile);
  });

  afterEach(() => {
    gameEngine.stop();
    performanceManager.enablePerformanceMode(false);
  });

  test('Property 16: Gameplay responsiveness maintained under AI processing load', () => {
    fc.assert(
      fc.property(
        // Generate system load scenarios
        fc.record({
          aiProcessingIntensity: fc.integer({ min: 1, max: 10 }),
          visualAdaptationLoad: fc.integer({ min: 1, max: 5 }),
          combatAnalysisComplexity: fc.integer({ min: 1, max: 8 }),
          simultaneousOperations: fc.integer({ min: 2, max: 6 })
        }),
        
        // Generate player input scenarios
        fc.record({
          inputType: fc.constantFrom('move', 'attack', 'use_item', 'defend'),
          inputFrequency: fc.integer({ min: 1, max: 20 }), // inputs per second
          direction: fc.constantFrom('north', 'south', 'east', 'west')
        }),

        (loadScenario, inputScenario) => {
          // Simulate high system load
          simulateSystemLoad(loadScenario);

          // Measure input response times under load
          const inputResponseTimes: number[] = [];
          const maxInputResponseTime = 100; // 100ms requirement from constants

          // Generate multiple input events
          for (let i = 0; i < inputScenario.inputFrequency; i++) {
            const startTime = performance.now();
            
            // Queue player action
            gameEngine.queueAction({
              type: inputScenario.inputType as any,
              direction: inputScenario.direction as any,
              timestamp: Date.now()
            });

            // Process input immediately to measure response time
            gameEngine.getGameState();
            const endTime = performance.now();
            
            const responseTime = endTime - startTime;
            inputResponseTimes.push(responseTime);
          }

          // Verify all input responses are within acceptable limits
          const allResponsesWithinLimit = inputResponseTimes.every(
            time => time <= maxInputResponseTime
          );

          // Verify systems are properly throttled under load
          const aiShouldBeThrottled = performanceManager.shouldThrottleSystem('aiMentor');
          const visualShouldBeThrottled = performanceManager.shouldThrottleSystem('visualAdaptation');
          const combatShouldBeThrottled = performanceManager.shouldThrottleSystem('combatAnalysis');

          // Under high load, non-critical systems should be throttled
          const highLoad = loadScenario.aiProcessingIntensity > 7 || 
                          loadScenario.simultaneousOperations > 4;

          if (highLoad) {
            // At least some AI systems should be throttled under high load
            const someSystemsThrottled = aiShouldBeThrottled || 
                                       visualShouldBeThrottled || 
                                       combatShouldBeThrottled;
            
            expect(someSystemsThrottled).toBe(true);
          }

          // Critical systems (input, gameLogic) should never be throttled
          const inputShouldBeThrottled = performanceManager.shouldThrottleSystem('input');
          const gameLogicShouldBeThrottled = performanceManager.shouldThrottleSystem('gameLogic');
          
          expect(inputShouldBeThrottled).toBe(false);
          expect(gameLogicShouldBeThrottled).toBe(false);

          // Main assertion: gameplay responsiveness maintained
          expect(allResponsesWithinLimit).toBe(true);

          // Additional assertion: average response time should be reasonable
          const averageResponseTime = inputResponseTimes.reduce((a, b) => a + b, 0) / inputResponseTimes.length;
          expect(averageResponseTime).toBeLessThan(maxInputResponseTime * 0.8); // 80ms average
        }
      ),
      { 
        numRuns: 100,
        timeout: 5000,
        verbose: false
      }
    );
  });

  test('Property 16: System prioritization works correctly under load', () => {
    fc.assert(
      fc.property(
        fc.record({
          systemLoad: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
          frameTime: fc.float({ min: Math.fround(10), max: Math.fround(50) }) // milliseconds
        }),

        (scenario) => {
          // Simulate performance conditions
          performanceManager.recordFrameTime(scenario.frameTime);

          // Get system budgets under different load conditions
          const inputBudget = performanceManager.getSystemBudget('input');
          const gameLogicBudget = performanceManager.getSystemBudget('gameLogic');
          const aiMentorBudget = performanceManager.getSystemBudget('aiMentor');

          // Critical systems should always have adequate budget
          expect(inputBudget).toBeGreaterThan(0);
          expect(gameLogicBudget).toBeGreaterThan(0);

          // Under high load, non-critical systems should have reduced budgets
          if (scenario.systemLoad > 0.8 || scenario.frameTime > 25) {
            // AI systems should have reduced budgets under high load
            expect(aiMentorBudget).toBeLessThanOrEqual(50); // AI_PROCESSING_THROTTLE_TIME
          }

          // System budgets should be positive and reasonable
          expect(inputBudget).toBeGreaterThan(0);
          expect(gameLogicBudget).toBeGreaterThan(0);
          expect(aiMentorBudget).toBeGreaterThan(0);
          
          // Critical systems should have at least some minimum budget
          expect(inputBudget).toBeGreaterThanOrEqual(3); // Minimum for input processing
          expect(gameLogicBudget).toBeGreaterThanOrEqual(5); // Minimum for game logic

          // Performance metrics should be tracked
          const metrics = performanceManager.getPerformanceMetrics();
          expect(metrics.averageFrameTime).toBeGreaterThan(0);
          expect(metrics.systemLoad).toBeGreaterThanOrEqual(0);
          expect(metrics.systemLoad).toBeLessThanOrEqual(1);
        }
      ),
      { 
        numRuns: 100,
        timeout: 5000
      }
    );
  });

  test('Property 16: Adaptive settings respond to performance pressure', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 16, max: 100 }), { minLength: 10, maxLength: 60 }),

        (frameTimeSeries) => {
          // Simulate a series of frame times
          frameTimeSeries.forEach(frameTime => {
            performanceManager.recordFrameTime(frameTime);
          });

          const adaptiveSettings = performanceManager.getAdaptiveSettings();
          const avgFrameTime = frameTimeSeries.reduce((a, b) => a + b, 0) / frameTimeSeries.length;
          const targetFrameTime = 1000 / 60; // ~16.67ms

          // Verify adaptive settings exist and are reasonable
          expect(adaptiveSettings).toBeDefined();
          expect(typeof adaptiveSettings.aiProcessingEnabled).toBe('boolean');
          expect(typeof adaptiveSettings.visualEffectsEnabled).toBe('boolean');
          expect(['low', 'medium', 'high']).toContain(adaptiveSettings.animationQuality);
          expect(typeof adaptiveSettings.renderOptimizations).toBe('boolean');

          // Under severe performance pressure, some optimizations should be active
          if (avgFrameTime > targetFrameTime * 2) { // 33ms threshold - severe
            expect(
              !adaptiveSettings.aiProcessingEnabled || 
              adaptiveSettings.renderOptimizations ||
              adaptiveSettings.animationQuality !== 'high'
            ).toBe(true);
          }

          // Under good performance, at least some features should be enabled
          if (avgFrameTime <= targetFrameTime * 1.1) { // 18ms threshold - good performance
            expect(
              adaptiveSettings.aiProcessingEnabled || 
              adaptiveSettings.visualEffectsEnabled ||
              adaptiveSettings.animationQuality === 'high'
            ).toBe(true);
          }
        }
      ),
      { 
        numRuns: 100,
        timeout: 5000
      }
    );
  });

  // Helper function to simulate system load
  function simulateSystemLoad(loadScenario: any): void {
    // Simulate AI processing load
    for (let i = 0; i < loadScenario.aiProcessingIntensity; i++) {
      performanceManager.startSystemTimer('aiMentor');
      
      // Simulate AI work
      const gameState = gameEngine.getGameState();
      aiMentor.generateHint(gameState);
      
      performanceManager.endSystemTimer('aiMentor');
    }

    // Simulate visual adaptation load
    for (let i = 0; i < loadScenario.visualAdaptationLoad; i++) {
      performanceManager.startSystemTimer('visualAdaptation');
      
      // Simulate visual adaptation work
      visualAdapter.assessPerformanceLevel();
      visualAdapter.adaptUIComplexity();
      
      performanceManager.endSystemTimer('visualAdaptation');
    }

    // Simulate combat analysis load
    for (let i = 0; i < loadScenario.combatAnalysisComplexity; i++) {
      performanceManager.startSystemTimer('combatAnalysis');
      
      // Simulate combat analysis work (create minimal combat log)
      const mockCombatLog = [{
        turnNumber: 1,
        playerAction: { type: 'attack' as const, timestamp: Date.now() },
        enemyActions: [{ type: 'attack' as const, timestamp: Date.now() }],
        combatResults: [{ 
          playerDamageDealt: 10, 
          playerDamageTaken: 5, 
          enemyDamageDealt: 5, 
          enemyDamageTaken: 10,
          enemyDefeated: false,
          playerDefeated: false,
          experienceGained: 10,
          combatEnded: false
        }],
        gameStateAfter: gameEngine.getGameState()
      }];
      
      combatAnalysis.analyzeCombat(mockCombatLog, 1000, 'victory');
      
      performanceManager.endSystemTimer('combatAnalysis');
    }

    // Record high frame time to simulate load
    const simulatedFrameTime = 16.67 + (loadScenario.simultaneousOperations * 5);
    performanceManager.recordFrameTime(simulatedFrameTime);
  }
});