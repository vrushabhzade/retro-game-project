import { ThoughtBubbleManager } from './ThoughtBubbleManager';
import { AIMentorSystem } from '../ai/AIMentorSystem';
import { GameState, PlayerAction } from '../types/GameTypes';
import { AIHint } from '../types/AITypes';
import { ThoughtBubbleConfig, RetroStyle } from '../types/UITypes';
import { handleError } from '../utils/ErrorHandling';

/**
 * Integration helper for connecting thought bubble system with game engine
 * Provides a simple interface for game systems to display AI mentor suggestions
 */
export class ThoughtBubbleIntegration {
  private manager: ThoughtBubbleManager;
  private aiMentor: AIMentorSystem;
  private isInitialized: boolean = false;

  constructor(
    gameContainer: HTMLElement,
    aiMentorSystem: AIMentorSystem,
    config?: Partial<ThoughtBubbleConfig>,
    style?: Partial<RetroStyle>
  ) {
    this.aiMentor = aiMentorSystem;
    this.manager = new ThoughtBubbleManager(gameContainer, aiMentorSystem, config, style);
  }

  /**
   * Initialize the thought bubble system and start real-time updates
   */
  public initialize(): void {
    try {
      if (this.isInitialized) {
        return;
      }

      this.manager.startRealTimeUpdates();
      this.isInitialized = true;
    } catch (error) {
      handleError(error, 'Failed to initialize thought bubble integration', {
        context: 'ThoughtBubbleIntegration.initialize'
      });
    }
  }

  /**
   * Update the game state and trigger AI analysis
   */
  public onGameStateChange(gameState: GameState): void {
    try {
      if (!this.isInitialized) {
        return;
      }

      this.manager.updateGameState(gameState);
    } catch (error) {
      handleError(error, 'Failed to handle game state change', {
        context: 'ThoughtBubbleIntegration.onGameStateChange'
      });
    }
  }

  /**
   * Handle player actions and trigger AI analysis
   */
  public onPlayerAction(action: PlayerAction, gameState: GameState): void {
    try {
      if (!this.isInitialized) {
        return;
      }

      // Let the AI mentor analyze the action
      this.aiMentor.analyzePlayerAction(action, gameState);

      // Update the game state for real-time hint generation
      this.manager.updateGameState(gameState);
    } catch (error) {
      handleError(error, 'Failed to handle player action', {
        context: 'ThoughtBubbleIntegration.onPlayerAction',
        actionType: action.type
      });
    }
  }

  /**
   * Manually display a specific hint (for immediate feedback)
   */
  public showHint(hint: AIHint): void {
    try {
      this.manager.displayHint(hint);
    } catch (error) {
      handleError(error, 'Failed to show hint', {
        context: 'ThoughtBubbleIntegration.showHint',
        hintId: hint.id
      });
    }
  }

  /**
   * Hide the current thought bubble
   */
  public hideHint(): void {
    try {
      this.manager.hideBubble();
    } catch (error) {
      handleError(error, 'Failed to hide hint', {
        context: 'ThoughtBubbleIntegration.hideHint'
      });
    }
  }

  /**
   * Check if a hint is currently being displayed
   */
  public isHintVisible(): boolean {
    return this.manager.isVisible();
  }

  /**
   * Get the currently displayed hint
   */
  public getCurrentHint(): AIHint | null {
    return this.manager.getCurrentHint();
  }

  /**
   * Update visual configuration
   */
  public updateConfiguration(config: Partial<ThoughtBubbleConfig>): void {
    try {
      this.manager.updateConfig(config);
    } catch (error) {
      handleError(error, 'Failed to update configuration', {
        context: 'ThoughtBubbleIntegration.updateConfiguration'
      });
    }
  }

  /**
   * Update visual styling
   */
  public updateStyling(style: Partial<RetroStyle>): void {
    try {
      this.manager.updateStyle(style);
    } catch (error) {
      handleError(error, 'Failed to update styling', {
        context: 'ThoughtBubbleIntegration.updateStyling'
      });
    }
  }

  /**
   * Set how frequently the system checks for new hints
   */
  public setUpdateFrequency(milliseconds: number): void {
    try {
      this.manager.setUpdateFrequency(milliseconds);
    } catch (error) {
      handleError(error, 'Failed to set update frequency', {
        context: 'ThoughtBubbleIntegration.setUpdateFrequency',
        frequency: milliseconds
      });
    }
  }

  /**
   * Shutdown the thought bubble system
   */
  public shutdown(): void {
    try {
      this.manager.destroy();
      this.isInitialized = false;
    } catch (error) {
      handleError(error, 'Failed to shutdown thought bubble integration', {
        context: 'ThoughtBubbleIntegration.shutdown'
      });
    }
  }

  /**
   * Create a quick hint for immediate display
   */
  public createQuickHint(
    message: string, 
    type: AIHint['type'] = 'tip', 
    urgency: AIHint['urgency'] = 'low',
    context: string = ''
  ): AIHint {
    return {
      id: `quick_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      urgency,
      context,
      showDuration: urgency === 'high' ? 6000 : urgency === 'medium' ? 4000 : 3000
    };
  }

  /**
   * Show a quick hint with simplified parameters
   */
  public showQuickHint(
    message: string, 
    type: AIHint['type'] = 'tip', 
    urgency: AIHint['urgency'] = 'low',
    context: string = ''
  ): void {
    const hint = this.createQuickHint(message, type, urgency, context);
    this.showHint(hint);
  }
}