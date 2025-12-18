import { CombatTurn } from './CombatSystem';
import { 
  CombatAnalysis as ICombatAnalysis, 
  DamageBreakdown, 
  TacticalSuggestion,
  CombatTurn as ICombatTurn 
} from '../types/AITypes';
import { OptimalAction } from '../types/GameTypes';
import { GameError } from '../utils/ErrorHandling';
import { PerformanceManager } from '../utils/PerformanceManager';

export interface CombatAnalysisResult {
  analysis: ICombatAnalysis;
  efficiency: number;
  suggestions: TacticalSuggestion[];
}

// Combat analysis system for post-combat evaluation
export class CombatAnalysisSystem {
  private analysisHistory: ICombatAnalysis[] = [];
  private performanceManager: PerformanceManager;

  constructor() {
    this.performanceManager = PerformanceManager.getInstance();
    this.reset();
  }

  // Reset analysis system state
  reset(): void {
    this.analysisHistory = [];
  }

  // Generate comprehensive combat analysis with performance throttling
  analyzeCombat(
    combatLog: CombatTurn[], 
    combatDuration: number, 
    outcome: 'victory' | 'defeat' | 'fled'
  ): CombatAnalysisResult {
    if (combatLog.length === 0) {
      throw new GameError('Cannot analyze empty combat log', 'INVALID_COMBAT_DATA');
    }

    // Check if combat analysis should be skipped due to performance
    if (this.performanceManager.shouldSkipSystem('combatAnalysis')) {
      return this.generateMinimalAnalysis(combatLog, outcome);
    }

    this.performanceManager.startSystemTimer('combatAnalysis');

    const combatId = this.generateCombatId();

    // Convert combat turns to analysis format
    const analysisTurns = this.convertCombatTurns(combatLog);
    
    // Calculate optimal strategy for each turn (may be throttled)
    const optimalStrategy = this.calculateOptimalStrategy(combatLog);
    
    // Perform damage analysis
    const damageAnalysis = this.analyzeDamageEfficiency(combatLog, optimalStrategy);
    
    // Calculate overall efficiency
    const playerEfficiency = this.calculatePlayerEfficiency(combatLog, optimalStrategy);
    
    // Generate tactical suggestions
    const suggestions = this.generateTacticalSuggestions(combatLog, damageAnalysis, playerEfficiency);

    // Create comprehensive analysis
    const analysis: ICombatAnalysis = {
      combatId,
      turns: analysisTurns,
      playerEfficiency,
      optimalStrategy,
      damageAnalysis,
      suggestions,
      duration: combatDuration,
      outcome,
      timestamp: new Date()
    };

    // Store analysis in history
    this.analysisHistory.push(analysis);

    const result = this.performanceManager.endSystemTimer('combatAnalysis');
    
    // Log performance impact if significant
    if (result.performanceImpact === 'high' || result.performanceImpact === 'severe') {
      console.warn('Combat analysis had high performance impact', {
        executionTime: result.executionTime,
        impact: result.performanceImpact
      });
    }

    return {
      analysis,
      efficiency: playerEfficiency,
      suggestions
    };
  }

  // Generate minimal analysis when performance is constrained
  private generateMinimalAnalysis(
    combatLog: CombatTurn[], 
    outcome: 'victory' | 'defeat' | 'fled'
  ): CombatAnalysisResult {
    const combatId = this.generateCombatId();
    
    // Calculate basic efficiency without detailed analysis
    const totalDamageDealt = combatLog.reduce((total, turn) => 
      total + turn.combatResults.reduce((sum, result) => sum + result.playerDamageDealt, 0), 0);
    const totalDamageTaken = combatLog.reduce((total, turn) => 
      total + turn.combatResults.reduce((sum, result) => sum + result.playerDamageTaken, 0), 0);
    
    // Simple efficiency calculation (0-1 scale)
    const efficiency = totalDamageDealt > 0 ? 
      Math.min(1, (totalDamageDealt / Math.max(1, totalDamageTaken)) * 0.3) : 0;

    // Minimal analysis object
    const analysis: ICombatAnalysis = {
      combatId,
      turns: [], // Empty turns array for minimal analysis
      playerEfficiency: efficiency,
      optimalStrategy: [],
      damageAnalysis: {
        totalDamageDealt,
        totalDamageTaken,
        optimalDamageDealt: totalDamageDealt,
        optimalDamageTaken: totalDamageTaken,
        efficiency: efficiency,
        wastedActions: 0,
        missedOpportunities: []
      },
      suggestions: [{
        id: `minimal_${Date.now()}`,
        type: 'strategy',
        message: 'Detailed analysis skipped due to performance constraints',
        reasoning: 'System prioritized gameplay responsiveness over detailed combat analysis',
        priority: 'low',
        context: { minimal: true },
        timestamp: new Date()
      }],
      duration: combatLog.length * 1000, // Estimate 1 second per turn
      outcome,
      timestamp: new Date()
    };

    this.analysisHistory.push(analysis);

    return {
      analysis,
      efficiency,
      suggestions: analysis.suggestions
    };
  }

  // Convert CombatTurn to analysis format
  private convertCombatTurns(combatLog: CombatTurn[]): ICombatTurn[] {
    return combatLog.map(turn => {
      // Calculate optimal action for this turn
      const optimalAction = this.calculateOptimalActionForTurn(turn);
      
      // Calculate turn efficiency
      const efficiency = this.calculateTurnEfficiency(turn, optimalAction);
      
      // Extract damage information
      const damageDealt = turn.combatResults.reduce((total, result) => 
        total + result.playerDamageDealt, 0);
      const damageTaken = turn.combatResults.reduce((total, result) => 
        total + result.playerDamageTaken, 0);

      return {
        turnNumber: turn.turnNumber,
        playerAction: turn.playerAction,
        enemyAction: turn.enemyActions[0] || { type: 'defend', timestamp: Date.now() },
        gameState: turn.gameStateAfter,
        optimalAction,
        efficiency,
        damageDealt,
        damageTaken
      };
    });
  }

  // Calculate optimal strategy for entire combat
  private calculateOptimalStrategy(combatLog: CombatTurn[]): OptimalAction[] {
    const optimalActions: OptimalAction[] = [];

    for (const turn of combatLog) {
      const optimalAction = this.calculateOptimalActionForTurn(turn);
      optimalActions.push(optimalAction);
    }

    return optimalActions;
  }

  // Calculate optimal action for a specific turn
  private calculateOptimalActionForTurn(turn: CombatTurn): OptimalAction {
    const gameState = turn.gameStateAfter;
    const playerAction = turn.playerAction;
    
    // Analyze the situation
    const playerHealth = gameState.playerHealth;
    const playerHealthPercent = playerHealth / 100; // Assuming max health of 100 for simplicity
    
    // Determine optimal action based on game state
    if (playerHealthPercent < 0.3) {
      // Low health - should prioritize healing or defensive actions
      if (playerAction.type === 'use_item' && playerAction.item?.properties?.['effect'] === 'heal') {
        return {
          type: 'use_item',
          reasoning: 'Player correctly used healing item when health was critically low',
          expectedOutcome: 'Restore health to continue fighting effectively',
          efficiency: 1.0
        };
      } else if (playerAction.type === 'defend') {
        return {
          type: 'defend',
          reasoning: 'Defensive action appropriate when health is low',
          expectedOutcome: 'Reduce incoming damage while planning next move',
          efficiency: 0.8
        };
      } else {
        return {
          type: 'use_item',
          reasoning: 'Should have used healing item when health was critically low',
          expectedOutcome: 'Restore health to avoid defeat',
          efficiency: 0.3
        };
      }
    }

    // Check if enemies are in attack range
    const enemiesInRange = this.getEnemiesInAttackRange(turn);
    
    if (enemiesInRange.length > 0) {
      if (playerAction.type === 'attack') {
        return {
          type: 'attack',
          reasoning: 'Attacking enemy in range is optimal when health is sufficient',
          expectedOutcome: 'Deal damage to reduce enemy threat',
          efficiency: 0.9
        };
      } else {
        return {
          type: 'attack',
          reasoning: 'Should have attacked enemy in range instead of ' + playerAction.type,
          expectedOutcome: 'Deal damage to eliminate threat faster',
          efficiency: 0.5
        };
      }
    }

    // If no enemies in range, should move closer or use tactical positioning
    if (playerAction.type === 'move') {
      return {
        type: 'move',
        reasoning: 'Moving to better position when no enemies in attack range',
        expectedOutcome: 'Get into position for next turn attack',
        efficiency: 0.7
      };
    }

    // Default case - action was suboptimal
    return {
      type: 'move',
      reasoning: 'Should have moved to better tactical position',
      expectedOutcome: 'Improve positioning for future actions',
      efficiency: 0.4
    };
  }

  // Get enemies within attack range during a turn
  private getEnemiesInAttackRange(turn: CombatTurn): any[] {
    // Simplified - in real implementation would check actual enemy positions
    // For now, assume enemies are in range if player took or dealt damage
    const damageDealt = turn.combatResults.reduce((total, result) => 
      total + result.playerDamageDealt, 0);
    
    return damageDealt > 0 ? [{ id: 'enemy1' }] : [];
  }

  // Calculate turn efficiency compared to optimal action
  private calculateTurnEfficiency(turn: CombatTurn, optimalAction: OptimalAction): number {
    const playerAction = turn.playerAction;
    
    // If player action matches optimal action type, efficiency is high
    if (playerAction.type === optimalAction.type) {
      return optimalAction.efficiency;
    }

    // Calculate efficiency based on how suboptimal the action was
    const damageDealt = turn.combatResults.reduce((total, result) => 
      total + result.playerDamageDealt, 0);
    const damageTaken = turn.combatResults.reduce((total, result) => 
      total + result.playerDamageTaken, 0);

    // Efficiency based on damage ratio and action appropriateness
    let efficiency = 0.5; // Base efficiency for any action

    if (damageDealt > 0 && damageTaken === 0) {
      efficiency = 0.9; // Excellent - dealt damage without taking any
    } else if (damageDealt > damageTaken) {
      efficiency = 0.8; // Good - dealt more than received
    } else if (damageDealt === 0 && damageTaken === 0) {
      efficiency = 0.6; // Neutral - no combat interaction
    } else if (damageTaken > damageDealt) {
      efficiency = 0.3; // Poor - took more damage than dealt
    }

    return Math.max(0, Math.min(1, efficiency));
  }

  // Analyze damage efficiency throughout combat
  private analyzeDamageEfficiency(combatLog: CombatTurn[], optimalStrategy: OptimalAction[]): DamageBreakdown {
    let totalDamageDealt = 0;
    let totalDamageTaken = 0;
    let optimalDamageDealt = 0;
    let optimalDamageTaken = 0;
    let wastedActions = 0;
    const missedOpportunities: string[] = [];

    for (let i = 0; i < combatLog.length; i++) {
      const turn = combatLog[i];
      const optimal = optimalStrategy[i];

      if (!turn || !optimal) continue;

      const turnDamageDealt = turn.combatResults.reduce((total, result) => 
        total + result.playerDamageDealt, 0);
      const turnDamageTaken = turn.combatResults.reduce((total, result) => 
        total + result.playerDamageTaken, 0);

      totalDamageDealt += turnDamageDealt;
      totalDamageTaken += turnDamageTaken;

      // Calculate what optimal damage would have been
      if (optimal.type === 'attack') {
        optimalDamageDealt += this.estimateOptimalDamage(turn);
        optimalDamageTaken += Math.max(0, turnDamageTaken - 5); // Assume better positioning reduces damage
      } else if (optimal.type === 'defend') {
        optimalDamageDealt += turnDamageDealt;
        optimalDamageTaken += Math.max(0, turnDamageTaken * 0.5); // Defending reduces damage
      } else {
        optimalDamageDealt += turnDamageDealt;
        optimalDamageTaken += turnDamageTaken;
      }

      // Identify wasted actions and missed opportunities
      if (turn.playerAction.type !== optimal.type) {
        if (optimal.efficiency > 0.8 && this.calculateTurnEfficiency(turn, optimal) < 0.5) {
          wastedActions++;
          missedOpportunities.push(
            `Turn ${turn.turnNumber}: ${optimal.reasoning}`
          );
        }
      }
    }

    const efficiency = optimalDamageDealt > 0 ? 
      (totalDamageDealt / optimalDamageDealt) * (optimalDamageTaken / Math.max(1, totalDamageTaken)) : 0;

    return {
      totalDamageDealt,
      totalDamageTaken,
      optimalDamageDealt,
      optimalDamageTaken,
      efficiency: Math.max(0, Math.min(1, efficiency)),
      wastedActions,
      missedOpportunities
    };
  }

  // Estimate optimal damage for a turn
  private estimateOptimalDamage(turn: CombatTurn): number {
    // Simplified estimation - in real implementation would consider weapon stats, enemy defense, etc.
    const actualDamage = turn.combatResults.reduce((total, result) => 
      total + result.playerDamageDealt, 0);
    
    // Assume optimal play could deal 20% more damage on average
    return actualDamage > 0 ? actualDamage * 1.2 : 15; // Base damage if no damage was dealt
  }

  // Calculate overall player efficiency (0-100%)
  private calculatePlayerEfficiency(combatLog: CombatTurn[], optimalStrategy: OptimalAction[]): number {
    if (combatLog.length === 0) {
      return 0;
    }

    let totalEfficiency = 0;
    
    for (let i = 0; i < combatLog.length; i++) {
      const turn = combatLog[i];
      const optimal = optimalStrategy[i];
      
      if (!turn || !optimal) continue;
      
      const turnEfficiency = this.calculateTurnEfficiency(turn, optimal);
      totalEfficiency += turnEfficiency;
    }

    const averageEfficiency = totalEfficiency / combatLog.length;
    return Math.max(0, Math.min(1, averageEfficiency)); // Keep as 0-1 scale for consistency
  }

  // Generate tactical suggestions based on analysis
  private generateTacticalSuggestions(
    combatLog: CombatTurn[], 
    damageAnalysis: DamageBreakdown, 
    efficiency: number
  ): TacticalSuggestion[] {
    const suggestions: TacticalSuggestion[] = [];

    // Efficiency-based suggestions
    if (efficiency < 0.5) {
      suggestions.push({
        id: `suggestion_${Date.now()}_1`,
        type: 'combat',
        message: 'Consider improving your combat strategy',
        reasoning: 'Your combat efficiency was below 50%, indicating room for improvement in tactical decisions',
        priority: 'high',
        context: { efficiency, threshold: 0.5 },
        timestamp: new Date()
      });
    }

    // Damage efficiency suggestions
    if (damageAnalysis.efficiency < 0.7) {
      suggestions.push({
        id: `suggestion_${Date.now()}_2`,
        type: 'combat',
        message: 'Focus on dealing more damage while taking less',
        reasoning: 'Your damage efficiency suggests you could optimize your attack timing and defensive positioning',
        priority: 'medium',
        context: { damageEfficiency: damageAnalysis.efficiency },
        timestamp: new Date()
      });
    }

    // Wasted actions suggestions
    if (damageAnalysis.wastedActions > 2) {
      suggestions.push({
        id: `suggestion_${Date.now()}_3`,
        type: 'strategy',
        message: 'Reduce unnecessary actions in combat',
        reasoning: `You had ${damageAnalysis.wastedActions} suboptimal actions that could have been more effective`,
        priority: 'medium',
        context: { wastedActions: damageAnalysis.wastedActions },
        timestamp: new Date()
      });
    }

    // Health management suggestions
    const lowHealthTurns = combatLog.filter(turn => 
      turn.gameStateAfter.playerHealth < 30
    ).length;
    
    if (lowHealthTurns > combatLog.length * 0.3) {
      suggestions.push({
        id: `suggestion_${Date.now()}_4`,
        type: 'resource',
        message: 'Improve health management during combat',
        reasoning: 'You spent significant time at low health, which increases risk of defeat',
        priority: 'high',
        context: { lowHealthTurns, totalTurns: combatLog.length },
        timestamp: new Date()
      });
    }

    // Combat duration suggestions
    if (combatLog.length > 10) {
      suggestions.push({
        id: `suggestion_${Date.now()}_5`,
        type: 'strategy',
        message: 'Try to end combats more quickly',
        reasoning: 'Long combats increase resource consumption and risk. Focus on aggressive, efficient tactics',
        priority: 'low',
        context: { combatLength: combatLog.length },
        timestamp: new Date()
      });
    }

    return suggestions;
  }

  // Highlight specific moments of damage inefficiency
  highlightDamageInefficiencies(analysis: ICombatAnalysis): Array<{
    turnNumber: number;
    issue: string;
    suggestion: string;
    severity: 'minor' | 'moderate' | 'major';
  }> {
    const inefficiencies: Array<{
      turnNumber: number;
      issue: string;
      suggestion: string;
      severity: 'minor' | 'moderate' | 'major';
    }> = [];

    for (const turn of analysis.turns) {
      // Check for major inefficiencies
      if (turn.efficiency < 0.3) {
        inefficiencies.push({
          turnNumber: turn.turnNumber,
          issue: `Very inefficient action: ${turn.playerAction.type}`,
          suggestion: `Should have used ${turn.optimalAction.type}: ${turn.optimalAction.reasoning}`,
          severity: 'major'
        });
      }
      // Check for moderate inefficiencies
      else if (turn.efficiency < 0.6) {
        inefficiencies.push({
          turnNumber: turn.turnNumber,
          issue: `Suboptimal action: ${turn.playerAction.type}`,
          suggestion: turn.optimalAction.reasoning,
          severity: 'moderate'
        });
      }
      // Check for taking unnecessary damage
      else if (turn.damageTaken > 0 && turn.damageDealt === 0) {
        inefficiencies.push({
          turnNumber: turn.turnNumber,
          issue: 'Took damage without dealing any',
          suggestion: 'Consider better positioning or defensive actions',
          severity: 'minor'
        });
      }
    }

    return inefficiencies;
  }

  // Get analysis history
  getAnalysisHistory(): ICombatAnalysis[] {
    return [...this.analysisHistory];
  }

  // Get specific analysis by ID
  getAnalysisById(combatId: string): ICombatAnalysis | null {
    return this.analysisHistory.find(analysis => analysis.combatId === combatId) || null;
  }

  // Get average efficiency across all analyzed combats
  getAverageEfficiency(): number {
    if (this.analysisHistory.length === 0) {
      return 0;
    }

    const totalEfficiency = this.analysisHistory.reduce(
      (sum, analysis) => sum + analysis.playerEfficiency, 0
    );
    
    return Math.round(totalEfficiency / this.analysisHistory.length);
  }

  // Clear analysis history
  clearHistory(): void {
    this.analysisHistory = [];
  }

  // Generate unique combat ID
  private generateCombatId(): string {
    return `combat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Export analysis data for external use
  exportAnalysis(combatId?: string): ICombatAnalysis | ICombatAnalysis[] {
    if (combatId) {
      const analysis = this.getAnalysisById(combatId);
      if (!analysis) {
        throw new GameError(`Combat analysis not found: ${combatId}`, 'ANALYSIS_NOT_FOUND');
      }
      return analysis;
    }
    
    return this.getAnalysisHistory();
  }

  // Import analysis data
  importAnalysis(analysisData: ICombatAnalysis | ICombatAnalysis[]): void {
    const analyses = Array.isArray(analysisData) ? analysisData : [analysisData];
    
    for (const analysis of analyses) {
      // Validate analysis data
      if (!analysis.combatId || !analysis.turns || !analysis.timestamp) {
        throw new GameError('Invalid analysis data format', 'INVALID_ANALYSIS_DATA');
      }
      
      // Add to history if not already present
      const existingIndex = this.analysisHistory.findIndex(
        existing => existing.combatId === analysis.combatId
      );
      
      if (existingIndex >= 0) {
        this.analysisHistory[existingIndex] = analysis;
      } else {
        this.analysisHistory.push(analysis);
      }
    }
  }
}