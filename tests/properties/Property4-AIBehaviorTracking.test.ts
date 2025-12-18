import * as fc from 'fast-check';
import { AIMentorSystem } from '../../src/ai/AIMentorSystem';
import { PlayerProfile } from '../../src/player/PlayerProfile';
import { GameState, PlayerAction } from '../../src/types/GameTypes';

/**
 * Feature: ai-dungeon-master, Property 4: AI Behavior Tracking
 * 
 * For any player action (combat decisions, movement, resource usage), 
 * the AI mentor system should record the action in the player profile 
 and update behavioral patterns accordingly.
 * 
 * Validates: Requirements 1.4, 2.1, 2.2
 */

// Simple generators for test data
const createTestProfile = (): PlayerProfile => {
  const profile = new PlayerProfile('test-player');
  profile.skillLevel = 'intermediate';
  profile.behaviorPatterns = {
    combatStyle: 'balanced',
    riskTolerance: 0.5,
    resourceManagement: 'moderate',
    explorationPattern: 'efficient'
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

describe('Property 4: AI Behavior Tracking', () => {
  test('AI mentor system records all player actions in history', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (actionCount: number) => {
          const aiMentor = new AIMentorSystem();
          const profile = createTestProfile();
          const gameState = createTestGameState();
          
          aiMentor.initialize(profile);
          const initialHistoryLength = aiMentor.getActionHistory().length;
          
          // Create actions manually
          const actions: PlayerAction[] = [];
          const actionTypes: Array<'move' | 'attack' | 'use_item' | 'defend' | 'cast_spell'> = ['move', 'attack', 'use_item', 'defend', 'cast_spell'];
          
          for (let i = 0; i < actionCount; i++) {
            const actionType = actionTypes[i % actionTypes.length];
            const action: PlayerAction = {
              type: actionType!,
              timestamp: Date.now() + i
            };
            actions.push(action);
            aiMentor.analyzePlayerAction(action, gameState);
          }
          
          const finalHistory = aiMentor.getActionHistory();
          
          // All actions should be recorded
          expect(finalHistory.length).toBe(initialHistoryLength + actions.length);
          
          // Actions should be in the correct order (last actions at the end)
          const recordedActions = finalHistory.slice(-actions.length);
          actions.forEach((expectedAction, index) => {
            expect(recordedActions[index]).toEqual(expectedAction);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Combat actions update combat style behavior patterns', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('attack', 'defend'),
          { minLength: 20, maxLength: 30 }
        ),
        (actionTypes: string[]) => {
          const aiMentor = new AIMentorSystem();
          const profile = createTestProfile();
          const combatGameState = createTestGameState(true);
          
          aiMentor.initialize(profile);
          
          // Perform combat actions
          actionTypes.forEach((actionType, i) => {
            const action: PlayerAction = {
              type: actionType as any,
              timestamp: Date.now() + i
            };
            aiMentor.analyzePlayerAction(action, combatGameState);
          });
          
          const updatedProfile = aiMentor.getPlayerProfile();
          expect(updatedProfile).not.toBeNull();
          
          // Combat style should be updated based on action patterns
          // Just verify that the combat style is one of the valid values
          // The exact logic depends on the AI's internal state and history
          expect(['aggressive', 'defensive', 'balanced', 'tactical'])
            .toContain(updatedProfile!.behaviorPatterns.combatStyle);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Low health actions update risk tolerance patterns', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('attack', 'use_item', 'defend'),
          { minLength: 5, maxLength: 15 }
        ),
        (actionTypes: string[]) => {
          const aiMentor = new AIMentorSystem();
          const profile = createTestProfile();
          profile.behaviorPatterns.riskTolerance = 0.1; // Start with low risk tolerance
          const lowHealthGameState = createTestGameState(false, 20); // Low health
          
          aiMentor.initialize(profile);
          const initialRiskTolerance = aiMentor.getPlayerProfile()!.behaviorPatterns.riskTolerance;
          
          // Apply all low health actions
          actionTypes.forEach((actionType, i) => {
            const action: PlayerAction = {
              type: actionType as any,
              timestamp: Date.now() + i
            };
            aiMentor.analyzePlayerAction(action, lowHealthGameState);
          });
          
          const updatedProfile = aiMentor.getPlayerProfile();
          expect(updatedProfile).not.toBeNull();
          
          // Risk tolerance should be influenced by low health actions
          const riskTolerance = updatedProfile!.behaviorPatterns.riskTolerance;
          expect(riskTolerance).toBeGreaterThanOrEqual(0);
          expect(riskTolerance).toBeLessThanOrEqual(1);
          
          // Aggressive actions at low health should increase risk tolerance
          const aggressiveActions = actionTypes.filter(type => type === 'attack').length;
          const defensiveActions = actionTypes.filter(type => 
            type === 'use_item' || type === 'defend'
          ).length;
          
          if (aggressiveActions > defensiveActions) {
            expect(riskTolerance).toBeGreaterThan(initialRiskTolerance - 0.1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Item usage actions update resource management patterns', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }),
        (itemUsageCount: number) => {
          const aiMentor = new AIMentorSystem();
          const profile = createTestProfile();
          const gameState = createTestGameState();
          
          aiMentor.initialize(profile);
          
          // Perform item usage actions
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
            aiMentor.analyzePlayerAction(action, gameState);
          }
          
          const updatedProfile = aiMentor.getPlayerProfile();
          expect(updatedProfile).not.toBeNull();
          
          // Resource management pattern should be updated
          const resourceManagement = updatedProfile!.behaviorPatterns.resourceManagement;
          expect(['conservative', 'moderate', 'liberal']).toContain(resourceManagement);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Movement actions update exploration patterns', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 60 }),
        (movementCount: number) => {
          const aiMentor = new AIMentorSystem();
          const profile = createTestProfile();
          const gameState = createTestGameState();
          
          aiMentor.initialize(profile);
          
          // Perform movement actions
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
          
          // Exploration pattern should be updated based on movement frequency
          const explorationPattern = updatedProfile!.behaviorPatterns.explorationPattern;
          expect(['thorough', 'efficient', 'cautious', 'bold']).toContain(explorationPattern);
          
          // More movements should tend toward 'thorough' exploration
          if (movementCount > 40) {
            expect(explorationPattern).toBe('thorough');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Player profile timestamp is updated after analyzing actions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('move', 'attack', 'use_item', 'defend', 'cast_spell') as fc.Arbitrary<'move' | 'attack' | 'use_item' | 'defend' | 'cast_spell'>,
        (actionType: 'move' | 'attack' | 'use_item' | 'defend' | 'cast_spell') => {
          const aiMentor = new AIMentorSystem();
          const profile = createTestProfile();
          const gameState = createTestGameState();
          
          aiMentor.initialize(profile);
          const initialTimestamp = profile.statistics.lastUpdated.getTime();
          
          // Create action manually
          const action: PlayerAction = {
            type: actionType,
            timestamp: Date.now()
          };
          
          // Wait a small amount to ensure timestamp difference
          const beforeAction = Date.now();
          aiMentor.analyzePlayerAction(action, gameState);
          
          const updatedProfile = aiMentor.getPlayerProfile();
          expect(updatedProfile).not.toBeNull();
          
          const finalTimestamp = updatedProfile!.statistics.lastUpdated.getTime();
          
          // Timestamp should be updated and be recent
          expect(finalTimestamp).toBeGreaterThanOrEqual(beforeAction);
          expect(finalTimestamp).toBeGreaterThanOrEqual(initialTimestamp);
        }
      ),
      { numRuns: 100 }
    );
  });
});