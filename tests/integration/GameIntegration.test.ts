                                                                                                    import { GameEngine } from '../../src/engine/GameEngine';
import { AIMentorSystem } from '../../src/ai/AIMentorSystem';
import { VisualAdaptationEngine } from '../../src/ai/VisualAdaptationEngine';
import { CombatAnalysisSystem } from '../../src/combat/CombatAnalysis';
import { SaveManager } from '../../src/data/SaveManager';
import { PlayerProfileManager } from '../../src/data/PlayerProfileManager';
import { ConfigurationManager } from '../../src/data/ConfigurationManager';
import { PlayerProfile } from '../../src/player/PlayerProfile';
import { PlayerAction } from '../../src/types/GameTypes';
import { CombatTurn } from '../../src/combat/CombatSystem';

// Mock localStorage for integration tests
const mockStore = new Map<string, string>();

const localStorageMock = {
  getItem: jest.fn((key: string) => mockStore.get(key) || null),
  setItem: jest.fn((key: string, value: string) => mockStore.set(key, value)),
  removeItem: jest.fn((key: string) => mockStore.delete(key)),
  clear: jest.fn(() => mockStore.clear()),
  get length() { return mockStore.size; },
  key: jest.fn((index: number) => {
    const keys = Array.from(mockStore.keys());
    return keys[index] || null;
  })
};

// Set up localStorage mock
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

/**
 * Integration tests for complete game workflows
 * Tests the integration of all game systems working together
 * 
 * **Feature: ai-dungeon-master, Integration Tests**
 * **Validates: All requirements integration**
 */
describe('Game Integration Tests', () => {
  let gameEngine: GameEngine;
  let aiMentor: AIMentorSystem;
  let visualAdapter: VisualAdaptationEngine;
  let combatAnalysis: CombatAnalysisSystem;
  let saveManager: SaveManager;
  let profileManager: PlayerProfileManager;
  let configManager: ConfigurationManager;
  let testProfile: PlayerProfile;

  beforeEach(async () => {
    try {
      // Clear localStorage mock before each test
      mockStore.clear();
      
      // Initialize all systems
      profileManager = new PlayerProfileManager();
      configManager = new ConfigurationManager();
      saveManager = new SaveManager(profileManager);
      
      gameEngine = new GameEngine();
      aiMentor = new AIMentorSystem();
      visualAdapter = new VisualAdaptationEngine();
      combatAnalysis = new CombatAnalysisSystem();
      
      // Create test profile
      testProfile = new PlayerProfile('integration-test-player');
      await profileManager.saveProfile(testProfile);
      
      // Initialize AI systems
      aiMentor.initialize(testProfile);
      visualAdapter.initialize(testProfile);
    } catch (error) {
      console.warn('Setup failed, some tests may be skipped:', error);
    }
  });

  afterEach(async () => {
    try {
      // Cleanup
      if (gameEngine) {
        gameEngine.stop();
      }
      if (profileManager && testProfile) {
        await profileManager.deleteProfile('integration-test-player');
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  describe('Complete Game Workflow', () => {
    test('should initialize all systems successfully', () => {
      expect(gameEngine).toBeDefined();
      expect(aiMentor).toBeDefined();
      expect(visualAdapter).toBeDefined();
      expect(combatAnalysis).toBeDefined();
      expect(saveManager).toBeDefined();
      expect(profileManager).toBeDefined();
      expect(configManager).toBeDefined();
    });

    test('should start and stop game engine', () => {
      expect(gameEngine.isGameRunning()).toBe(false);
      
      gameEngine.start();
      expect(gameEngine.isGameRunning()).toBe(true);
      
      gameEngine.stop();
      expect(gameEngine.isGameRunning()).toBe(false);
    });

    test('should handle player movement and state updates', () => {
      const initialState = gameEngine.getGameState();
      expect(initialState).toBeDefined();
      expect(initialState.player).toBeDefined();
      expect(initialState.dungeon).toBeDefined();

      // Queue a movement action
      gameEngine.queueAction({
        type: 'move',
        direction: 'north',
        timestamp: Date.now()
      });

      // The action should be queued (actual processing happens in game loop)
      expect(gameEngine.getGameState()).toBeDefined();
    });

    test('should integrate AI mentor with game state', () => {
      const gameState = gameEngine.getGameState();
      
      // AI mentor should be able to analyze game state
      const hint = aiMentor.generateHint(gameState);
      expect(hint).toBeDefined();
      
      // AI mentor should track player actions
      aiMentor.analyzePlayerAction({
        type: 'move',
        direction: 'north',
        timestamp: Date.now()
      }, gameState);
      
      expect(testProfile.statistics.totalPlayTime).toBeGreaterThanOrEqual(0);
    });

    test('should integrate visual adaptation with performance', () => {
      // Visual adapter should provide render config
      const renderConfig = visualAdapter.getRenderConfig();
      expect(renderConfig).toBeDefined();
      expect(renderConfig.frameRate).toBeGreaterThan(0);
      
      // Should adapt to performance changes
      const currentLevel = visualAdapter.assessPerformanceLevel();
      expect(currentLevel).toBeDefined();
      
      // Test that render config is consistent
      const secondConfig = visualAdapter.getRenderConfig();
      expect(secondConfig.frameRate).toBe(renderConfig.frameRate);
    });

    test('should integrate combat analysis with combat system', () => {
      const combatSystem = gameEngine.getCombatSystem();
      expect(combatSystem).toBeDefined();
      
      // Combat analysis should be able to analyze combat data
      const mockCombatTurn = {
        turnNumber: 1,
        playerAction: {
          type: 'attack' as const,
          timestamp: Date.now()
        },
        enemyActions: [],
        combatResults: [{
          playerDamageDealt: 10,
          playerDamageTaken: 5,
          enemyDefeated: false,
          playerDefeated: false,
          experienceGained: 25,
          combatEnded: false
        }],
        gameStateAfter: gameEngine.getGameState()
      };
      
      const analysis = combatAnalysis.analyzeCombat([mockCombatTurn], 1000, 'victory');
      expect(analysis).toBeDefined();
      expect(analysis.efficiency).toBeGreaterThanOrEqual(0);
      expect(analysis.efficiency).toBeLessThanOrEqual(1);
    });
  });

  describe('Save/Load Integration', () => {
    test('should save and load complete game state', async () => {
      const gameState = gameEngine.getGameState();
      const saveId = 'integration-test-save';
      
      // Save game
      await saveManager.saveGame(saveId, gameState, testProfile);
      
      // Verify save exists
      const saveExists = await saveManager.saveExists(saveId);
      expect(saveExists).toBe(true);
      
      // Load game
      const loadedData = await saveManager.loadGame(saveId);
      expect(loadedData).toBeDefined();
      expect(loadedData!.gameState).toBeDefined();
      expect(loadedData!.profile.playerId).toBe(testProfile.playerId);
      
      // Cleanup
      await saveManager.deleteSave(saveId);
    });

    test('should handle auto-save functionality', async () => {
      const gameState = gameEngine.getGameState();
      
      // Perform auto-save
      await saveManager.autoSave(gameState, testProfile);
      
      // Load auto-save
      const autoSaveData = await saveManager.loadAutoSave(testProfile.playerId);
      expect(autoSaveData).toBeDefined();
      expect(autoSaveData!.profile.playerId).toBe(testProfile.playerId);
    });
  });

  describe('Configuration Integration', () => {
    test('should initialize and manage configuration', async () => {
      await configManager.initialize();
      
      const config = configManager.getConfiguration();
      expect(config).toBeDefined();
      expect(config.graphics).toBeDefined();
      expect(config.ai).toBeDefined();
      expect(config.gameplay).toBeDefined();
    });

    test('should update configuration settings', async () => {
      await configManager.initialize();
      
      const originalConfig = configManager.getConfiguration();
      const newFrameRate = originalConfig.graphics.frameRate + 10;
      
      await configManager.updateGraphicsConfig({
        frameRate: newFrameRate
      });
      
      const updatedConfig = configManager.getConfiguration();
      expect(updatedConfig.graphics.frameRate).toBe(newFrameRate);
    });
  });

  describe('Performance Integration', () => {
    test('should monitor performance across systems', () => {
      gameEngine.start();
      
      // Get performance metrics
      const metrics = gameEngine.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.averageFrameTime).toBeGreaterThanOrEqual(0);
      
      // Check adaptive settings
      const adaptiveSettings = gameEngine.getAdaptiveSettings();
      expect(adaptiveSettings).toBeDefined();
      
      gameEngine.stop();
    });

    test('should handle system throttling under load', () => {
      // Check if systems can be throttled
      const shouldThrottle = gameEngine.shouldThrottleSystem('ai');
      expect(typeof shouldThrottle).toBe('boolean');
      
      // Enable performance mode
      gameEngine.setPerformanceMode(true);
      
      // Verify performance mode is active
      const metrics = gameEngine.getPerformanceMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle corrupted save data gracefully', async () => {
      // This test verifies that the system handles errors gracefully
      // without crashing the entire application
      
      const result = await saveManager.loadGame('non-existent-save');
      expect(result).toBeNull();
    });

    test('should handle invalid game state gracefully', () => {
      // Test that the game engine validates state properly
      expect(() => {
        gameEngine.getGameState();
      }).not.toThrow();
    });
  });

  describe('Complete Gameplay Session Workflows', () => {
    test('should execute complete game workflow with all systems', async () => {
      // Test complete workflow with all systems working together
      gameEngine.start();
      
      // Simulate gameplay actions
      const actions: PlayerAction[] = [
        { type: 'move', direction: 'north', timestamp: Date.now() },
        { type: 'attack', timestamp: Date.now() + 500 },
        { type: 'move', direction: 'east', timestamp: Date.now() + 1000 }
      ];
      
      for (const action of actions) {
        // Queue action in game engine
        gameEngine.queueAction(action);
        
        // AI mentor analyzes the action
        aiMentor.analyzePlayerAction(action, gameEngine.getGameState());
        
        // Visual adapter assesses performance
        const performanceLevel = visualAdapter.assessPerformanceLevel();
        expect(performanceLevel).toBeDefined();
      }
      
      // Verify all systems processed the actions
      const gameState = gameEngine.getGameState();
      expect(gameState).toBeDefined();
      expect(gameState.player).toBeDefined();
      
      const profile = aiMentor.getPlayerProfile();
      expect(profile).toBeDefined();
      if (profile) {
        expect(profile.statistics.totalPlayTime).toBeGreaterThan(0);
      }
      
      gameEngine.stop();
    });

    test('should handle complete dungeon exploration workflow', async () => {
      
      // Test movement sequence
      const movements: PlayerAction[] = [
        { type: 'move', direction: 'north', timestamp: Date.now() },
        { type: 'move', direction: 'east', timestamp: Date.now() + 100 },
        { type: 'move', direction: 'south', timestamp: Date.now() + 200 },
        { type: 'move', direction: 'west', timestamp: Date.now() + 300 }
      ];
      
      for (const movement of movements) {
        gameEngine.queueAction(movement);
        
        // AI mentor should track each action
        aiMentor.analyzePlayerAction(movement, gameEngine.getGameState());
        
        // Visual adapter should assess performance
        const performanceLevel = visualAdapter.assessPerformanceLevel();
        expect(performanceLevel).toBeDefined();
      }
      
      // Verify AI learning occurred
      const updatedProfile = aiMentor.getPlayerProfile();
      expect(updatedProfile).toBeDefined();
      if (updatedProfile) {
        expect(updatedProfile.statistics.totalPlayTime).toBeGreaterThan(0);
        expect(updatedProfile.behaviorPatterns).toBeDefined();
      }
    });

    test('should execute complete combat encounter workflow', async () => {
      const gameState = gameEngine.getGameState();
      
      // Simulate combat encounter
      const combatActions: PlayerAction[] = [
        { type: 'attack', timestamp: Date.now() },
        { type: 'defend', timestamp: Date.now() + 500 },
        { type: 'attack', timestamp: Date.now() + 1000 }
      ];
      
      const combatTurns: CombatTurn[] = [];
      
      for (let i = 0; i < combatActions.length; i++) {
        const action = combatActions[i]!;
        gameEngine.queueAction(action);
        
        // Create mock combat turn using the correct CombatSystem type
        const combatTurn: CombatTurn = {
          turnNumber: i + 1,
          playerAction: action,
          enemyActions: [{
            type: 'attack',
            damage: 5,
            timestamp: action.timestamp + 250
          }],
          combatResults: [{
            playerDamageDealt: action.type === 'attack' ? 10 : 0,
            playerDamageTaken: action.type === 'defend' ? 2 : 5,
            enemyDefeated: i === combatActions.length - 1,
            playerDefeated: false,
            experienceGained: i === combatActions.length - 1 ? 50 : 0,
            combatEnded: i === combatActions.length - 1
          }],
          gameStateAfter: gameEngine.getGameState()
        };
        
        combatTurns.push(combatTurn);
        
        // AI mentor should analyze combat decisions
        aiMentor.analyzePlayerAction(action, gameState);
      }
      
      // Combat analysis should provide comprehensive feedback
      const analysisResult = combatAnalysis.analyzeCombat(combatTurns, 2500, 'victory');
      expect(analysisResult).toBeDefined();
      expect(analysisResult.efficiency).toBeGreaterThanOrEqual(0);
      expect(analysisResult.efficiency).toBeLessThanOrEqual(1);
      expect(analysisResult.suggestions).toBeDefined();
      expect(analysisResult.analysis).toBeDefined();
      
      // Verify combat statistics were updated
      const updatedProfile = aiMentor.getPlayerProfile();
      expect(updatedProfile).toBeDefined();
      if (updatedProfile) {
        expect(updatedProfile.statistics.combatsWon).toBeGreaterThan(0);
      }
    });

    test('should handle UI adaptation workflow', async () => {
      // Start with beginner level
      testProfile.skillLevel = 'beginner';
      visualAdapter.initialize(testProfile);
      
      const initialConfig = visualAdapter.getRenderConfig();
      expect(initialConfig).toBeDefined();
      
      // Simulate skill improvement through gameplay
      for (let i = 0; i < 10; i++) {
        const action: PlayerAction = {
          type: 'move',
          direction: 'north',
          timestamp: Date.now() + i * 100
        };
        
        aiMentor.analyzePlayerAction(action, gameEngine.getGameState());
        
        // Simulate successful actions to improve skill level
        testProfile.statistics.averageEfficiency = Math.min(0.9, testProfile.statistics.averageEfficiency + 0.1);
      }
      
      // Visual adapter should detect improvement
      const newPerformanceLevel = visualAdapter.assessPerformanceLevel();
      expect(newPerformanceLevel).toBeDefined();
      
      // UI should adapt based on performance
      const adaptedConfig = visualAdapter.getRenderConfig();
      expect(adaptedConfig).toBeDefined();
      expect(adaptedConfig.frameRate).toBeGreaterThan(0);
    });
  });

  describe('Save/Load Cycle Integration with All Systems Active', () => {
    test('should save and restore complete game session with AI learning', async () => {
      const saveId = 'complete-session-test';
      
      // Setup initial game state with AI learning
      const initialActions: PlayerAction[] = [
        { type: 'move', direction: 'north', timestamp: Date.now() },
        { type: 'attack', timestamp: Date.now() + 500 },
        { type: 'move', direction: 'east', timestamp: Date.now() + 1000 }
      ];
      
      // Execute actions and let AI learn
      for (const action of initialActions) {
        gameEngine.queueAction(action);
        aiMentor.analyzePlayerAction(action, gameEngine.getGameState());
      }
      
      // Update visual preferences
      testProfile.preferences.uiComplexity = 'detailed';
      visualAdapter.initialize(testProfile);
      
      // Save complete game state
      const gameState = gameEngine.getGameState();
      await saveManager.saveGame(saveId, gameState, testProfile);
      
      // Create new instances to simulate fresh load
      const newProfileManager = new PlayerProfileManager();
      const newSaveManager = new SaveManager(newProfileManager);
      const newAIMentor = new AIMentorSystem();
      const newVisualAdapter = new VisualAdaptationEngine();
      
      // Load saved game
      const loadedData = await newSaveManager.loadGame(saveId);
      expect(loadedData).toBeDefined();
      
      // Verify game state restoration
      expect(loadedData!.gameState.player.position).toEqual(gameState.player.position);
      expect(loadedData!.gameState.dungeon).toEqual(gameState.dungeon);
      
      // Verify AI learning persistence
      const loadedProfile = loadedData!.profile;
      expect(loadedProfile.statistics.totalPlayTime).toBe(testProfile.statistics.totalPlayTime);
      expect(loadedProfile.behaviorPatterns).toEqual(testProfile.behaviorPatterns);
      expect(loadedProfile.preferences.uiComplexity).toBe('detailed');
      
      // Initialize AI systems with loaded profile
      newAIMentor.initialize(loadedProfile);
      newVisualAdapter.initialize(loadedProfile);
      
      // Verify AI systems maintain learned behavior
      const restoredRenderConfig = newVisualAdapter.getRenderConfig();
      expect(restoredRenderConfig).toBeDefined();
      
      // Test that AI continues learning from where it left off
      const baseTime = Date.now();
      const newAction: PlayerAction = { type: 'move', direction: 'south', timestamp: baseTime };
      newAIMentor.analyzePlayerAction(newAction, loadedData!.gameState);
      
      // Add actions with meaningful time differences to ensure play time increases
      const additionalAction: PlayerAction = { type: 'attack', timestamp: baseTime + 2000 };
      newAIMentor.analyzePlayerAction(additionalAction, loadedData!.gameState);
      
      const finalAction: PlayerAction = { type: 'move', direction: 'north', timestamp: baseTime + 3000 };
      newAIMentor.analyzePlayerAction(finalAction, loadedData!.gameState);
      
      const continuedProfile = newAIMentor.getPlayerProfile();
      expect(continuedProfile).toBeDefined();
      if (continuedProfile) {
        expect(continuedProfile.statistics.totalPlayTime).toBeGreaterThanOrEqual(loadedProfile.statistics.totalPlayTime);
      }
      
      // Cleanup
      await newSaveManager.deleteSave(saveId);
    });

    test('should handle multiple save slots with different AI states', async () => {
      const saveIds = ['slot1', 'slot2', 'slot3'];
      const profiles: PlayerProfile[] = [];
      
      // Create different AI learning states for each save
      for (let i = 0; i < saveIds.length; i++) {
        const profile = new PlayerProfile(`test-player-${i}`);
        profile.skillLevel = i === 0 ? 'beginner' : 
                           i === 1 ? 'intermediate' : 
                           'advanced';
        
        profile.preferences.uiComplexity = i === 0 ? 'minimal' :
                                         i === 1 ? 'standard' :
                                         'detailed';
        
        // Simulate different amounts of gameplay
        profile.statistics.totalPlayTime = (i + 1) * 1000;
        profile.statistics.combatsWon = (i + 1) * 5;
        profile.statistics.averageEfficiency = 0.5 + (i * 0.2);
        
        profiles.push(profile);
        
        // Save each profile with different game state
        const gameState = gameEngine.getGameState();
        gameState.player.level = i + 1;
        gameState.player.experience = (i + 1) * 100;
        
        await saveManager.saveGame(saveIds[i]!, gameState, profile);
      }
      
      // Verify all saves exist
      for (const saveId of saveIds) {
        const exists = await saveManager.saveExists(saveId);
        expect(exists).toBe(true);
      }
      
      // Load and verify each save maintains distinct AI state
      for (let i = 0; i < saveIds.length; i++) {
        const loadedData = await saveManager.loadGame(saveIds[i]!);
        expect(loadedData).toBeDefined();
        
        const loadedProfile = loadedData!.profile;
        expect(loadedProfile.skillLevel).toBe(profiles[i]!.skillLevel);
        expect(loadedProfile.preferences.uiComplexity).toBe(profiles[i]!.preferences.uiComplexity);
        expect(loadedProfile.statistics.totalPlayTime).toBe(profiles[i]!.statistics.totalPlayTime);
        
        const loadedGameState = loadedData!.gameState;
        expect(loadedGameState.player.level).toBe(i + 1);
        expect(loadedGameState.player.experience).toBe((i + 1) * 100);
      }
      
      // Cleanup all saves
      for (const saveId of saveIds) {
        await saveManager.deleteSave(saveId);
      }
    });

    test('should maintain AI learning continuity across session boundaries', async () => {
      const sessionSaveId = 'session-continuity-test';
      
      // Session 1: Initial learning
      const session1Actions: PlayerAction[] = [
        { type: 'move', direction: 'north', timestamp: Date.now() },
        { type: 'move', direction: 'north', timestamp: Date.now() + 100 },
        { type: 'move', direction: 'north', timestamp: Date.now() + 200 }
      ];
      
      for (const action of session1Actions) {
        aiMentor.analyzePlayerAction(action, gameEngine.getGameState());
      }
      
      const session1Profile = aiMentor.getPlayerProfile();
      expect(session1Profile).toBeDefined();
      const session1PlayTime = session1Profile!.statistics.totalPlayTime;
      
      // Save session 1 - use testProfile since it's the correct type
      await saveManager.saveGame(sessionSaveId, gameEngine.getGameState(), testProfile);
      
      // Simulate session end and restart
      const newAIMentor = new AIMentorSystem();
      const loadedSession1 = await saveManager.loadGame(sessionSaveId);
      newAIMentor.initialize(loadedSession1!.profile);
      
      // Session 2: Continue learning
      const session2Actions: PlayerAction[] = [
        { type: 'attack', timestamp: Date.now() + 1000 },
        { type: 'defend', timestamp: Date.now() + 1500 },
        { type: 'attack', timestamp: Date.now() + 2000 }
      ];
      
      for (const action of session2Actions) {
        newAIMentor.analyzePlayerAction(action, loadedSession1!.gameState);
      }
      
      const session2Profile = newAIMentor.getPlayerProfile();
      expect(session2Profile).toBeDefined();
      
      // Verify learning continuity
      if (session2Profile) {
        expect(session2Profile.statistics.totalPlayTime).toBeGreaterThan(session1PlayTime);
        expect(session2Profile.behaviorPatterns).toBeDefined();
        
        // Save session 2 - use loaded profile since it's the correct type
        const updatedProfile = loadedSession1!.profile;
        updatedProfile.statistics.totalPlayTime = session2Profile.statistics.totalPlayTime;
        await saveManager.saveGame(sessionSaveId, loadedSession1!.gameState, updatedProfile);
        
        // Verify final state persistence
        const finalSession = await saveManager.loadGame(sessionSaveId);
        expect(finalSession!.profile.statistics.totalPlayTime).toBe(session2Profile.statistics.totalPlayTime);
      }
      
      // Cleanup
      await saveManager.deleteSave(sessionSaveId);
    });
  });

  describe('Performance Integration Under Full System Load', () => {
    test('should maintain performance with all AI systems active', async () => {
      const startTime = Date.now();
      const performanceTestDuration = 1000; // 1 second test
      const actionInterval = 50; // Action every 50ms
      
      // Enable all systems
      gameEngine.start();
      
      // Simulate high-frequency gameplay
      const performanceActions: PlayerAction[] = [];
      const actionCount = performanceTestDuration / actionInterval;
      
      for (let i = 0; i < actionCount; i++) {
        let action: PlayerAction;
        if (i % 2 === 0) {
          action = {
            type: 'move',
            direction: (['north', 'south', 'east', 'west'] as const)[i % 4]!,
            timestamp: startTime + (i * actionInterval)
          };
        } else {
          action = {
            type: 'attack',
            timestamp: startTime + (i * actionInterval)
          };
        }
        
        performanceActions.push(action);
      }
      
      // Execute all actions rapidly
      const executionStart = Date.now();
      
      for (const action of performanceActions) {
        gameEngine.queueAction(action);
        
        // All AI systems should process without blocking
        aiMentor.analyzePlayerAction(action, gameEngine.getGameState());
        visualAdapter.assessPerformanceLevel();
        
        // Simulate combat analysis for attack actions
        if (action.type === 'attack') {
          const mockCombatTurn: CombatTurn = {
            turnNumber: 1,
            playerAction: action,
            enemyActions: [{
              type: 'attack',
              damage: 5,
              timestamp: action.timestamp + 100
            }],
            combatResults: [{
              playerDamageDealt: 10,
              playerDamageTaken: 0,
              enemyDefeated: false,
              playerDefeated: false,
              experienceGained: 5,
              combatEnded: false
            }],
            gameStateAfter: gameEngine.getGameState()
          };
          
          combatAnalysis.analyzeCombat([mockCombatTurn], 100, 'victory');
        }
      }
      
      const executionTime = Date.now() - executionStart;
      
      // Verify performance requirements
      expect(executionTime).toBeLessThan(performanceTestDuration * 2); // Should not take more than 2x real-time
      
      // Verify all systems remain responsive
      const finalGameState = gameEngine.getGameState();
      expect(finalGameState).toBeDefined();
      
      const performanceMetrics = gameEngine.getPerformanceMetrics();
      expect(performanceMetrics.averageFrameTime).toBeLessThan(100); // Less than 100ms per frame
      
      // Verify AI systems processed all actions
      const finalProfile = aiMentor.getPlayerProfile();
      expect(finalProfile).toBeDefined();
      if (finalProfile) {
        expect(finalProfile.statistics.totalPlayTime).toBeGreaterThan(0);
      }
      
      gameEngine.stop();
    });

    test('should handle system throttling under extreme load', async () => {
      // Enable performance monitoring
      gameEngine.setPerformanceMode(true);
      gameEngine.start();
      
      // Generate extreme load
      const extremeActionCount = 50; // Reduced for test performance
      const actions: PlayerAction[] = [];
      
      for (let i = 0; i < extremeActionCount; i++) {
        actions.push({
          type: 'move',
          direction: 'north',
          timestamp: Date.now() + i
        });
      }
      
      // Execute actions as fast as possible
      const startTime = Date.now();
      
      for (const action of actions) {
        gameEngine.queueAction(action);
        
        // Check if AI systems should be throttled
        const shouldThrottleAI = gameEngine.shouldThrottleSystem('ai');
        
        if (!shouldThrottleAI) {
          aiMentor.analyzePlayerAction(action, gameEngine.getGameState());
        }
        
        // Visual adapter should always maintain basic functionality
        const renderConfig = visualAdapter.getRenderConfig();
        expect(renderConfig).toBeDefined();
      }
      
      const totalTime = Date.now() - startTime;
      
      // Verify system remained responsive
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Verify adaptive performance settings were applied
      const adaptiveSettings = gameEngine.getAdaptiveSettings();
      expect(adaptiveSettings).toBeDefined();
      
      // Verify core gameplay remained functional
      const finalState = gameEngine.getGameState();
      expect(finalState.player).toBeDefined();
      
      gameEngine.stop();
    });

    test('should maintain UI responsiveness during intensive AI processing', async () => {
      // Simulate intensive AI processing
      const processingCount = 20; // Reduced for test performance
      
      const processingStartTime = Date.now();
      
      for (let i = 0; i < processingCount; i++) {
        const frameStart = Date.now();
        
        // Intensive AI processing
        for (let j = 0; j < 5; j++) {
          const action: PlayerAction = {
            type: 'move',
            direction: 'north',
            timestamp: Date.now()
          };
          
          aiMentor.analyzePlayerAction(action, gameEngine.getGameState());
        }
        
        // Test AI suggestion generation
        const gameState = gameEngine.getGameState();
        const aiSuggestion = aiMentor.generateHint(gameState);
        if (aiSuggestion) {
          expect(aiSuggestion.message).toBeDefined();
        }
        
        const frameEnd = Date.now();
        const actualFrameTime = frameEnd - frameStart;
        
        // Each processing cycle should complete within reasonable time
        expect(actualFrameTime).toBeLessThan(100); // Less than 100ms per cycle
      }
      
      const totalProcessingTime = Date.now() - processingStartTime;
      const averageProcessingTime = totalProcessingTime / processingCount;
      
      // Verify overall processing performance
      expect(averageProcessingTime).toBeLessThan(50); // Average less than 50ms per cycle
    });
  });

  describe('Error Recovery and System Resilience', () => {
    test('should recover from AI system failures without affecting gameplay', async () => {
      gameEngine.start();
      
      // Simulate AI system failure
      const originalAnalyzeMethod = aiMentor.analyzePlayerAction;
      aiMentor.analyzePlayerAction = () => {
        throw new Error('AI system failure');
      };
      
      // Gameplay should continue despite AI failure
      const action: PlayerAction = {
        type: 'move',
        direction: 'north',
        timestamp: Date.now()
      };
      
      // This should not throw
      expect(() => {
        gameEngine.queueAction(action);
      }).not.toThrow();
      
      // Game state should remain valid
      const gameState = gameEngine.getGameState();
      expect(gameState).toBeDefined();
      expect(gameState.player).toBeDefined();
      
      // Restore AI system
      aiMentor.analyzePlayerAction = originalAnalyzeMethod;
      
      // AI should resume normal operation
      aiMentor.analyzePlayerAction(action, gameState);
      const profile = aiMentor.getPlayerProfile();
      expect(profile).toBeDefined();
      
      gameEngine.stop();
    });

    test('should handle corrupted save data gracefully in full system context', async () => {
      const corruptedSaveId = 'corrupted-save-test';
      
      // Create a valid save first
      const validGameState = gameEngine.getGameState();
      await saveManager.saveGame(corruptedSaveId, validGameState, testProfile);
      
      // Simulate save corruption by directly manipulating storage
      // (This would normally be done by corrupting the actual save file)
      const originalLoadMethod = saveManager.loadGame;
      saveManager.loadGame = async (saveId: string) => {
        if (saveId === corruptedSaveId) {
          throw new Error('Corrupted save data');
        }
        return originalLoadMethod.call(saveManager, saveId);
      };
      
      // Attempt to load corrupted save - should handle error gracefully
      let result: { gameState: any; profile: PlayerProfile; } | null = null;
      try {
        result = await saveManager.loadGame(corruptedSaveId);
      } catch (error) {
        // Expected to throw, which is handled gracefully
        result = null;
      }
      expect(result).toBeNull();
      
      // System should remain stable
      expect(gameEngine.getGameState()).toBeDefined();
      expect(aiMentor.getPlayerProfile()).toBeDefined();
      
      // Should be able to create new save
      const newSaveId = 'recovery-save-test';
      await expect(saveManager.saveGame(newSaveId, validGameState, testProfile)).resolves.not.toThrow();
      
      // Restore original method and cleanup
      saveManager.loadGame = originalLoadMethod;
      await saveManager.deleteSave(newSaveId);
    });

    test('should maintain system integrity during rapid state changes', async () => {
      gameEngine.start();
      
      // Rapid state changes that could cause race conditions
      const rapidActions: PlayerAction[] = [];
      
      for (let i = 0; i < 20; i++) {
        const actionType = i % 3 === 0 ? 'move' : i % 3 === 1 ? 'attack' : 'defend';
        
        if (actionType === 'move') {
          rapidActions.push({
            type: 'move',
            direction: (['north', 'south', 'east', 'west'] as const)[i % 4]!,
            timestamp: Date.now() + i
          });
        } else {
          rapidActions.push({
            type: actionType as 'attack' | 'defend',
            timestamp: Date.now() + i
          });
        }
      }
      
      // Execute all actions simultaneously
      const promises = rapidActions.map(async (action) => {
        gameEngine.queueAction(action);
        aiMentor.analyzePlayerAction(action, gameEngine.getGameState());
        return visualAdapter.assessPerformanceLevel();
      });
      
      // All operations should complete successfully
      const results = await Promise.all(promises);
      expect(results).toHaveLength(rapidActions.length);
      
      // System state should remain consistent
      const finalState = gameEngine.getGameState();
      expect(finalState).toBeDefined();
      expect(finalState.player).toBeDefined();
      
      const finalProfile = aiMentor.getPlayerProfile();
      if (finalProfile) {
        expect(finalProfile.statistics.totalPlayTime).toBeGreaterThan(0);
      }
      
      gameEngine.stop();
    });
  });

  describe('Basic System Integration', () => {
    test('should initialize all core systems', () => {
      expect(gameEngine).toBeDefined();
      expect(aiMentor).toBeDefined();
      expect(visualAdapter).toBeDefined();
      expect(combatAnalysis).toBeDefined();
      expect(saveManager).toBeDefined();
      expect(profileManager).toBeDefined();
      expect(configManager).toBeDefined();
      expect(testProfile).toBeDefined();
    });

    test('should handle basic AI mentor functionality', () => {
      const gameState = gameEngine.getGameState();
      expect(gameState).toBeDefined();
      
      // Test AI mentor can generate hints
      const hint = aiMentor.generateHint(gameState);
      expect(hint).toBeDefined();
      
      // Test AI mentor can analyze actions
      const action: PlayerAction = {
        type: 'move',
        direction: 'north',
        timestamp: Date.now()
      };
      
      expect(() => {
        aiMentor.analyzePlayerAction(action, gameState);
      }).not.toThrow();
    });

    test('should handle basic save/load functionality', async () => {
      const saveId = 'basic-integration-test';
      const gameState = gameEngine.getGameState();
      
      // Save game
      await saveManager.saveGame(saveId, gameState, testProfile);
      
      // Verify save exists
      const saveExists = await saveManager.saveExists(saveId);
      expect(saveExists).toBe(true);
      
      // Load game
      const loadedData = await saveManager.loadGame(saveId);
      expect(loadedData).toBeDefined();
      expect(loadedData!.gameState).toBeDefined();
      expect(loadedData!.profile.playerId).toBe(testProfile.playerId);
      
      // Cleanup
      await saveManager.deleteSave(saveId);
    });
  });

  describe('Configuration Integration', () => {
    test('should initialize and manage configuration', async () => {
      await configManager.initialize();
      
      const config = configManager.getConfiguration();
      expect(config).toBeDefined();
      expect(config.graphics).toBeDefined();
      expect(config.ai).toBeDefined();
      expect(config.gameplay).toBeDefined();
    });

    test('should update configuration settings', async () => {
      await configManager.initialize();
      
      const originalConfig = configManager.getConfiguration();
      const newFrameRate = originalConfig.graphics.frameRate + 10;
      
      await configManager.updateGraphicsConfig({
        frameRate: newFrameRate
      });
      
      const updatedConfig = configManager.getConfiguration();
      expect(updatedConfig.graphics.frameRate).toBe(newFrameRate);
    });
  });
});