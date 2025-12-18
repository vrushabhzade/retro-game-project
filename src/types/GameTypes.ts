// Core game type definitions

export type RoomId = string;
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type PerformanceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Coordinate {
  x: number;
  y: number;
}

export type Position = Coordinate;

export interface DungeonMap {
  rooms: Room[];
  corridors: Corridor[];
  width: number;
  height: number;
  seed?: number; // For procedural generation
}

export interface Room {
  id: RoomId;
  position: Coordinate;
  width: number;
  height: number;
  type: 'normal' | 'treasure' | 'boss' | 'secret';
  items: Item[];
  enemies: Enemy[];
  connections: string[]; // Connected room/corridor IDs
}

export interface Corridor {
  id: string;
  startRoom: RoomId;
  endRoom: RoomId;
  path: Coordinate[];
}

export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'key' | 'treasure';
  position: Coordinate;
  properties: Record<string, any>;
}

export interface Enemy {
  id: string;
  name: string;
  position: Coordinate;
  health: number;
  maxHealth: number;
  attackPower: number;
  defense: number;
  aiType: 'aggressive' | 'defensive' | 'patrol' | 'guard';
}

export interface PlayerCharacter {
  id: string;
  position: Coordinate;
  health: number;
  maxHealth: number;
  level: number;
  experience: number;
  inventory: Item[];
  equipment: {
    weapon?: Item;
    armor?: Item;
    accessory?: Item;
  };
  stats: {
    strength: number;
    defense: number;
    agility: number;
    intelligence: number;
  };
  isMoving?: boolean; // For animation state
}

export interface GameState {
  id?: string; // Optional for backend compatibility
  dungeon: DungeonMap;
  player: PlayerCharacter;
  enemies: Enemy[];
  items: Item[];
  currentRoom: RoomId;
  gameTime: number;
  difficulty: DifficultyLevel;
  isInCombat: boolean;
  turnNumber: number;
}

export interface PlayerAction {
  type: 'move' | 'attack' | 'use_item' | 'cast_spell' | 'defend';
  target?: Coordinate | string;
  item?: Item;
  direction?: 'north' | 'south' | 'east' | 'west';
  timestamp: number;
}

export interface EnemyAction {
  type: 'move' | 'attack' | 'special_ability' | 'defend';
  target?: Coordinate | string;
  damage?: number;
  timestamp: number;
}

export interface OptimalAction {
  type: PlayerAction['type'];
  reasoning: string;
  expectedOutcome: string;
  efficiency: number;
}

// Backend integration types
export interface PlayerProfile {
  id: string;
  username: string;
  email: string;
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