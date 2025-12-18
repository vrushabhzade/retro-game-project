import { 
  PlayerProfile as IPlayerProfile, 
  BehaviorPatterns, 
  PlayerPreferences, 
  PlayerStatistics 
} from '../types/AITypes';
import { PerformanceLevel, PlayerAction } from '../types/GameTypes';

// Player profile management with behavior tracking
export class PlayerProfile implements IPlayerProfile {
  public playerId: string;
  public skillLevel: PerformanceLevel;
  public behaviorPatterns: BehaviorPatterns;
  public preferences: PlayerPreferences;
  public statistics: PlayerStatistics;
  public createdAt: Date;
  public lastPlayed: Date;

  constructor(playerId: string) {
    this.playerId = playerId;
    this.skillLevel = 'beginner';
    this.createdAt = new Date();
    this.lastPlayed = new Date();
    
    // Initialize with default behavior patterns
    this.behaviorPatterns = {
      combatStyle: 'balanced',
      riskTolerance: 0.5,
      resourceManagement: 'moderate',
      explorationPattern: 'efficient'
    };

    // Initialize with default preferences
    this.preferences = {
      uiComplexity: 'standard',
      colorScheme: 'classic',
      hintFrequency: 'moderate'
    };

    // Initialize statistics
    this.statistics = {
      totalPlayTime: 0,
      combatsWon: 0,
      combatsLost: 0,
      averageEfficiency: 0,
      dungeonsCleaned: 0,
      itemsFound: 0,
      secretsDiscovered: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Updates behavior patterns based on player actions
   */
  public updateBehaviorFromAction(action: PlayerAction, context: any): void {
    this.lastPlayed = new Date();
    this.statistics.lastUpdated = new Date();

    // Analyze combat style from actions
    if (action.type === 'attack') {
      this.updateCombatStyle('aggressive');
    } else if (action.type === 'defend') {
      this.updateCombatStyle('defensive');
    }

    // Update risk tolerance based on action choices
    if (context.playerHealth && context.enemyHealth) {
      const healthRatio = context.playerHealth / context.enemyHealth;
      if (healthRatio < 0.3 && action.type === 'attack') {
        this.behaviorPatterns.riskTolerance = Math.min(1, this.behaviorPatterns.riskTolerance + 0.1);
      } else if (healthRatio > 0.7 && action.type === 'defend') {
        this.behaviorPatterns.riskTolerance = Math.max(0, this.behaviorPatterns.riskTolerance - 0.1);
      }
    }
  }

  /**
   * Updates combat style with weighted averaging
   */
  private updateCombatStyle(newStyle: BehaviorPatterns['combatStyle']): void {
    // Simple weighted update - in a real implementation this would be more sophisticated
    if (this.behaviorPatterns.combatStyle !== newStyle) {
      // Gradually shift towards the new style
      this.behaviorPatterns.combatStyle = newStyle;
    }
  }

  /**
   * Updates skill level based on performance metrics
   */
  public updateSkillLevel(): void {
    const { averageEfficiency, combatsWon, combatsLost } = this.statistics;
    const winRate = combatsWon / Math.max(1, combatsWon + combatsLost);

    if (averageEfficiency > 0.8 && winRate > 0.8) {
      this.skillLevel = 'advanced';
    } else if (averageEfficiency > 0.6 && winRate > 0.6) {
      this.skillLevel = 'intermediate';
    } else {
      this.skillLevel = 'beginner';
    }
  }

  /**
   * Records combat statistics
   */
  public recordCombatResult(won: boolean, efficiency: number): void {
    if (won) {
      this.statistics.combatsWon++;
    } else {
      this.statistics.combatsLost++;
    }

    // Update average efficiency with weighted average
    const totalCombats = this.statistics.combatsWon + this.statistics.combatsLost;
    this.statistics.averageEfficiency = 
      (this.statistics.averageEfficiency * (totalCombats - 1) + efficiency) / totalCombats;

    this.updateSkillLevel();
    this.statistics.lastUpdated = new Date();
  }

  /**
   * Updates exploration statistics
   */
  public recordExplorationEvent(type: 'dungeon_cleared' | 'item_found' | 'secret_discovered'): void {
    switch (type) {
      case 'dungeon_cleared':
        this.statistics.dungeonsCleaned++;
        break;
      case 'item_found':
        this.statistics.itemsFound++;
        break;
      case 'secret_discovered':
        this.statistics.secretsDiscovered++;
        break;
    }
    this.statistics.lastUpdated = new Date();
  }

  /**
   * Updates total play time
   */
  public updatePlayTime(additionalTime: number): void {
    this.statistics.totalPlayTime += additionalTime;
    this.lastPlayed = new Date();
    this.statistics.lastUpdated = new Date();
  }

  /**
   * Serializes the profile to a plain object for saving
   */
  public toJSON(): IPlayerProfile {
    return {
      playerId: this.playerId,
      skillLevel: this.skillLevel,
      behaviorPatterns: { ...this.behaviorPatterns },
      preferences: { ...this.preferences },
      statistics: { ...this.statistics },
      createdAt: this.createdAt,
      lastPlayed: this.lastPlayed
    };
  }

  /**
   * Creates a PlayerProfile instance from saved data
   */
  public static fromJSON(data: IPlayerProfile): PlayerProfile {
    const profile = new PlayerProfile(data.playerId);
    profile.skillLevel = data.skillLevel;
    profile.behaviorPatterns = { ...data.behaviorPatterns };
    profile.preferences = { ...data.preferences };
    profile.statistics = { 
      ...data.statistics,
      lastUpdated: new Date(data.statistics.lastUpdated)
    };
    profile.createdAt = new Date(data.createdAt);
    profile.lastPlayed = new Date(data.lastPlayed);
    return profile;
  }
}