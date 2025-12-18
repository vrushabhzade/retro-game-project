import { AIResponse, PlayerProfile, GameState, CombatAction, AILearningData } from '../types';
import { logger } from '../utils/logger';

export class AIService {
  private static instance: AIService;

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Generate AI mentor guidance based on current game context
   */
  public async generateGuidance(
    gameState: GameState,
    playerProfile: PlayerProfile,
    context: string
  ): Promise<AIResponse> {
    try {
      const aiData = playerProfile.aiLearningData;
      const adaptationLevel = aiData.adaptationLevel;
      
      // Analyze current situation
      const situationAnalysis = this.analyzeSituation(gameState, context);
      
      // Generate contextual advice based on player's skill level and behavior patterns
      const guidance = this.generateContextualAdvice(
        situationAnalysis,
        aiData,
        adaptationLevel
      );

      return {
        type: guidance.type,
        message: guidance.message,
        context,
        confidence: guidance.confidence,
        reasoning: guidance.reasoning,
        suggestedActions: guidance.suggestedActions
      };

    } catch (error) {
      logger.error('Error generating AI guidance:', error);
      return {
        type: 'encouragement',
        message: 'Stay focused, adventurer. Trust your instincts.',
        context,
        confidence: 0.5,
        reasoning: ['Fallback response due to AI processing error']
      };
    }
  }

  /**
   * Analyze combat performance and generate optimal strategy
   */
  public analyzeCombatPerformance(
    playerActions: CombatAction[],
    enemyType: string,
    playerStats: any,
    enemyStats: any
  ): {
    optimalActions: CombatAction[];
    efficiencyScore: number;
    suggestions: string[];
  } {
    try {
      // Calculate optimal combat sequence
      const optimalActions = this.calculateOptimalCombatSequence(
        enemyType,
        playerStats,
        enemyStats
      );

      // Compare player actions to optimal sequence
      const efficiencyScore = this.calculateEfficiencyScore(
        playerActions,
        optimalActions
      );

      // Generate improvement suggestions
      const suggestions = this.generateCombatSuggestions(
        playerActions,
        optimalActions,
        efficiencyScore
      );

      return {
        optimalActions,
        efficiencyScore,
        suggestions
      };

    } catch (error) {
      logger.error('Error analyzing combat performance:', error);
      return {
        optimalActions: [],
        efficiencyScore: 50,
        suggestions: ['Combat analysis temporarily unavailable']
      };
    }
  }

  /**
   * Update player behavior patterns based on recent actions
   */
  public updateBehaviorPatterns(
    currentData: AILearningData,
    recentActions: string[],
    performance: { efficiency: number; survivalRate: number }
  ): Partial<AILearningData> {
    try {
      const updates: Partial<AILearningData> = {
        performanceMetrics: {
          ...currentData.performanceMetrics,
          combatEfficiency: this.updateRunningAverage(
            currentData.performanceMetrics.combatEfficiency,
            performance.efficiency,
            0.1
          ),
          survivalRate: this.updateRunningAverage(
            currentData.performanceMetrics.survivalRate,
            performance.survivalRate,
            0.1
          )
        }
      };

      // Analyze movement patterns
      const movementPattern = this.analyzeMovementPattern(recentActions);
      if (movementPattern !== currentData.behaviorPatterns.movementStyle) {
        updates.behaviorPatterns = {
          ...currentData.behaviorPatterns,
          movementStyle: movementPattern
        };
      }

      // Update adaptation level based on performance
      const newAdaptationLevel = this.calculateAdaptationLevel(
        updates.performanceMetrics || currentData.performanceMetrics
      );
      if (newAdaptationLevel !== currentData.adaptationLevel) {
        updates.adaptationLevel = newAdaptationLevel;
      }

      return updates;

    } catch (error) {
      logger.error('Error updating behavior patterns:', error);
      return {};
    }
  }

  private analyzeSituation(gameState: GameState, context: string) {
    const { playerStats, enemies, dungeonLevel, playerPosition } = gameState;
    
    return {
      healthStatus: playerStats.hp / playerStats.maxHp,
      manaStatus: playerStats.mp / playerStats.maxMp,
      nearbyEnemies: enemies.filter(e => 
        Math.abs(e.x - playerPosition.x) <= 2 && 
        Math.abs(e.y - playerPosition.y) <= 2
      ).length,
      dungeonProgress: dungeonLevel,
      immediateThreats: enemies.filter(e => 
        Math.abs(e.x - playerPosition.x) <= 1 && 
        Math.abs(e.y - playerPosition.y) <= 1
      ),
      context
    };
  }

  private generateContextualAdvice(
    situation: any,
    aiData: AILearningData,
    adaptationLevel: string
  ) {
    const { healthStatus, manaStatus, nearbyEnemies, immediateThreats } = situation;
    
    // Determine advice type based on situation
    let type: AIResponse['type'] = 'guidance';
    let message = '';
    let confidence = 0.8;
    let reasoning: string[] = [];
    let suggestedActions: string[] = [];

    // Health-based advice
    if (healthStatus < 0.3) {
      type = 'warning';
      message = 'Your health is critically low! Consider using a healing potion or retreating to safety.';
      reasoning.push('Player health below 30%');
      suggestedActions.push('use_potion', 'retreat');
      confidence = 0.9;
    } else if (healthStatus < 0.6 && immediateThreats.length > 0) {
      type = 'warning';
      message = 'Enemies nearby and health is moderate. Be cautious in your approach.';
      reasoning.push('Moderate health with immediate threats');
      suggestedActions.push('defensive_stance', 'use_potion');
    }

    // Combat advice based on player patterns
    if (immediateThreats.length > 0) {
      if (aiData.behaviorPatterns.combatPreference === 'magic' && manaStatus > 0.5) {
        message = 'Perfect opportunity for a magical attack! Your mana reserves are good.';
        suggestedActions.push('cast_spell');
        reasoning.push('Player prefers magic combat, sufficient mana available');
      } else if (aiData.behaviorPatterns.combatPreference === 'melee') {
        message = 'Strike fast and hard! Your melee skills will serve you well here.';
        suggestedActions.push('attack');
        reasoning.push('Player prefers melee combat');
      }
    }

    // Exploration advice
    if (nearbyEnemies === 0 && healthStatus > 0.7) {
      if (aiData.behaviorPatterns.explorationPattern === 'thorough') {
        message = 'The area seems clear. Perfect time for thorough exploration.';
        suggestedActions.push('explore_thoroughly');
        reasoning.push('No immediate threats, player prefers thorough exploration');
      } else {
        message = 'Coast is clear! You can move forward confidently.';
        suggestedActions.push('advance');
        reasoning.push('No immediate threats detected');
      }
    }

    // Fallback encouragement
    if (!message) {
      type = 'encouragement';
      message = 'You\'re doing well, adventurer. Trust your instincts and stay alert.';
      reasoning.push('General encouragement');
      confidence = 0.6;
    }

    return { type, message, confidence, reasoning, suggestedActions };
  }

  private calculateOptimalCombatSequence(
    enemyType: string,
    playerStats: any,
    enemyStats: any
  ): CombatAction[] {
    const actions: CombatAction[] = [];
    let turn = 1;
    let enemyHp = enemyStats.hp;
    let playerMp = playerStats.mp;

    // Simple optimal strategy calculation
    while (enemyHp > 0) {
      let action: CombatAction['action'] = 'attack';
      let damage = playerStats.attack;

      // Use magic if it's more efficient and we have mana
      if (playerMp >= 20 && playerStats.attack * 1.5 < 30) {
        action = 'cast_spell';
        damage = 30;
        playerMp -= 20;
      }

      actions.push({
        turn,
        action,
        damage,
        success: true,
        timestamp: new Date()
      });

      enemyHp -= damage;
      turn++;

      // Prevent infinite loops
      if (turn > 20) break;
    }

    return actions;
  }

  private calculateEfficiencyScore(
    playerActions: CombatAction[],
    optimalActions: CombatAction[]
  ): number {
    if (playerActions.length === 0) return 0;
    if (optimalActions.length === 0) return 100;

    // Calculate efficiency based on turn count and damage dealt
    const playerTurns = playerActions.length;
    const optimalTurns = optimalActions.length;
    
    const turnEfficiency = Math.max(0, 100 - ((playerTurns - optimalTurns) / optimalTurns) * 50);
    
    // Calculate damage efficiency
    const playerDamage = playerActions.reduce((sum, action) => sum + (action.damage || 0), 0);
    const optimalDamage = optimalActions.reduce((sum, action) => sum + (action.damage || 0), 0);
    
    const damageEfficiency = optimalDamage > 0 ? (playerDamage / optimalDamage) * 100 : 100;
    
    return Math.round((turnEfficiency + damageEfficiency) / 2);
  }

  private generateCombatSuggestions(
    playerActions: CombatAction[],
    optimalActions: CombatAction[],
    efficiencyScore: number
  ): string[] {
    const suggestions: string[] = [];

    if (efficiencyScore < 70) {
      suggestions.push('Consider using more efficient attack patterns');
    }

    if (playerActions.length > optimalActions.length * 1.5) {
      suggestions.push('Try to end combat more quickly with higher damage attacks');
    }

    const magicUse = playerActions.filter(a => a.action === 'cast_spell').length;
    const optimalMagicUse = optimalActions.filter(a => a.action === 'cast_spell').length;
    
    if (magicUse < optimalMagicUse) {
      suggestions.push('Magic spells could be more effective in this situation');
    }

    if (suggestions.length === 0) {
      suggestions.push('Excellent combat performance! Keep up the good work.');
    }

    return suggestions;
  }

  private analyzeMovementPattern(recentActions: string[]): AILearningData['behaviorPatterns']['movementStyle'] {
    const movementActions = recentActions.filter(action => 
      action.includes('move') || action.includes('explore')
    );

    if (movementActions.length < 5) return 'exploratory';

    const cautiousIndicators = movementActions.filter(action => 
      action.includes('retreat') || action.includes('careful')
    ).length;

    const aggressiveIndicators = movementActions.filter(action => 
      action.includes('charge') || action.includes('rush')
    ).length;

    if (cautiousIndicators > aggressiveIndicators * 2) return 'cautious';
    if (aggressiveIndicators > cautiousIndicators * 2) return 'aggressive';
    
    return 'exploratory';
  }

  private calculateAdaptationLevel(metrics: AILearningData['performanceMetrics']): AILearningData['adaptationLevel'] {
    const { combatEfficiency, survivalRate, resourceUtilization } = metrics;
    const overallScore = (combatEfficiency + survivalRate + resourceUtilization) / 3;

    if (overallScore >= 85) return 'expert';
    if (overallScore >= 70) return 'advanced';
    if (overallScore >= 50) return 'intermediate';
    return 'beginner';
  }

  private updateRunningAverage(current: number, newValue: number, weight: number): number {
    return current * (1 - weight) + newValue * weight;
  }
}

export const aiService = AIService.getInstance();