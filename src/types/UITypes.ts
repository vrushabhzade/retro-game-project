// UI system type definitions

export interface CanvasConfig {
  width: number;
  height: number;
  pixelRatio: number;
  backgroundColor: string;
}

export interface RenderConfig {
  tileSize: number;
  animationSpeed: number;
  frameRate: number;
  enableAnimations: boolean;
  pixelPerfect: boolean;
}

export interface ThoughtBubbleConfig {
  maxWidth: number;
  maxHeight: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  displayDuration: number;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface AnalysisPanelConfig {
  width: number;
  height: number;
  position: 'left' | 'right' | 'bottom';
  autoHide: boolean;
  transparency: number;
}

export interface RetroStyle {
  colorPalette: string[];
  fontFamily: string;
  fontSize: number;
  borderStyle: 'none' | 'simple' | 'detailed';
  shadowStyle: 'none' | 'drop' | 'inner';
}

export interface UIState {
  activePanel: 'game' | 'inventory' | 'combat' | 'analysis' | 'settings';
  showThoughtBubble: boolean;
  showAnalysisPanel: boolean;
  currentHint?: import('./AITypes').AIHint;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  duration: number;
  timestamp: Date;
}

export interface InputEvent {
  type: 'keydown' | 'keyup' | 'click' | 'mousemove';
  key?: string;
  button?: number;
  position?: { x: number; y: number };
  timestamp: number;
}

export interface AnimationFrame {
  frameNumber: number;
  duration: number;
  sprites: SpriteData[];
}

export interface SpriteData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sourceX: number;
  sourceY: number;
  rotation?: number;
  scale?: number;
  opacity?: number;
  priority?: number; // 1-5, higher is more important for performance optimization
}

// Re-export thought bubble related types for convenience
export { ThoughtBubbleUI } from '../ui/ThoughtBubbleUI';
export { ThoughtBubbleManager } from '../ui/ThoughtBubbleManager';
export { ThoughtBubbleIntegration } from '../ui/ThoughtBubbleIntegration';