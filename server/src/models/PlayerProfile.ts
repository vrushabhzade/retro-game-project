import mongoose, { Schema, Document } from 'mongoose';
import { PlayerProfile, AILearningData, VisualPreferences, MentorInteraction } from '../types';

const MentorInteractionSchema = new Schema<MentorInteraction>({
  timestamp: { type: Date, required: true },
  context: { type: String, required: true },
  suggestion: { type: String, required: true },
  playerResponse: { 
    type: String, 
    enum: ['accepted', 'ignored', 'rejected'], 
    required: true 
  },
  outcome: { 
    type: String, 
    enum: ['positive', 'negative', 'neutral'], 
    required: true 
  }
});

const AILearningDataSchema = new Schema<AILearningData>({
  behaviorPatterns: {
    movementStyle: { 
      type: String, 
      enum: ['cautious', 'aggressive', 'exploratory', 'efficient'],
      default: 'exploratory'
    },
    combatPreference: { 
      type: String, 
      enum: ['melee', 'magic', 'balanced', 'defensive'],
      default: 'balanced'
    },
    resourceManagement: { 
      type: String, 
      enum: ['conservative', 'moderate', 'aggressive'],
      default: 'moderate'
    },
    explorationPattern: { 
      type: String, 
      enum: ['thorough', 'direct', 'random'],
      default: 'thorough'
    }
  },
  performanceMetrics: {
    averageReactionTime: { type: Number, default: 500 },
    combatEfficiency: { type: Number, default: 50 },
    survivalRate: { type: Number, default: 70 },
    resourceUtilization: { type: Number, default: 60 }
  },
  adaptationLevel: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'beginner'
  },
  mentorInteractions: [MentorInteractionSchema]
});

const VisualPreferencesSchema = new Schema<VisualPreferences>({
  uiComplexity: { 
    type: String, 
    enum: ['simple', 'moderate', 'detailed', 'expert'],
    default: 'simple'
  },
  colorScheme: { 
    type: String, 
    enum: ['classic', 'high_contrast', 'colorblind_friendly', 'dark'],
    default: 'classic'
  },
  animationSpeed: { 
    type: String, 
    enum: ['slow', 'normal', 'fast'],
    default: 'normal'
  },
  informationDensity: { 
    type: String, 
    enum: ['minimal', 'standard', 'detailed', 'comprehensive'],
    default: 'minimal'
  },
  thoughtBubbleFrequency: { 
    type: String, 
    enum: ['rare', 'normal', 'frequent', 'constant'],
    default: 'normal'
  }
});

const PlayerProfileSchema = new Schema<PlayerProfile>({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  gameStats: {
    totalPlayTime: { type: Number, default: 0 },
    dungeonLevelsCompleted: { type: Number, default: 0 },
    enemiesDefeated: { type: Number, default: 0 },
    goldCollected: { type: Number, default: 0 },
    deathCount: { type: Number, default: 0 },
    averageCombatEfficiency: { type: Number, default: 0 }
  },
  aiLearningData: { type: AILearningDataSchema, default: () => ({}) },
  visualPreferences: { type: VisualPreferencesSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
PlayerProfileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for performance
PlayerProfileSchema.index({ username: 1 });
PlayerProfileSchema.index({ email: 1 });
PlayerProfileSchema.index({ 'aiLearningData.adaptationLevel': 1 });

export interface IPlayerProfileDocument extends PlayerProfile, Document {}

export const PlayerProfileModel = mongoose.model<IPlayerProfileDocument>('PlayerProfile', PlayerProfileSchema);