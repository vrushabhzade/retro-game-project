import * as fc from 'fast-check';
import { CombatAnalysisSystem } from '../../src/combat/CombatAnalysis';

/**
 * **Feature: ai-dungeon-master, Property 10: Comprehensive Combat Analysis**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
 * 
 * For any completed combat encounter, the analysis system should generate a complete breakdown 
 * including turn-by-turn details, optimal strategies, efficiency scores (0-100%), 
 * and damage inefficiency highlights
 */

describe('Property 10: Comprehensive Combat Analysis', () => {
  it('should generate complete combat analysis for any combat encounter', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 30000 }), // Combat duration
        fc.constantFrom('victory' as const, 'defeat' as const, 'fled' as const), // Combat outcome
        fc.integer({ min: 0, max: 100 }), // Player damage dealt
        fc.integer({ min: 0, max: 50 }), // Player damage taken
        fc.boolean(), // Enemy defeated
        fc.integer({ min: 0, max: 100 }), // Experience gained
        fc.boolean(), // Combat ended
        fc.integer({ min: 1, max: 100 }), // Player health
        (duration: number, outcome: 'victory' | 'defeat' | 'fled', damageDealt: number, damageTaken: number, enemyDefeated: boolean, expGained: number, combatEnded: boolean, playerHealth: number) => {
          // Arrange - Create a simple mock combat log
          const combatLog = [{
            turnNumber: 1,
            playerAction: { type: 'attack' as const, timestamp: Date.now() },
            enemyActions: [{ type: 'attack' as const, timestamp: Date.now() }],
            combatResults: [{
              playerDamageDealt: damageDealt,
              playerDamageTaken: damageTaken,
              enemyDefeated: enemyDefeated,
              playerDefeated: false,
              experienceGained: expGained,
              combatEnded: combatEnded
            }],
            gameStateAfter: {
              playerHealth: playerHealth,
              playerPosition: { x: 0, y: 0 },
              turnNumber: 1,
              timestamp: Date.now()
            }
          }];
          
          const analysisSystem = new CombatAnalysisSystem();
          
          // Act
          const result = analysisSystem.analyzeCombat(combatLog, duration, outcome);
          
          // Assert - Comprehensive analysis requirements
          
          // 4.1: Turn-by-turn breakdown should be generated
          expect(result.analysis.turns).toBeDefined();
          expect(result.analysis.turns.length).toBe(combatLog.length);
          
          // Each turn should have complete analysis data
          for (const turn of result.analysis.turns) {
            expect(turn.turnNumber).toBeGreaterThan(0);
            expect(turn.playerAction).toBeDefined();
            expect(turn.optimalAction).toBeDefined();
            expect(turn.efficiency).toBeGreaterThanOrEqual(0);
            expect(turn.efficiency).toBeLessThanOrEqual(1);
            expect(turn.damageDealt).toBeGreaterThanOrEqual(0);
            expect(turn.damageTaken).toBeGreaterThanOrEqual(0);
          }
          
          // 4.2: Optimal alternative strategies should be identified
          expect(result.analysis.optimalStrategy).toBeDefined();
          expect(result.analysis.optimalStrategy.length).toBe(combatLog.length);
          
          for (const optimalAction of result.analysis.optimalStrategy) {
            expect(optimalAction.type).toBeDefined();
            expect(optimalAction.reasoning).toBeDefined();
            expect(optimalAction.expectedOutcome).toBeDefined();
            expect(optimalAction.efficiency).toBeGreaterThanOrEqual(0);
            expect(optimalAction.efficiency).toBeLessThanOrEqual(1);
          }
          
          // 4.3: Damage efficiency and resource usage scores should be calculated
          expect(result.analysis.damageAnalysis).toBeDefined();
          expect(result.analysis.damageAnalysis.totalDamageDealt).toBeGreaterThanOrEqual(0);
          expect(result.analysis.damageAnalysis.totalDamageTaken).toBeGreaterThanOrEqual(0);
          expect(result.analysis.damageAnalysis.efficiency).toBeGreaterThanOrEqual(0);
          expect(result.analysis.damageAnalysis.efficiency).toBeLessThanOrEqual(1);
          expect(result.analysis.damageAnalysis.wastedActions).toBeGreaterThanOrEqual(0);
          expect(Array.isArray(result.analysis.damageAnalysis.missedOpportunities)).toBe(true);
          
          // 4.4: Efficiency score from 0-1 scale should be provided
          expect(result.analysis.playerEfficiency).toBeGreaterThanOrEqual(0);
          expect(result.analysis.playerEfficiency).toBeLessThanOrEqual(1);
          expect(typeof result.analysis.playerEfficiency).toBe('number');
          
          // 4.5: Damage inefficiency detection and highlighting should be available
          const inefficiencies = analysisSystem.highlightDamageInefficiencies(result.analysis);
          expect(Array.isArray(inefficiencies)).toBe(true);
          
          for (const inefficiency of inefficiencies) {
            expect(inefficiency.turnNumber).toBeGreaterThan(0);
            expect(inefficiency.issue).toBeDefined();
            expect(inefficiency.suggestion).toBeDefined();
            expect(['minor', 'moderate', 'major']).toContain(inefficiency.severity);
          }
          
          // Additional comprehensive analysis requirements
          expect(result.analysis.combatId).toBeDefined();
          expect(result.analysis.duration).toBe(duration);
          expect(result.analysis.outcome).toBe(outcome);
          expect(result.analysis.timestamp).toBeInstanceOf(Date);
          expect(Array.isArray(result.analysis.suggestions)).toBe(true);
          
          // Suggestions should be relevant tactical advice
          for (const suggestion of result.analysis.suggestions) {
            expect(suggestion.id).toBeDefined();
            expect(['combat', 'strategy', 'resource', 'exploration']).toContain(suggestion.type);
            expect(suggestion.message).toBeDefined();
            expect(suggestion.reasoning).toBeDefined();
            expect(['low', 'medium', 'high', 'critical']).toContain(suggestion.priority);
            expect(suggestion.timestamp).toBeInstanceOf(Date);
          }
          
          // Verify analysis is stored in history
          const history = analysisSystem.getAnalysisHistory();
          expect(history.length).toBeGreaterThan(0);
          expect(history[history.length - 1]?.combatId).toBe(result.analysis.combatId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases in combat analysis gracefully', () => {
    const analysisSystem = new CombatAnalysisSystem();
    
    // Test single turn combat
    const singleTurnCombat = [{
      turnNumber: 1,
      playerAction: { type: 'attack' as const, timestamp: Date.now() },
      enemyActions: [{ type: 'attack' as const, timestamp: Date.now() }],
      combatResults: [{
        playerDamageDealt: 100,
        playerDamageTaken: 0,
        enemyDefeated: true,
        playerDefeated: false,
        experienceGained: 50,
        combatEnded: true
      }],
      gameStateAfter: {
        playerHealth: 100,
        playerPosition: { x: 0, y: 0 },
        turnNumber: 1,
        timestamp: Date.now()
      }
    }];
    
    expect(() => {
      const result = analysisSystem.analyzeCombat(singleTurnCombat, 1000, 'victory');
      expect(result.analysis).toBeDefined();
      expect(result.analysis.turns.length).toBe(1);
      expect(result.analysis.playerEfficiency).toBeGreaterThanOrEqual(0);
      expect(result.analysis.playerEfficiency).toBeLessThanOrEqual(100);
    }).not.toThrow();
    
    // Test no damage combat
    const noDamageCombat = [{
      turnNumber: 1,
      playerAction: { type: 'defend' as const, timestamp: Date.now() },
      enemyActions: [{ type: 'defend' as const, timestamp: Date.now() }],
      combatResults: [{
        playerDamageDealt: 0,
        playerDamageTaken: 0,
        enemyDefeated: false,
        playerDefeated: false,
        experienceGained: 0,
        combatEnded: false
      }],
      gameStateAfter: {
        playerHealth: 100,
        playerPosition: { x: 0, y: 0 },
        turnNumber: 1,
        timestamp: Date.now()
      }
    }];
    
    expect(() => {
      const result = analysisSystem.analyzeCombat(noDamageCombat, 2000, 'fled');
      expect(result.analysis).toBeDefined();
      expect(result.analysis.damageAnalysis.totalDamageDealt).toBe(0);
      expect(result.analysis.damageAnalysis.totalDamageTaken).toBe(0);
    }).not.toThrow();
  });
});