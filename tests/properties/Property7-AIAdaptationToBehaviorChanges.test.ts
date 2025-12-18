import * as fc from 'fast-check';
import { AIMentorSystem } from '../../src/ai/AIMentorSystem';
import { BehaviorPatterns } from '../../src/types/AITypes';
import { PlayerProfile } from '../../src/player/PlayerProfile';
import { GameState, PlayerAction } from '../../src/types/GameTypes';

/**
 * Feature: ai-dungeon-master, Property 7: AI Adaptation to Behavior Changes
 * 
 * For any significant change in player behavior patterns, the AI mentor system 
 * should adjust its guidance strategy within a reasonable number of subsequent interactions.
 * 
 * Validates: Requirements 2.5
 */

// Helper functions to create test data
const createTestProfile = (
  combatStyle: 'aggressive' | 'defensive' | 'balanced' | 'tactical' = 'balanced',
  riskTolerance = 0.5,
  resourceManagement: 'conservative' | 'moderate' | 'liberal' = 'moderate',
  explorationPattern: 'thorough' | 'efficient' | 'cautious' | 'bold' = 'efficient'
): PlayerProfile => {
  const profile = new PlayerProfile('test-player');
  profile.skillLevel = 'intermediate';
  profile.behaviorPatterns = {
    combatStyle,
    riskTolerance,
    resourceManagement,
    explorationPattern
  };
  profile.preferences = {
    uiComplexity: 'standard',
    colorScheme: 'classic',
    hintFrequency: 'moderate'
  };
  profile.statistics = {
    totalPlayTime: 1000,
    combatsWon: 10,
    combatsLost: 5,
    averageEfficiency: 0.7,
    dungeonsCleaned: 2,
    itemsFound: 50,
    secretsDiscovered: 3,
    lastUpdated: new Date()
  };
  return profile;
};

const createTestGameState = (isInCombat = false, playerHealth = 100): GameState => ({
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
    health: playerHealth,
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
  isInCombat,
  turnNumber: 1
});

describe('Property 7: AI Adaptation to Behavior Changes', () => {
  test('AI mentor adapts combat style when player changes from defensive to aggressive behavior', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 30 }),
        (actionCount: number) => {
          const aiMentor = new AIMentorSystem();
          const defensiveProfile = createTestProfile('defensive', 0.2);
          const combatGameState = createTestGameState(true);
          
          aiMentor.initialize(defensiveProfile);
          
          const initialCombatStyle = aiMentor.getPlayerProfile()!.behaviorPatterns.combatStyle;
          expect(initialCombatStyle).toBe('defensive');
          
          // Simulate a series of aggressive combat actions
          for (let i = 0; i < actionCount; i++) {
            const action: PlayerAction = {
              type: 'attack',
              target: { x: 10, y: 10 },
              timestamp: Date.now() + i
            };
            aiMentor.analyzePlayerAction(action, combatGameState);
          }
          
          const updatedProfile = aiMentor.getPlayerProfile();
          expect(updatedProfile).not.toBeNull();
          
          // Combat style should have adapted to aggressive behavior
          expect(updatedProfile!.behaviorPatterns.combatStyle).toBe('aggressive');
          
          // Timestamp should be updated or at least not be older
          expect(updatedProfile!.statistics.lastUpdated.getTime())
            .toBeGreaterThanOrEqual(defensiveProfile.statistics.lastUpdated.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  test('AI mentor adapts risk tolerance when player behavior changes significantly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 20 }),
        (actionCount: number) => {
          const aiMentor = new AIMentorSystem();
          const lowRiskProfile = createTestProfile('balanced', 0.1);
          const lowHealthGameState = createTestGameState(false, 20);
          
          aiMentor.initialize(lowRiskProfile);
          
          const initialRiskTolerance = aiMentor.getPlayerProfile()!.behaviorPatterns.riskTolerance;
          expect(initialRiskTolerance).toBe(0.1);
          
          // Simulate risky behavior: attacking at low health repeatedly
          for (let i = 0; i < actionCount; i++) {
            const action: PlayerAction = {
              type: 'attack',
              target: { x: 10, y: 10 },
              timestamp: Date.now() + i
            };
            aiMentor.analyzePlayerAction(action, lowHealthGameState);
          }
          
          const updatedProfile = aiMentor.getPlayerProfile();
          expect(updatedProfile).not.toBeNull();
          
          // Risk tolerance should have increased due to risky behavior
          expect(updatedProfile!.behaviorPatterns.riskTolerance)
            .toBeGreaterThan(initialRiskTolerance);
          
          // Should still be within valid bounds
          expect(updatedProfile!.behaviorPatterns.riskTolerance).toBeLessThanOrEqual(1.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('AI mentor adapts resource management style based on item usage patterns', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 10 }),
        (itemUsageCount: number) => {
          const aiMentor = new AIMentorSystem();
          const conservativeProfile = createTestProfile('balanced', 0.5, 'conservative');
          const lowHealthGameState = createTestGameState(false, 25);
          
          aiMentor.initialize(conservativeProfile);
          
          const initialResourceManagement = aiMentor.getPlayerProfile()!.behaviorPatterns.resourceManagement;
          expect(initialResourceManagement).toBe('conservative');
          
          // Simulate liberal item usage at low health
          for (let i = 0; i < itemUsageCount; i++) {
            const action: PlayerAction = {
              type: 'use_item',
              item: {
                id: `potion-${i}`,
                name: 'Health Potion',
                type: 'consumable',
                position: { x: 0, y: 0 },
                properties: { healing: 20 }
              },
              timestamp: Date.now() + i
            };
            aiMentor.analyzePlayerAction(action, lowHealthGameState);
          }
          
          const updatedProfile = aiMentor.getPlayerProfile();
          expect(updatedProfile).not.toBeNull();
          
          // Resource management should adapt to liberal usage pattern
          expect(updatedProfile!.behaviorPatterns.resourceManagement).toBe('liberal');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('AI mentor adapts exploration pattern based on movement frequency changes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 45, max: 60 }),
        (movementCount: number) => {
          const aiMentor = new AIMentorSystem();
          const cautiousProfile = createTestProfile('balanced', 0.5, 'moderate', 'cautious');
          const gameState = createTestGameState();
          
          aiMentor.initialize(cautiousProfile);
          
          const initialExplorationPattern = aiMentor.getPlayerProfile()!.behaviorPatterns.explorationPattern;
          expect(initialExplorationPattern).toBe('cautious');
          
          // Simulate thorough exploration with many movement actions
          const directions = ['north', 'south', 'east', 'west'];
          for (let i = 0; i < movementCount; i++) {
            const action: PlayerAction = {
              type: 'move',
              direction: directions[i % 4] as any,
              timestamp: Date.now() + i
            };
            aiMentor.analyzePlayerAction(action, gameState);
          }
          
          const updatedProfile = aiMentor.getPlayerProfile();
          expect(updatedProfile).not.toBeNull();
          
          // Exploration pattern should adapt to thorough exploration
          expect(updatedProfile!.behaviorPatterns.explorationPattern).toBe('thorough');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('AI mentor updates behavior patterns through direct profile updates', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          { combatStyle: 'aggressive' as const },
          { riskTolerance: 0.8 },
          { resourceManagement: 'liberal' as const },
          { explorationPattern: 'thorough' as const },
          { combatStyle: 'defensive' as const, riskTolerance: 0.2 }
        ),
        (behaviorUpdates: Partial<BehaviorPatterns>) => {
          const aiMentor = new AIMentorSystem();
          const profile = createTestProfile();
          
          aiMentor.initialize(profile);
          
          const initialProfile = aiMentor.getPlayerProfile()!;
          const initialTimestamp = initialProfile.statistics.lastUpdated.getTime();
          
          // Apply behavior updates
          aiMentor.updatePlayerProfile(behaviorUpdates);
          
          const updatedProfile = aiMentor.getPlayerProfile();
          expect(updatedProfile).not.toBeNull();
          
          // Check that specified updates were applied
          if (behaviorUpdates.combatStyle) {
            expect(updatedProfile!.behaviorPatterns.combatStyle).toBe(behaviorUpdates.combatStyle);
          }
          if (behaviorUpdates.riskTolerance !== undefined) {
            expect(updatedProfile!.behaviorPatterns.riskTolerance).toBe(behaviorUpdates.riskTolerance);
          }
          if (behaviorUpdates.resourceManagement) {
            expect(updatedProfile!.behaviorPatterns.resourceManagement).toBe(behaviorUpdates.resourceManagement);
          }
          if (behaviorUpdates.explorationPattern) {
            expect(updatedProfile!.behaviorPatterns.explorationPattern).toBe(behaviorUpdates.explorationPattern);
          }
          
          // Timestamp should be updated
          expect(updatedProfile!.statistics.lastUpdated.getTime()).toBeGreaterThanOrEqual(initialTimestamp);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('AI mentor maintains behavior pattern consistency across multiple adaptations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('move', 'attack', 'use_item', 'defend'),
          { minLength: 20, maxLength: 50 }
        ),
        (actionTypes: string[]) => {
          const aiMentor = new AIMentorSystem();
          const profile = createTestProfile();
          const gameState = createTestGameState();
          
          aiMentor.initialize(profile);
          
          // Apply sequence of actions
          actionTypes.forEach((actionType, i) => {
            const action: PlayerAction = {
              type: actionType as any,
              timestamp: Date.now() + i
            };
            aiMentor.analyzePlayerAction(action, gameState);
          });
          
          const finalProfile = aiMentor.getPlayerProfile();
          expect(finalProfile).not.toBeNull();
          
          // All behavior patterns should be valid
          expect(['aggressive', 'defensive', 'balanced', 'tactical'])
            .toContain(finalProfile!.behaviorPatterns.combatStyle);
          expect(finalProfile!.behaviorPatterns.riskTolerance).toBeGreaterThanOrEqual(0);
          expect(finalProfile!.behaviorPatterns.riskTolerance).toBeLessThanOrEqual(1);
          expect(['conservative', 'moderate', 'liberal'])
            .toContain(finalProfile!.behaviorPatterns.resourceManagement);
          expect(['thorough', 'efficient', 'cautious', 'bold'])
            .toContain(finalProfile!.behaviorPatterns.explorationPattern);
          
          // Profile should maintain structural integrity
          expect(finalProfile!.playerId).toBe(profile.playerId);
          expect(finalProfile!.skillLevel).toBe(profile.skillLevel);
        }
      ),
      { numRuns: 100 }
    );
  });
});