export interface GameState {
  id: string;
  playerId: string;
  dungeonLevel: number;
  playerPosition: { x: number; y: number };
  playerStats: PlayerStats;
  inventory: Inventory;
  dungeonMap: DungeonCell[][];
  enemies: Enemy[];
  treasures: Treasure[];
  doors: Door[];
  gameStatus: 'active' | 'paused' | 'completed' | 'game_over';
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  exp: number;
  expToLevel: number;
  attack: number;
  defense: number;
  gold: number;
}

export interface Inventory {
  potions: number;
  keys: number;
  items: Item[];
}

export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'key_item';
  stats?: Partial<PlayerStats>;
  description: string;
}

export interface DungeonCell {
  type: 'wall' | 'floor' | 'door' | 'trap';
  explored: boolean;
  hasItem?: boolean;
  hasEnemy?: boolean;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  type: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  exp: number;
  gold: number;
  aiType: 'aggressive' | 'defensive' | 'smart' | 'random';
}

export interface Treasure {
  id: string;
  x: number;
  y: number;
  type: 'gold' | 'potion' | 'item';
  value: number;
  itemId?: string;
}

export interface Door {
  id: string;
  x: number;
  y: number;
  type: 'exit' | 'locked' | 'secret';
  isOpen: boolean;
  keyRequired?: string;
}

export interface PlayerProfile {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  gameStats: {
    totalPlayTime: number;
    dungeonLevelsCompleted: number;
    enemiesDefeated: number;
    goldCollected: number;
    deathCount: number;
    averageCombatEfficiency: number;
  };
  aiLearningData: AILearningData;
  visualPreferences: VisualPreferences;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}

export interface AILearningData {
  behaviorPatterns: {
    movementStyle: 'cautious' | 'aggressive' | 'exploratory' | 'efficient';
    combatPreference: 'melee' | 'magic' | 'balanced' | 'defensive';
    resourceManagement: 'conservative' | 'moderate' | 'aggressive';
    explorationPattern: 'thorough' | 'direct' | 'random';
  };
  performanceMetrics: {
    averageReactionTime: number;
    combatEfficiency: number;
    survivalRate: number;
    resourceUtilization: number;
  };
  adaptationLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  mentorInteractions: MentorInteraction[];
}

export interface MentorInteraction {
  timestamp: Date;
  context: string;
  suggestion: string;
  playerResponse: 'accepted' | 'ignored' | 'rejected';
  outcome: 'positive' | 'negative' | 'neutral';
}

export interface VisualPreferences {
  uiComplexity: 'simple' | 'moderate' | 'detailed' | 'expert';
  colorScheme: 'classic' | 'high_contrast' | 'colorblind_friendly' | 'dark';
  animationSpeed: 'slow' | 'normal' | 'fast';
  informationDensity: 'minimal' | 'standard' | 'detailed' | 'comprehensive';
  thoughtBubbleFrequency: 'rare' | 'normal' | 'frequent' | 'constant';
}

export interface CombatAnalysis {
  combatId: string;
  playerId: string;
  enemyType: string;
  duration: number;
  playerActions: CombatAction[];
  optimalActions: CombatAction[];
  efficiencyScore: number;
  damageDealt: number;
  damageTaken: number;
  resourcesUsed: {
    hp: number;
    mp: number;
    potions: number;
  };
  suggestions: string[];
  createdAt: Date;
}

export interface CombatAction {
  turn: number;
  action: 'attack' | 'cast_spell' | 'use_item' | 'defend' | 'move';
  target?: string;
  damage?: number;
  success: boolean;
  timestamp: Date;
}

export interface AIResponse {
  type: 'guidance' | 'encouragement' | 'warning' | 'analysis';
  message: string;
  context: string;
  confidence: number;
  reasoning: string[];
  suggestedActions?: string[];
}

export interface WebSocketMessage {
  type: 'game_state_update' | 'ai_response' | 'combat_analysis' | 'player_action' | 'error';
  payload: any;
  timestamp: Date;
  playerId: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}