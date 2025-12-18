import mongoose, { Schema, Document } from 'mongoose';
import { CombatAnalysis, CombatAction } from '../types';

const CombatActionSchema = new Schema<CombatAction>({
  turn: { type: Number, required: true },
  action: { 
    type: String, 
    enum: ['attack', 'cast_spell', 'use_item', 'defend', 'move'], 
    required: true 
  },
  target: { type: String },
  damage: { type: Number },
  success: { type: Boolean, required: true },
  timestamp: { type: Date, required: true }
});

const CombatAnalysisSchema = new Schema<CombatAnalysis>({
  combatId: { type: String, required: true, unique: true },
  playerId: { type: String, required: true },
  enemyType: { type: String, required: true },
  duration: { type: Number, required: true },
  playerActions: [CombatActionSchema],
  optimalActions: [CombatActionSchema],
  efficiencyScore: { type: Number, required: true, min: 0, max: 100 },
  damageDealt: { type: Number, required: true },
  damageTaken: { type: Number, required: true },
  resourcesUsed: {
    hp: { type: Number, required: true },
    mp: { type: Number, required: true },
    potions: { type: Number, required: true }
  },
  suggestions: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

// Indexes for performance
CombatAnalysisSchema.index({ playerId: 1, createdAt: -1 });
CombatAnalysisSchema.index({ enemyType: 1 });
CombatAnalysisSchema.index({ efficiencyScore: -1 });

export interface ICombatAnalysisDocument extends CombatAnalysis, Document {}

export const CombatAnalysisModel = mongoose.model<ICombatAnalysisDocument>('CombatAnalysis', CombatAnalysisSchema);