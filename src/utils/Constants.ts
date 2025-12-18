// Game constants and configuration values

// Performance constants
export const MAX_FRAME_RATE = 60;
export const TARGET_FRAME_TIME = 1000 / MAX_FRAME_RATE; // ~16.67ms
export const MAX_INPUT_RESPONSE_TIME = 100; // milliseconds
export const AI_PROCESSING_THROTTLE_TIME = 50; // milliseconds

// Dungeon generation constants
export const MIN_DUNGEON_SIZE = 10;
export const MAX_DUNGEON_SIZE = 50;
export const MIN_ROOMS = 3;
export const MAX_ROOMS = 20;
export const MIN_ROOM_SIZE = 3;
export const MAX_ROOM_SIZE = 8;

// Combat constants
export const BASE_ATTACK_DAMAGE = 10;
export const BASE_DEFENSE = 5;
export const CRITICAL_HIT_MULTIPLIER = 2.0;
export const CRITICAL_HIT_CHANCE = 0.1; // 10%

// AI constants
export const DEFAULT_PERFORMANCE_THRESHOLD = 0.7; // 70% efficiency
export const BEHAVIOR_LEARNING_RATE = 0.1;
export const MIN_ACTIONS_FOR_ANALYSIS = 10;
export const HINT_COOLDOWN_TIME = 5000; // 5 seconds

// UI constants
export const DEFAULT_TILE_SIZE = 32; // pixels
export const THOUGHT_BUBBLE_MAX_WIDTH = 300;
export const THOUGHT_BUBBLE_DISPLAY_TIME = 3000; // 3 seconds
export const NOTIFICATION_DISPLAY_TIME = 2000; // 2 seconds

// Save system constants
export const SAVE_FILE_VERSION = '1.0.0';
export const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
export const MAX_SAVE_SLOTS = 10;

// Property testing constants
export const PROPERTY_TEST_ITERATIONS = 100;
export const PROPERTY_TEST_TIMEOUT = 5000; // 5 seconds per test

// Color schemes
export const RETRO_COLOR_PALETTES = {
  classic: ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
  gameboy: ['#0F380F', '#306230', '#8BAC0F', '#9BBD0F'],
  commodore64: ['#000000', '#FFFFFF', '#68372B', '#70A4B2', '#6F3D86', '#588D43', '#352879', '#B8C76F'],
  amber: ['#000000', '#FF7E00', '#FFBF00', '#FFFF00']
} as const;

export type ColorPaletteName = keyof typeof RETRO_COLOR_PALETTES;