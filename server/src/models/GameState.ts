import mongoose, { Schema, Document } from 'mongoose';
import { GameState, PlayerStats, Inventory, Item, DungeonCell, Enemy, Treasure, Door } from '../types';

const ItemSchema = new Schema<Item>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['weapon', 'armor', 'consumable', 'key_item'], 
    required: true 
  },
  stats: {
    hp: { type: Number },
    maxHp: { type: Number },
    mp: { type: Number },
    maxMp: { type: Number },
    level: { type: Number },
    exp: { type: Number },
    expToLevel: { type: Number },
    attack: { type: Number },
    defense: { type: Number },
    gold: { type: Number }
  },
  description: { type: String, required: true }
});

const InventorySchema = new Schema<Inventory>({
  potions: { type: Number, default: 0 },
  keys: { type: Number, default: 0 },
  items: [ItemSchema]
});

const PlayerStatsSchema = new Schema<PlayerStats>({
  hp: { type: Number, required: true },
  maxHp: { type: Number, required: true },
  mp: { type: Number, required: true },
  maxMp: { type: Number, required: true },
  level: { type: Number, required: true },
  exp: { type: Number, required: true },
  expToLevel: { type: Number, required: true },
  attack: { type: Number, required: true },
  defense: { type: Number, required: true },
  gold: { type: Number, required: true }
});

const DungeonCellSchema = new Schema<DungeonCell>({
  type: { 
    type: String, 
    enum: ['wall', 'floor', 'door', 'trap'], 
    required: true 
  },
  explored: { type: Boolean, default: false },
  hasItem: { type: Boolean, default: false },
  hasEnemy: { type: Boolean, default: false }
});

const EnemySchema = new Schema<Enemy>({
  id: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  type: { type: String, required: true },
  hp: { type: Number, required: true },
  maxHp: { type: Number, required: true },
  attack: { type: Number, required: true },
  defense: { type: Number, required: true },
  exp: { type: Number, required: true },
  gold: { type: Number, required: true },
  aiType: { 
    type: String, 
    enum: ['aggressive', 'defensive', 'smart', 'random'], 
    default: 'random' 
  }
});

const TreasureSchema = new Schema<Treasure>({
  id: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  type: { 
    type: String, 
    enum: ['gold', 'potion', 'item'], 
    required: true 
  },
  value: { type: Number, required: true },
  itemId: { type: String }
});

const DoorSchema = new Schema<Door>({
  id: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  type: { 
    type: String, 
    enum: ['exit', 'locked', 'secret'], 
    required: true 
  },
  isOpen: { type: Boolean, default: false },
  keyRequired: { type: String }
});

const GameStateSchema = new Schema<GameState>({
  id: { type: String, required: true, unique: true },
  playerId: { type: String, required: true },
  dungeonLevel: { type: Number, required: true, default: 1 },
  playerPosition: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  playerStats: { type: PlayerStatsSchema, required: true },
  inventory: { type: InventorySchema, required: true },
  dungeonMap: [[DungeonCellSchema]],
  enemies: [EnemySchema],
  treasures: [TreasureSchema],
  doors: [DoorSchema],
  gameStatus: { 
    type: String, 
    enum: ['active', 'paused', 'completed', 'game_over'], 
    default: 'active' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
GameStateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for performance
GameStateSchema.index({ playerId: 1, gameStatus: 1 });
GameStateSchema.index({ createdAt: -1 });

export interface IGameStateDocument extends GameState, Document {}

export const GameStateModel = mongoose.model<IGameStateDocument>('GameState', GameStateSchema);