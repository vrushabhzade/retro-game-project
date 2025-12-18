import { ThoughtBubbleUI } from './ThoughtBubbleUI';
import { AIMentorSystem } from '../ai/AIMentorSystem';
import { AIHint } from '../types/AITypes';
import { GameState } from '../types/GameTypes';
import { ThoughtBubbleConfig, RetroStyle } from '../types/UITypes';
import { handleError } from '../utils/ErrorHandling';

/**
 * Manager class that coordinates real-time updates between AI mentor and thought bubble UI
 * Implements the real-time update system for mentor suggestions
 */
export class ThoughtBubbleManager {
  private thoughtBubbleUI: ThoughtBubbleUI;
  private aiMentorSystem: AIMentorSystem;
  private updateInterval: number | null = null;
  private isActive: boolean = false;
  private lastGameState: GameState | null = null;
  private updateFrequency: number = 1000; // Check for updates every second
  private lastHintId: string | null = null;

  constructor(
    container: HTMLElement,
    aiMentorSystem: AIMentorSystem,
    config: Partial<ThoughtBubbleConfig> = {},
    style: Partial<RetroStyle> = {}
  ) {
    this.thoughtBubbleUI = new ThoughtBubbleUI(container, config, style);
    this.aiMentorSystem = aiMentorSystem;
  }

  /**
   * Start the real-time update system
   */
  public startRealTimeUpdates(): void {
    try {
      if (this.isActive) {
        return; // Already running
      }

      this.isActive = true;
      this.updateInterval = window.setInterval(() => {
        this.checkForUpdates();
      }, this.updateFrequency);

    } catch (error) {
      handleError(error, 'Failed to start real-time updates', { 
        context: 'ThoughtBubbleManager.startRealTimeUpdates' 
      });
    }
  }

  /**
   * Stop the real-time update system
   */
  public stopRealTimeUpdates(): void {
    try {
      this.isActive = false;
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
    } catch (error) {
      handleError(error, 'Failed to stop real-time updates', { 
        context: 'ThoughtBubbleManager.stopRealTimeUpdates' 
      });
    }
  }

  /**
   * Update the game state and trigger hint generation if needed
   */
  public updateGameState(gameState: GameState): void {
    try {
      this.lastGameState = gameState;
      
      // Immediately check for new hints when game state changes
      if (this.isActive) {
        this.checkForUpdates();
      }
    } catch (error) {
      handleError(error, 'Failed to update game state', { 
        context: 'ThoughtBubbleManager.updateGameState' 
      });
    }
  }

  /**
   * Manually trigger hint display (for immediate suggestions)
   */
  public displayHint(hint: AIHint): void {
    try {
      this.lastHintId = hint.id;
      this.thoughtBubbleUI.displayHint(hint);
    } catch (error) {
      handleError(error, 'Failed to display hint', { 
        context: 'ThoughtBubbleManager.displayHint',
        hintId: hint.id 
      });
    }
  }

  /**
   * Hide the current thought bubble
   */
  public hideBubble(): void {
    try {
      this.thoughtBubbleUI.hideBubble();
      this.lastHintId = null;
    } catch (error) {
      handleError(error, 'Failed to hide bubble', { 
        context: 'ThoughtBubbleManager.hideBubble' 
      });
    }
  }

  /**
   * Check if the thought bubble is currently visible
   */
  public isVisible(): boolean {
    return this.thoughtBubbleUI.isDisplayed();
  }

  /**
   * Update the visual configuration
   */
  public updateConfig(config: Partial<ThoughtBubbleConfig>): void {
    this.thoughtBubbleUI.updateConfig(config);
  }

  /**
   * Update the visual style
   */
  public updateStyle(style: Partial<RetroStyle>): void {
    this.thoughtBubbleUI.updateStyle(style);
  }

  /**
   * Set the update frequency for real-time checks
   */
  public setUpdateFrequency(milliseconds: number): void {
    this.updateFrequency = Math.max(100, milliseconds); // Minimum 100ms
    
    // Restart the interval if currently active
    if (this.isActive) {
      this.stopRealTimeUpdates();
      this.startRealTimeUpdates();
    }
  }

  /**
   * Get the current hint being displayed
   */
  public getCurrentHint(): AIHint | null {
    return this.thoughtBubbleUI.getCurrentHint();
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    try {
      this.stopRealTimeUpdates();
      this.thoughtBubbleUI.destroy();
      this.lastHintId = null;
      this.lastGameState = null;
    } catch (error) {
      handleError(error, 'Failed to destroy thought bubble manager', { 
        context: 'ThoughtBubbleManager.destroy' 
      });
    }
  }

  // Private methods

  private checkForUpdates(): void {
    try {
      if (!this.lastGameState) {
        return; // No game state to work with
      }

      // Generate a hint from the AI mentor system
      const hint = this.aiMentorSystem.generateHint(this.lastGameState);
      
      if (hint && hint.id !== this.lastHintId) {
        // New hint available, display it
        this.displayHint(hint);
      }
    } catch (error) {
      handleError(error, 'Failed to check for updates', { 
        context: 'ThoughtBubbleManager.checkForUpdates' 
      });
    }
  }
}