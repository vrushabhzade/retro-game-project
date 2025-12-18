import { PlayerProfile } from '../../src/player/PlayerProfile';
import { PlayerAction } from '../../src/types/GameTypes';

describe('PlayerProfile', () => {
  let profile: PlayerProfile;

  beforeEach(() => {
    profile = new PlayerProfile('test-player');
  });

  describe('initialization', () => {
    it('should create a profile with default values', () => {
      expect(profile.playerId).toBe('test-player');
      expect(profile.skillLevel).toBe('beginner');
      expect(profile.behaviorPatterns.combatStyle).toBe('balanced');
      expect(profile.preferences.uiComplexity).toBe('standard');
      expect(profile.statistics.combatsWon).toBe(0);
    });

    it('should set creation and last played dates', () => {
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.lastPlayed).toBeInstanceOf(Date);
    });
  });

  describe('behavior tracking', () => {
    it('should update combat style from attack actions', () => {
      const action: PlayerAction = {
        type: 'attack',
        timestamp: Date.now()
      };

      profile.updateBehaviorFromAction(action, {});
      expect(profile.behaviorPatterns.combatStyle).toBe('aggressive');
    });

    it('should update combat style from defend actions', () => {
      const action: PlayerAction = {
        type: 'defend',
        timestamp: Date.now()
      };

      profile.updateBehaviorFromAction(action, {});
      expect(profile.behaviorPatterns.combatStyle).toBe('defensive');
    });

    it('should update risk tolerance based on health context', () => {
      const initialRiskTolerance = profile.behaviorPatterns.riskTolerance;
      
      const action: PlayerAction = {
        type: 'attack',
        timestamp: Date.now()
      };

      // Low health, risky attack should increase risk tolerance
      profile.updateBehaviorFromAction(action, {
        playerHealth: 20,
        enemyHealth: 100
      });

      expect(profile.behaviorPatterns.riskTolerance).toBeGreaterThan(initialRiskTolerance);
    });
  });

  describe('combat statistics', () => {
    it('should record combat wins correctly', () => {
      profile.recordCombatResult(true, 0.8);
      
      expect(profile.statistics.combatsWon).toBe(1);
      expect(profile.statistics.combatsLost).toBe(0);
      expect(profile.statistics.averageEfficiency).toBe(0.8);
    });

    it('should record combat losses correctly', () => {
      profile.recordCombatResult(false, 0.4);
      
      expect(profile.statistics.combatsWon).toBe(0);
      expect(profile.statistics.combatsLost).toBe(1);
      expect(profile.statistics.averageEfficiency).toBe(0.4);
    });

    it('should update skill level based on performance', () => {
      // Record multiple high-performance wins
      for (let i = 0; i < 5; i++) {
        profile.recordCombatResult(true, 0.9);
      }
      
      expect(profile.skillLevel).toBe('advanced');
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const json = profile.toJSON();
      
      expect(json.playerId).toBe('test-player');
      expect(json.skillLevel).toBe('beginner');
      expect(json.behaviorPatterns).toBeDefined();
      expect(json.preferences).toBeDefined();
      expect(json.statistics).toBeDefined();
    });

    it('should deserialize from JSON correctly', () => {
      const originalJson = profile.toJSON();
      const restored = PlayerProfile.fromJSON(originalJson);
      
      expect(restored.playerId).toBe(profile.playerId);
      expect(restored.skillLevel).toBe(profile.skillLevel);
      expect(restored.behaviorPatterns).toEqual(profile.behaviorPatterns);
      expect(restored.preferences).toEqual(profile.preferences);
      expect(restored.statistics).toEqual(profile.statistics);
    });
  });

  describe('exploration tracking', () => {
    it('should record dungeon completion', () => {
      profile.recordExplorationEvent('dungeon_cleared');
      expect(profile.statistics.dungeonsCleaned).toBe(1);
    });

    it('should record item discovery', () => {
      profile.recordExplorationEvent('item_found');
      expect(profile.statistics.itemsFound).toBe(1);
    });

    it('should record secret discovery', () => {
      profile.recordExplorationEvent('secret_discovered');
      expect(profile.statistics.secretsDiscovered).toBe(1);
    });
  });

  describe('play time tracking', () => {
    it('should update play time correctly', () => {
      const initialTime = profile.statistics.totalPlayTime;
      profile.updatePlayTime(1000);
      
      expect(profile.statistics.totalPlayTime).toBe(initialTime + 1000);
    });
  });
});