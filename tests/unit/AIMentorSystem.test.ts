import { AIMentorSystem } from '../../src/ai/AIMentorSystem';
import { PlayerProfile } from '../../src/player/PlayerProfile';
import { GameState, PlayerAction } from '../../src/types/GameTypes';

describe('AIMentorSystem', () => {
  let aiMentor: AIMentorSystem;
  let testProfile: PlayerProfile;
  let testGameState: GameState;

  beforeEach(() => {
    aiMentor = new AIMentorSystem();
    
    testProfile = new PlayerProfile('test-player');
    testProfile.skillLevel = 'intermediate';
    testProfile.behaviorPatterns = {
      combatStyle: 'balanced',
      riskTolerance: 0.5,
      resourceManagement: 'moderate',
      explorationPattern: 'efficient'
    };
    testProfile.preferences = {
      uiComplexity: 'standard',
      colorScheme: 'classic',
      hintFrequency: 'moderate'
    };
    testProfile.statistics = {
      totalPlayTime: 1000,
      combatsWon: 10,
      combatsLost: 5,
      averageEfficiency: 0.7,
      dungeonsCleaned: 2,
      itemsFound: 50,
      secretsDiscovered: 3,
      lastUpdated: new Date()
    };

    testGameState = {
      dungeon: {
        rooms: [{
          id: 'room1',
          position: { x: 0, y: 0 },
          width: 10,
          height: 10,
          type: 'normal',
          items: [],
          enemies: [],
          connections: []
        }],
        corridors: [],
        width: 50,
        height: 50
      },
      player: {
        id: 'player1',
        position: { x: 5, y: 5 },
        health: 100,
        maxHealth: 100,
        level: 1,
        experience: 0,
        inventory: [],
        equipment: {},
        stats: { strength: 10, defense: 10, agility: 10, intelligence: 10 }
      },
      enemies: [],
      items: [],
      currentRoom: 'room1',
      gameTime: 1000,
      difficulty: 'medium',
      isInCombat: false,
      turnNumber: 1
    };
  });

  describe('initialization', () => {
    test('should initialize with a player profile', () => {
      aiMentor.initialize(testProfile);
      
      const retrievedProfile = aiMentor.getPlayerProfile();
      expect(retrievedProfile).toEqual(testProfile);
    });

    test('should start with empty action history', () => {
      aiMentor.initialize(testProfile);
      
      const history = aiMentor.getActionHistory();
      expect(history).toEqual([]);
    });
  });

  describe('action analysis', () => {
    beforeEach(() => {
      aiMentor.initialize(testProfile);
    });

    test('should record player actions in history', () => {
      const action: PlayerAction = {
        type: 'move',
        direction: 'north',
        timestamp: Date.now()
      };

      aiMentor.analyzePlayerAction(action, testGameState);
      
      const history = aiMentor.getActionHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(action);
    });

    test('should update player profile timestamp when analyzing actions', () => {
      const initialTimestamp = testProfile.statistics.lastUpdated.getTime();
      
      const action: PlayerAction = {
        type: 'attack',
        timestamp: Date.now()
      };

      aiMentor.analyzePlayerAction(action, testGameState);
      
      const updatedProfile = aiMentor.getPlayerProfile();
      expect(updatedProfile!.statistics.lastUpdated.getTime()).toBeGreaterThanOrEqual(initialTimestamp);
    });

    test('should limit action history size', () => {
      // Add more actions than the max history size (1000)
      for (let i = 0; i < 1050; i++) {
        const action: PlayerAction = {
          type: 'move',
          timestamp: Date.now() + i
        };
        aiMentor.analyzePlayerAction(action, testGameState);
      }
      
      const history = aiMentor.getActionHistory();
      expect(history).toHaveLength(1000);
    });
  });

  describe('hint generation', () => {
    beforeEach(() => {
      aiMentor.initialize(testProfile);
    });

    test('should not generate hints when frequency is never', () => {
      const neverProfile = new PlayerProfile('never-test-player');
      Object.assign(neverProfile, testProfile);
      neverProfile.preferences = {
        ...testProfile.preferences,
        hintFrequency: 'never' as const
      };
      
      aiMentor.initialize(neverProfile);
      
      // Try multiple times to ensure no hints are generated
      for (let i = 0; i < 10; i++) {
        const hint = aiMentor.generateHint(testGameState);
        expect(hint).toBeNull();
      }
    });

    test('should generate hints with proper structure when available', () => {
      const constantProfile = new PlayerProfile('constant-test-player');
      Object.assign(constantProfile, testProfile);
      constantProfile.preferences = {
        ...testProfile.preferences,
        hintFrequency: 'constant' as const
      };
      
      aiMentor.initialize(constantProfile);
      
      // Try multiple times to get a hint (due to randomness)
      let hint = null;
      for (let i = 0; i < 50 && !hint; i++) {
        hint = aiMentor.generateHint(testGameState);
      }
      
      if (hint) {
        expect(hint).toHaveProperty('id');
        expect(hint).toHaveProperty('message');
        expect(hint).toHaveProperty('type');
        expect(hint).toHaveProperty('urgency');
        expect(hint).toHaveProperty('context');
        expect(hint).toHaveProperty('showDuration');
        
        expect(['tactical', 'strategic', 'warning', 'tip']).toContain(hint.type);
        expect(['low', 'medium', 'high']).toContain(hint.urgency);
        expect(hint.showDuration).toBeGreaterThan(0);
      }
    });
  });

  describe('profile updates', () => {
    beforeEach(() => {
      aiMentor.initialize(testProfile);
    });

    test('should update combat style through direct profile update', () => {
      aiMentor.updatePlayerProfile({ combatStyle: 'aggressive' });
      
      const updatedProfile = aiMentor.getPlayerProfile();
      expect(updatedProfile!.behaviorPatterns.combatStyle).toBe('aggressive');
    });

    test('should update risk tolerance through direct profile update', () => {
      aiMentor.updatePlayerProfile({ riskTolerance: 0.8 });
      
      const updatedProfile = aiMentor.getPlayerProfile();
      expect(updatedProfile!.behaviorPatterns.riskTolerance).toBe(0.8);
    });

    test('should update multiple patterns at once', () => {
      aiMentor.updatePlayerProfile({
        combatStyle: 'defensive',
        resourceManagement: 'conservative'
      });
      
      const updatedProfile = aiMentor.getPlayerProfile();
      expect(updatedProfile!.behaviorPatterns.combatStyle).toBe('defensive');
      expect(updatedProfile!.behaviorPatterns.resourceManagement).toBe('conservative');
    });
  });

  describe('learning control', () => {
    beforeEach(() => {
      aiMentor.initialize(testProfile);
    });

    test('should allow disabling learning', () => {
      aiMentor.setLearningEnabled(false);
      
      const action: PlayerAction = {
        type: 'attack',
        timestamp: Date.now()
      };

      aiMentor.analyzePlayerAction(action, testGameState);
      
      // Action should not be recorded when learning is disabled
      const history = aiMentor.getActionHistory();
      expect(history).toHaveLength(0);
    });

    test('should allow clearing history', () => {
      // Add some actions
      for (let i = 0; i < 5; i++) {
        const action: PlayerAction = {
          type: 'move',
          timestamp: Date.now() + i
        };
        aiMentor.analyzePlayerAction(action, testGameState);
      }
      
      expect(aiMentor.getActionHistory()).toHaveLength(5);
      
      aiMentor.clearHistory();
      expect(aiMentor.getActionHistory()).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    test('should handle initialization without profile gracefully', () => {
      const action: PlayerAction = {
        type: 'move',
        timestamp: Date.now()
      };

      // Should not throw when no profile is initialized
      expect(() => {
        aiMentor.analyzePlayerAction(action, testGameState);
      }).not.toThrow();
      
      expect(() => {
        aiMentor.generateHint(testGameState);
      }).not.toThrow();
    });

    test('should return null when getting profile before initialization', () => {
      const profile = aiMentor.getPlayerProfile();
      expect(profile).toBeNull();
    });
  });
});