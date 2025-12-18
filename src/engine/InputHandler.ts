import { PlayerAction } from '../types/GameTypes';
import { GameEngine } from './GameEngine';
import { MAX_INPUT_RESPONSE_TIME } from '../utils/Constants';

export type KeyBinding = {
  [key: string]: () => PlayerAction | null;
};

export interface InputConfig {
  inputCooldown: number;
  enableMouseInput: boolean;
  enableKeyRepeat: boolean;
}

// Enhanced input handling system for player actions
export class InputHandler {
  private gameEngine: GameEngine;
  private keyBindings: KeyBinding;
  private pressedKeys: Set<string> = new Set();
  private lastInputTime: number = 0;
  private config: InputConfig;
  private isEnabled: boolean = true;

  constructor(gameEngine: GameEngine, config?: Partial<InputConfig>) {
    this.gameEngine = gameEngine;
    this.config = {
      inputCooldown: MAX_INPUT_RESPONSE_TIME,
      enableMouseInput: true,
      enableKeyRepeat: false,
      ...config
    };
    this.keyBindings = this.createDefaultKeyBindings();
    this.setupEventListeners();
  }

  private createDefaultKeyBindings(): KeyBinding {
    return {
      'ArrowUp': () => this.createMoveAction('north'),
      'ArrowDown': () => this.createMoveAction('south'),
      'ArrowLeft': () => this.createMoveAction('west'),
      'ArrowRight': () => this.createMoveAction('east'),
      'w': () => this.createMoveAction('north'),
      's': () => this.createMoveAction('south'),
      'a': () => this.createMoveAction('west'),
      'd': () => this.createMoveAction('east'),
      ' ': () => this.createDefendAction(),
      'Enter': () => this.createDefendAction()
    };
  }

  private createMoveAction(direction: 'north' | 'south' | 'east' | 'west'): PlayerAction {
    return {
      type: 'move',
      direction,
      timestamp: Date.now()
    };
  }

  private createDefendAction(): PlayerAction {
    return {
      type: 'defend',
      timestamp: Date.now()
    };
  }



  private handleKeyDown(event: KeyEvent): void {
    if (!this.isEnabled) {
      return;
    }

    const key = event.key;
    
    // Handle key repeat based on configuration
    if (!this.config.enableKeyRepeat && this.pressedKeys.has(key)) {
      return;
    }

    this.pressedKeys.add(key);

    // Check input cooldown to prevent spam
    const currentTime = Date.now();
    if (currentTime - this.lastInputTime < this.config.inputCooldown) {
      return;
    }

    // Process key binding
    const actionFactory = this.keyBindings[key];
    if (actionFactory) {
      const action = actionFactory();
      if (action) {
        this.gameEngine.queueAction(action);
        this.lastInputTime = currentTime;
      }
    }
  }

  private handleKeyUp(event: KeyEvent): void {
    this.pressedKeys.delete(event.key);
  }

  private handleMouseClick(_event: MouseEvent): void {
    if (!this.isEnabled || !this.config.enableMouseInput) {
      return;
    }

    // Check input cooldown
    const currentTime = Date.now();
    if (currentTime - this.lastInputTime < this.config.inputCooldown) {
      return;
    }

    // Basic mouse handling - will be expanded for UI interactions
    // For now, just create a defend action on click
    const action: PlayerAction = {
      type: 'defend',
      timestamp: currentTime
    };
    
    this.gameEngine.queueAction(action);
    this.lastInputTime = currentTime;
  }

  // Update key bindings
  setKeyBinding(key: string, actionFactory: () => PlayerAction | null): void {
    this.keyBindings[key] = actionFactory;
  }

  // Remove key binding
  removeKeyBinding(key: string): void {
    delete this.keyBindings[key];
  }

  // Get current key bindings
  getKeyBindings(): KeyBinding {
    return { ...this.keyBindings };
  }

  // Enable or disable input handling
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.pressedKeys.clear();
    }
  }

  // Check if input is currently enabled
  isInputEnabled(): boolean {
    return this.isEnabled;
  }

  // Update input configuration
  updateConfig(config: Partial<InputConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get current configuration
  getConfig(): InputConfig {
    return { ...this.config };
  }

  // Set input cooldown
  setInputCooldown(cooldown: number): void {
    this.config.inputCooldown = Math.max(0, cooldown);
  }

  // Check if a key is currently pressed
  isKeyPressed(key: string): boolean {
    return this.pressedKeys.has(key);
  }

  // Get all currently pressed keys
  getPressedKeys(): string[] {
    return Array.from(this.pressedKeys);
  }

  // Clear all pressed keys (useful for focus loss)
  clearPressedKeys(): void {
    this.pressedKeys.clear();
  }

  // Add support for focus events to clear keys when window loses focus
  private handleFocusLoss(): void {
    this.clearPressedKeys();
  }

  // Enhanced event listener setup
  private setupEventListeners(): void {
    // Keyboard event listeners
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Mouse event listeners
    if (this.config.enableMouseInput) {
      document.addEventListener('click', this.handleMouseClick.bind(this));
    }

    // Focus event listeners to handle window focus loss
    window.addEventListener('blur', this.handleFocusLoss.bind(this));
    window.addEventListener('focus', this.handleFocusLoss.bind(this));
    
    // Prevent default behavior for game keys
    document.addEventListener('keydown', (event) => {
      if (this.keyBindings[event.key]) {
        event.preventDefault();
      }
    });
  }

  // Clean up event listeners
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    document.removeEventListener('click', this.handleMouseClick.bind(this));
    window.removeEventListener('blur', this.handleFocusLoss.bind(this));
    window.removeEventListener('focus', this.handleFocusLoss.bind(this));
    this.pressedKeys.clear();
  }
}

// Type for keyboard events
interface KeyEvent extends Event {
  key: string;
}