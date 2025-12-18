import { CombatAnalysisSystem } from '../../src/combat/CombatAnalysis';
import { CombatTurn } from '../../src/combat/CombatSystem';
import { PlayerAction, EnemyAction } from '../../src/types/GameTypes';

describe('CombatAnalysisSystem', () => {
  let analysisSystem: CombatAnalysisSystem;

  beforeEach(() => {
    analysisSystem = new CombatAnalysisSystem();
  });

  describe('initialization', () => {
    it('should initialize with empty history', () => {
      expect(analysisSystem.getAnalysisHistory()).toHaveLength(0);
      expect(analysisSystem.getAverageEfficiency()).toBe(0);
    });

    it('should reset properly', () => {
      // Add some mock analysis first
      const mockCombatLog = createMockCombatLog();
      analysisSystem.analyzeCombat(mockCombatLog, 5000, 'victory');
      
      expect(analysisSystem.getAnalysisHistory()).toHaveLength(1);
      
      analysisSystem.reset();
      expect(analysisSystem.getAnalysisHistory()).toHaveLength(0);
    });
  });

  describe('combat analysis', () => {
    it('should analyze a simple combat successfully', () => {
      const combatLog = createMockCombatLog();
      const result = analysisSystem.analyzeCombat(combatLog, 5000, 'victory');

      expect(result.analysis).toBeDefined();
      expect(result.analysis.combatId).toBeDefined();
      expect(result.analysis.turns).toHaveLength(2);
      expect(result.analysis.outcome).toBe('victory');
      expect(result.analysis.duration).toBe(5000);
      expect(result.efficiency).toBeGreaterThanOrEqual(0);
      expect(result.efficiency).toBeLessThanOrEqual(100);
      expect(result.suggestions).toBeDefined();
    });

    it('should throw error for empty combat log', () => {
      expect(() => {
        analysisSystem.analyzeCombat([], 1000, 'victory');
      }).toThrow('Cannot analyze empty combat log');
    });

    it('should calculate efficiency correctly', () => {
      const combatLog = createOptimalCombatLog();
      const result = analysisSystem.analyzeCombat(combatLog, 3000, 'victory');

      // Optimal combat should have high efficiency (0-1 scale)
      expect(result.efficiency).toBeGreaterThan(0.7);
    });

    it('should identify suboptimal play', () => {
      const combatLog = createSuboptimalCombatLog();
      const result = analysisSystem.analyzeCombat(combatLog, 8000, 'victory');

      // Suboptimal combat should have lower efficiency
      expect(result.efficiency).toBeLessThan(70);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('damage analysis', () => {
    it('should track damage statistics correctly', () => {
      const combatLog = createMockCombatLog();
      const result = analysisSystem.analyzeCombat(combatLog, 5000, 'victory');

      expect(result.analysis.damageAnalysis.totalDamageDealt).toBeGreaterThanOrEqual(0);
      expect(result.analysis.damageAnalysis.totalDamageTaken).toBeGreaterThanOrEqual(0);
      expect(result.analysis.damageAnalysis.efficiency).toBeGreaterThanOrEqual(0);
      expect(result.analysis.damageAnalysis.efficiency).toBeLessThanOrEqual(1);
    });

    it('should identify damage inefficiencies', () => {
      const combatLog = createSuboptimalCombatLog();
      const result = analysisSystem.analyzeCombat(combatLog, 8000, 'defeat');

      const inefficiencies = analysisSystem.highlightDamageInefficiencies(result.analysis);
      expect(inefficiencies).toBeDefined();
      expect(Array.isArray(inefficiencies)).toBe(true);
    });
  });

  describe('tactical suggestions', () => {
    it('should generate suggestions for low efficiency combat', () => {
      const combatLog = createSuboptimalCombatLog();
      const result = analysisSystem.analyzeCombat(combatLog, 10000, 'defeat');

      expect(result.suggestions.length).toBeGreaterThan(0);
      
      const highPrioritySuggestions = result.suggestions.filter(s => s.priority === 'high');
      expect(highPrioritySuggestions.length).toBeGreaterThan(0);
    });

    it('should generate fewer suggestions for optimal combat', () => {
      const combatLog = createOptimalCombatLog();
      const result = analysisSystem.analyzeCombat(combatLog, 3000, 'victory');

      // Optimal combat should generate fewer suggestions
      const highPrioritySuggestions = result.suggestions.filter(s => s.priority === 'high');
      expect(highPrioritySuggestions.length).toBeLessThanOrEqual(1);
    });
  });

  describe('analysis history', () => {
    it('should store analysis in history', () => {
      const combatLog1 = createMockCombatLog();
      const combatLog2 = createOptimalCombatLog();

      analysisSystem.analyzeCombat(combatLog1, 5000, 'victory');
      analysisSystem.analyzeCombat(combatLog2, 3000, 'victory');

      const history = analysisSystem.getAnalysisHistory();
      expect(history).toHaveLength(2);
      expect(history[0]?.combatId).not.toBe(history[1]?.combatId);
    });

    it('should calculate average efficiency correctly', () => {
      const combatLog1 = createOptimalCombatLog(); // Should have high efficiency
      const combatLog2 = createSuboptimalCombatLog(); // Should have low efficiency

      analysisSystem.analyzeCombat(combatLog1, 3000, 'victory');
      analysisSystem.analyzeCombat(combatLog2, 8000, 'defeat');

      const averageEfficiency = analysisSystem.getAverageEfficiency();
      expect(averageEfficiency).toBeGreaterThan(0);
      expect(averageEfficiency).toBeLessThan(100);
    });

    it('should retrieve analysis by ID', () => {
      const combatLog = createMockCombatLog();
      const result = analysisSystem.analyzeCombat(combatLog, 5000, 'victory');

      const retrieved = analysisSystem.getAnalysisById(result.analysis.combatId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.combatId).toBe(result.analysis.combatId);
    });

    it('should return null for non-existent analysis ID', () => {
      const retrieved = analysisSystem.getAnalysisById('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should clear history', () => {
      const combatLog = createMockCombatLog();
      analysisSystem.analyzeCombat(combatLog, 5000, 'victory');
      
      expect(analysisSystem.getAnalysisHistory()).toHaveLength(1);
      
      analysisSystem.clearHistory();
      expect(analysisSystem.getAnalysisHistory()).toHaveLength(0);
    });
  });

  describe('data export/import', () => {
    it('should export single analysis by ID', () => {
      const combatLog = createMockCombatLog();
      const result = analysisSystem.analyzeCombat(combatLog, 5000, 'victory');

      const exported = analysisSystem.exportAnalysis(result.analysis.combatId);
      expect(exported).toBeDefined();
      expect((exported as any).combatId).toBe(result.analysis.combatId);
    });

    it('should export all analyses when no ID provided', () => {
      const combatLog1 = createMockCombatLog();
      const combatLog2 = createOptimalCombatLog();

      analysisSystem.analyzeCombat(combatLog1, 5000, 'victory');
      analysisSystem.analyzeCombat(combatLog2, 3000, 'victory');

      const exported = analysisSystem.exportAnalysis();
      expect(Array.isArray(exported)).toBe(true);
      expect((exported as any[]).length).toBe(2);
    });

    it('should throw error when exporting non-existent analysis', () => {
      expect(() => {
        analysisSystem.exportAnalysis('non-existent-id');
      }).toThrow('Combat analysis not found');
    });

    it('should import analysis data', () => {
      const mockAnalysis = createMockAnalysis();
      
      analysisSystem.importAnalysis(mockAnalysis);
      
      const history = analysisSystem.getAnalysisHistory();
      expect(history).toHaveLength(1);
      expect(history[0]?.combatId).toBe(mockAnalysis.combatId);
    });

    it('should throw error for invalid analysis data', () => {
      const invalidAnalysis = { invalid: 'data' } as any;
      
      expect(() => {
        analysisSystem.importAnalysis(invalidAnalysis);
      }).toThrow('Invalid analysis data format');
    });
  });
});

// Helper functions to create mock data
function createMockCombatLog(): CombatTurn[] {
  const playerAction1: PlayerAction = {
    type: 'attack',
    target: 'enemy1',
    timestamp: Date.now()
  };

  const playerAction2: PlayerAction = {
    type: 'defend',
    timestamp: Date.now()
  };

  const enemyAction: EnemyAction = {
    type: 'attack',
    target: 'player1',
    damage: 10,
    timestamp: Date.now()
  };

  return [
    {
      turnNumber: 1,
      playerAction: playerAction1,
      enemyActions: [enemyAction],
      combatResults: [
        {
          playerDamageDealt: 15,
          playerDamageTaken: 8,
          enemyDefeated: false,
          playerDefeated: false,
          experienceGained: 0,
          combatEnded: false
        }
      ],
      gameStateAfter: {
        playerHealth: 92,
        playerPosition: { x: 5, y: 5 },
        turnNumber: 1,
        timestamp: Date.now()
      }
    },
    {
      turnNumber: 2,
      playerAction: playerAction2,
      enemyActions: [enemyAction],
      combatResults: [
        {
          playerDamageDealt: 0,
          playerDamageTaken: 5,
          enemyDefeated: false,
          playerDefeated: false,
          experienceGained: 0,
          combatEnded: false
        }
      ],
      gameStateAfter: {
        playerHealth: 87,
        playerPosition: { x: 5, y: 5 },
        turnNumber: 2,
        timestamp: Date.now()
      }
    }
  ];
}

function createOptimalCombatLog(): CombatTurn[] {
  const playerAction1: PlayerAction = {
    type: 'attack',
    target: 'enemy1',
    timestamp: Date.now()
  };

  const playerAction2: PlayerAction = {
    type: 'attack',
    target: 'enemy1',
    timestamp: Date.now()
  };

  const enemyAction: EnemyAction = {
    type: 'attack',
    target: 'player1',
    damage: 5,
    timestamp: Date.now()
  };

  return [
    {
      turnNumber: 1,
      playerAction: playerAction1,
      enemyActions: [enemyAction],
      combatResults: [
        {
          playerDamageDealt: 20,
          playerDamageTaken: 5,
          enemyDefeated: false,
          playerDefeated: false,
          experienceGained: 0,
          combatEnded: false
        }
      ],
      gameStateAfter: {
        playerHealth: 95,
        playerPosition: { x: 5, y: 5 },
        turnNumber: 1,
        timestamp: Date.now()
      }
    },
    {
      turnNumber: 2,
      playerAction: playerAction2,
      enemyActions: [],
      combatResults: [
        {
          playerDamageDealt: 25,
          playerDamageTaken: 0,
          enemyDefeated: true,
          playerDefeated: false,
          experienceGained: 50,
          combatEnded: true
        }
      ],
      gameStateAfter: {
        playerHealth: 95,
        playerPosition: { x: 5, y: 5 },
        turnNumber: 2,
        timestamp: Date.now()
      }
    }
  ];
}

function createSuboptimalCombatLog(): CombatTurn[] {
  const playerAction1: PlayerAction = {
    type: 'move',
    target: { x: 6, y: 5 },
    timestamp: Date.now()
  };

  const playerAction2: PlayerAction = {
    type: 'defend',
    timestamp: Date.now()
  };

  const playerAction3: PlayerAction = {
    type: 'use_item',
    item: {
      id: 'potion1',
      name: 'Health Potion',
      type: 'consumable',
      position: { x: 0, y: 0 },
      properties: { effect: 'heal', amount: 20 }
    },
    timestamp: Date.now()
  };

  const enemyAction: EnemyAction = {
    type: 'attack',
    target: 'player1',
    damage: 15,
    timestamp: Date.now()
  };

  return [
    {
      turnNumber: 1,
      playerAction: playerAction1,
      enemyActions: [enemyAction],
      combatResults: [
        {
          playerDamageDealt: 0,
          playerDamageTaken: 15,
          enemyDefeated: false,
          playerDefeated: false,
          experienceGained: 0,
          combatEnded: false
        }
      ],
      gameStateAfter: {
        playerHealth: 85,
        playerPosition: { x: 6, y: 5 },
        turnNumber: 1,
        timestamp: Date.now()
      }
    },
    {
      turnNumber: 2,
      playerAction: playerAction2,
      enemyActions: [enemyAction],
      combatResults: [
        {
          playerDamageDealt: 0,
          playerDamageTaken: 12,
          enemyDefeated: false,
          playerDefeated: false,
          experienceGained: 0,
          combatEnded: false
        }
      ],
      gameStateAfter: {
        playerHealth: 73,
        playerPosition: { x: 6, y: 5 },
        turnNumber: 2,
        timestamp: Date.now()
      }
    },
    {
      turnNumber: 3,
      playerAction: playerAction3,
      enemyActions: [enemyAction],
      combatResults: [
        {
          playerDamageDealt: 0,
          playerDamageTaken: 15,
          enemyDefeated: false,
          playerDefeated: false,
          experienceGained: 0,
          combatEnded: false
        }
      ],
      gameStateAfter: {
        playerHealth: 78, // Healed 20, took 15 damage
        playerPosition: { x: 6, y: 5 },
        turnNumber: 3,
        timestamp: Date.now()
      }
    }
  ];
}

function createMockAnalysis() {
  return {
    combatId: 'test_combat_123',
    turns: [],
    playerEfficiency: 75,
    optimalStrategy: [],
    damageAnalysis: {
      totalDamageDealt: 50,
      totalDamageTaken: 30,
      optimalDamageDealt: 60,
      optimalDamageTaken: 20,
      efficiency: 0.8,
      wastedActions: 1,
      missedOpportunities: []
    },
    suggestions: [],
    duration: 5000,
    outcome: 'victory' as const,
    timestamp: new Date()
  };
}