// AI system type definitions

export type CombatStyle = 'aggressive' | 'defensive' | 'balanced' | 'tactical';
export type ResourceStyle = 'conservative' | 'moderate' | 'liberal';
export type ExplorationStyle = 'thorough' | 'efficient' | 'cautious' | 'bold';
export type UIComplexity = 'minimal' | 'standard' | 'detailed' | 'comprehensive';
export type ColorScheme = 'classic' | 'high_contrast' | 'colorblind_friendly' | 'custom';
export type HintFrequency = 'never' | 'rare' | 'moderate' | 'frequent' | 'constant';

export interface BehaviorPatterns {
  combatStyle: CombatStyle;
  riskTolerance: number; // 0-1 scale
  resourceManagement: ResourceStyle;
  explorationPattern: ExplorationStyle;
}

export interface PlayerPreferences {
  uiComplexity: UIComplexity;
  colorScheme: ColorScheme;
  hintFrequency: HintFrequency;
}

export interface PlayerStatistics {
  totalPlayTime: number;
  combatsWon: number;
  combatsLost: number;
  averageEfficiency: number;
  dungeonsCleaned: number;
  itemsFound: number;
  secretsDiscovered: number;
  lastUpdated: Date;
}

export interface PlayerProfile {
  playerId: string;
  skillLevel: import('./GameTypes').PerformanceLevel;
  behaviorPatterns: BehaviorPatterns;
  preferences: PlayerPreferences;
  statistics: PlayerStatistics;
  createdAt: Date;
  lastPlayed: Date;
}

export interface TacticalSuggestion {
  id: string;
  type: 'combat' | 'exploration' | 'resource' | 'strategy';
  message: string;
  reasoning: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  context: Record<string, any>;
  timestamp: Date;
}

export interface CombatTurn {
  turnNumber: number;
  playerAction: import('./GameTypes').PlayerAction;
  enemyAction: import('./GameTypes').EnemyAction;
  gameState: import('./GameTypes').GameState;
  optimalAction: import('./GameTypes').OptimalAction;
  efficiency: number;
  damageDealt: number;
  damageTaken: number;
}

export interface DamageBreakdown {
  totalDamageDealt: number;
  totalDamageTaken: number;
  optimalDamageDealt: number;
  optimalDamageTaken: number;
  efficiency: number;
  wastedActions: number;
  missedOpportunities: string[];
}

export interface CombatAnalysis {
  combatId: string;
  turns: CombatTurn[];
  playerEfficiency: number;
  optimalStrategy: import('./GameTypes').OptimalAction[];
  damageAnalysis: DamageBreakdown;
  suggestions: TacticalSuggestion[];
  duration: number;
  outcome: 'victory' | 'defeat' | 'fled';
  timestamp: Date;
}

export interface AIHint {
  id: string;
  message: string;
  type: 'tactical' | 'strategic' | 'warning' | 'tip';
  urgency: 'low' | 'medium' | 'high';
  context: string;
  showDuration: number; // milliseconds
}