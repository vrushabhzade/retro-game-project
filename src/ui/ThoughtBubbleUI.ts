import { AIHint } from '../types/AITypes';
import { ThoughtBubbleConfig, RetroStyle } from '../types/UITypes';
import { handleError } from '../utils/ErrorHandling';
import { 
  injectThoughtBubbleStyles, 
  getRetroThemeClass, 
  getUrgencyClass, 
  getTypeClass 
} from './ThoughtBubbleStyles';

/**
 * ThoughtBubbleUI component for displaying AI mentor reasoning
 * Implements requirement 2.3: Display mentor's reasoning process in real-time
 */
export class ThoughtBubbleUI {
  private container: HTMLElement;
  private bubbleElement: HTMLElement | null = null;
  private currentHint: AIHint | null = null;
  private config: ThoughtBubbleConfig;
  private style: RetroStyle;
  private isVisible: boolean = false;
  private fadeTimeout: number | null = null;
  private displayTimeout: number | null = null;
  private animationFrame: number | null = null;

  constructor(
    container: HTMLElement,
    config: Partial<ThoughtBubbleConfig> = {},
    style: Partial<RetroStyle> = {}
  ) {
    this.container = container;
    this.config = {
      maxWidth: 300,
      maxHeight: 200,
      fadeInDuration: 300,
      fadeOutDuration: 500,
      displayDuration: 4000,
      position: 'top-right',
      ...config
    };
    this.style = {
      colorPalette: ['#000000', '#FFFFFF', '#808080', '#C0C0C0'],
      fontFamily: 'monospace',
      fontSize: 12,
      borderStyle: 'simple',
      shadowStyle: 'drop',
      ...style
    };

    // Inject CSS styles for enhanced styling
    injectThoughtBubbleStyles();
    this.initializeContainer();
  }

  /**
   * Display a new AI hint in the thought bubble
   */
  public displayHint(hint: AIHint): void {
    try {
      // Clear any existing timeouts
      this.clearTimeouts();

      // Store the current hint
      this.currentHint = hint;

      // Create or update the bubble element
      this.createBubbleElement();
      this.updateBubbleContent();
      this.positionBubble();

      // Show the bubble with fade-in animation
      this.showBubble();

      // Set up auto-hide timer based on hint duration
      this.displayTimeout = window.setTimeout(() => {
        this.hideBubble();
      }, hint.showDuration || this.config.displayDuration);

    } catch (error) {
      handleError(error, 'Failed to display hint in thought bubble', { 
        context: 'ThoughtBubbleUI.displayHint',
        hintId: hint.id 
      });
    }
  }

  /**
   * Hide the current thought bubble
   */
  public hideBubble(): void {
    try {
      if (!this.isVisible || !this.bubbleElement) {
        return;
      }

      this.isVisible = false;
      this.currentHint = null; // Clear immediately for responsiveness
      this.clearTimeouts();

      // Fade out animation
      this.bubbleElement.style.transition = `opacity ${this.config.fadeOutDuration}ms ease-out`;
      this.bubbleElement.style.opacity = '0';

      // Remove element after fade out
      this.fadeTimeout = window.setTimeout(() => {
        if (this.bubbleElement && this.bubbleElement.parentNode) {
          this.bubbleElement.parentNode.removeChild(this.bubbleElement);
          this.bubbleElement = null;
        }
      }, this.config.fadeOutDuration);

    } catch (error) {
      handleError(error, 'Failed to hide thought bubble', { 
        context: 'ThoughtBubbleUI.hideBubble' 
      });
    }
  }

  /**
   * Update the thought bubble with new content while keeping it visible
   */
  public updateHint(hint: AIHint): void {
    try {
      if (!this.isVisible || !this.bubbleElement) {
        // If not currently visible, just display the new hint
        this.displayHint(hint);
        return;
      }

      // Update the current hint
      this.currentHint = hint;
      this.updateBubbleContent();

      // Reset the display timer
      this.clearDisplayTimeout();
      this.displayTimeout = window.setTimeout(() => {
        this.hideBubble();
      }, hint.showDuration || this.config.displayDuration);

    } catch (error) {
      handleError(error, 'Failed to update thought bubble hint', { 
        context: 'ThoughtBubbleUI.updateHint',
        hintId: hint.id 
      });
    }
  }

  /**
   * Check if the thought bubble is currently visible
   */
  public isDisplayed(): boolean {
    return this.isVisible;
  }

  /**
   * Get the currently displayed hint
   */
  public getCurrentHint(): AIHint | null {
    return this.currentHint;
  }

  /**
   * Update the visual configuration
   */
  public updateConfig(config: Partial<ThoughtBubbleConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.bubbleElement) {
      this.positionBubble();
    }
  }

  /**
   * Update the visual style
   */
  public updateStyle(style: Partial<RetroStyle>): void {
    this.style = { ...this.style, ...style };
    if (this.bubbleElement) {
      this.applyRetroStyling();
    }
  }

  /**
   * Clean up resources and event listeners
   */
  public destroy(): void {
    try {
      this.clearTimeouts();
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      if (this.bubbleElement && this.bubbleElement.parentNode) {
        this.bubbleElement.parentNode.removeChild(this.bubbleElement);
      }
      this.bubbleElement = null;
      this.currentHint = null;
      this.isVisible = false;
    } catch (error) {
      handleError(error, 'Failed to destroy thought bubble UI', { 
        context: 'ThoughtBubbleUI.destroy' 
      });
    }
  }

  // Private methods

  private initializeContainer(): void {
    // Ensure the container has relative positioning for absolute positioning of bubbles
    try {
      if (typeof getComputedStyle !== 'undefined' && getComputedStyle(this.container).position === 'static') {
        this.container.style.position = 'relative';
      }
    } catch (error) {
      // Fallback for test environments or when getComputedStyle is not available
      if (!this.container.style.position || this.container.style.position === 'static') {
        this.container.style.position = 'relative';
      }
    }
  }

  private createBubbleElement(): void {
    if (this.bubbleElement) {
      return; // Already exists
    }

    this.bubbleElement = document.createElement('div');
    this.bubbleElement.className = 'thought-bubble';
    
    // Add retro theme class based on color scheme
    const themeClass = this.getThemeClass();
    if (themeClass) {
      this.bubbleElement.classList.add(themeClass);
    }
    
    this.applyBaseStyling();
    this.applyRetroStyling();
    
    this.container.appendChild(this.bubbleElement);
  }

  private applyBaseStyling(): void {
    if (!this.bubbleElement) return;

    const bubble = this.bubbleElement;
    bubble.style.position = 'absolute';
    bubble.style.zIndex = '1000';
    bubble.style.maxWidth = `${this.config.maxWidth}px`;
    bubble.style.maxHeight = `${this.config.maxHeight}px`;
    bubble.style.padding = '12px 16px';
    bubble.style.borderRadius = '8px';
    bubble.style.wordWrap = 'break-word';
    bubble.style.pointerEvents = 'none';
    bubble.style.opacity = '0';
    bubble.style.transform = 'scale(0.8)';
    bubble.style.transformOrigin = this.getTransformOrigin();
  }

  private applyRetroStyling(): void {
    if (!this.bubbleElement) return;

    const bubble = this.bubbleElement;
    const colors = this.style.colorPalette;

    // Background and border
    bubble.style.backgroundColor = colors[1] || '#FFFFFF';
    bubble.style.color = colors[0] || '#000000';
    bubble.style.fontFamily = this.style.fontFamily;
    bubble.style.fontSize = `${this.style.fontSize}px`;
    bubble.style.lineHeight = '1.4';

    // Border styling
    switch (this.style.borderStyle) {
      case 'simple':
        bubble.style.border = `2px solid ${colors[0] || '#000000'}`;
        break;
      case 'detailed':
        bubble.style.border = `3px solid ${colors[0] || '#000000'}`;
        bubble.style.borderStyle = 'ridge';
        break;
      case 'none':
      default:
        bubble.style.border = 'none';
        break;
    }

    // Shadow styling
    switch (this.style.shadowStyle) {
      case 'drop':
        bubble.style.boxShadow = `4px 4px 8px ${colors[2] || '#808080'}`;
        break;
      case 'inner':
        bubble.style.boxShadow = `inset 2px 2px 4px ${colors[2] || '#808080'}`;
        break;
      case 'none':
      default:
        bubble.style.boxShadow = 'none';
        break;
    }
  }

  private updateBubbleContent(): void {
    if (!this.bubbleElement || !this.currentHint) return;

    const hint = this.currentHint;
    
    // Create the content structure
    const content = document.createElement('div');
    
    // Add urgency indicator with CSS classes
    const urgencyIndicator = document.createElement('div');
    urgencyIndicator.className = getUrgencyClass(hint.urgency);
    urgencyIndicator.style.fontSize = '10px';
    urgencyIndicator.style.fontWeight = 'bold';
    urgencyIndicator.style.marginBottom = '4px';
    urgencyIndicator.style.textTransform = 'uppercase';
    urgencyIndicator.textContent = this.getUrgencyText(hint.urgency);
    urgencyIndicator.style.color = this.getUrgencyColor(hint.urgency);
    content.appendChild(urgencyIndicator);

    // Add main message with type class
    const message = document.createElement('div');
    message.className = getTypeClass(hint.type);
    message.style.marginBottom = '6px';
    message.textContent = hint.message;
    content.appendChild(message);

    // Add context if available
    if (hint.context && hint.context.trim()) {
      const context = document.createElement('div');
      context.style.fontSize = `${this.style.fontSize - 1}px`;
      context.style.fontStyle = 'italic';
      context.style.color = this.style.colorPalette[2] || '#808080';
      context.textContent = `Context: ${hint.context}`;
      content.appendChild(context);
    }

    // Add type indicator
    const typeIndicator = document.createElement('div');
    typeIndicator.style.fontSize = '9px';
    typeIndicator.style.textAlign = 'right';
    typeIndicator.style.marginTop = '4px';
    typeIndicator.style.color = this.style.colorPalette[2] || '#808080';
    typeIndicator.textContent = `[${hint.type.toUpperCase()}]`;
    content.appendChild(typeIndicator);

    // Clear existing content and add new content
    this.bubbleElement.innerHTML = '';
    this.bubbleElement.appendChild(content);
  }

  private positionBubble(): void {
    if (!this.bubbleElement) return;

    const bubble = this.bubbleElement;

    // Reset positioning
    bubble.style.top = 'auto';
    bubble.style.right = 'auto';
    bubble.style.bottom = 'auto';
    bubble.style.left = 'auto';

    switch (this.config.position) {
      case 'top-left':
        bubble.style.top = '10px';
        bubble.style.left = '10px';
        break;
      case 'top-right':
        bubble.style.top = '10px';
        bubble.style.right = '10px';
        break;
      case 'bottom-left':
        bubble.style.bottom = '10px';
        bubble.style.left = '10px';
        break;
      case 'bottom-right':
        bubble.style.bottom = '10px';
        bubble.style.right = '10px';
        break;
    }
  }

  private showBubble(): void {
    if (!this.bubbleElement) return;

    this.isVisible = true;
    
    // Trigger reflow to ensure initial styles are applied
    this.bubbleElement.offsetHeight;

    // Animate in
    this.bubbleElement.style.transition = `opacity ${this.config.fadeInDuration}ms ease-in, transform ${this.config.fadeInDuration}ms ease-in`;
    this.bubbleElement.style.opacity = '1';
    this.bubbleElement.style.transform = 'scale(1)';
  }

  private getTransformOrigin(): string {
    switch (this.config.position) {
      case 'top-left':
        return 'top left';
      case 'top-right':
        return 'top right';
      case 'bottom-left':
        return 'bottom left';
      case 'bottom-right':
        return 'bottom right';
      default:
        return 'center';
    }
  }

  private getUrgencyText(urgency: AIHint['urgency']): string {
    switch (urgency) {
      case 'high':
        return '⚠ URGENT';
      case 'medium':
        return '● NOTICE';
      case 'low':
        return '○ TIP';
      default:
        return '○ INFO';
    }
  }

  private getUrgencyColor(urgency: AIHint['urgency']): string {
    switch (urgency) {
      case 'high':
        return '#FF4444';
      case 'medium':
        return '#FF8800';
      case 'low':
        return '#4488FF';
      default:
        return this.style.colorPalette[2] || '#808080';
    }
  }

  private clearTimeouts(): void {
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
    this.clearDisplayTimeout();
  }

  private clearDisplayTimeout(): void {
    if (this.displayTimeout) {
      clearTimeout(this.displayTimeout);
      this.displayTimeout = null;
    }
  }

  private getThemeClass(): string | null {
    // Map color schemes to CSS theme classes
    switch (this.style.colorPalette[0]) {
      case '#00ff00':
      case '#00FF00':
        return getRetroThemeClass('green');
      case '#ffaa00':
      case '#FFAA00':
        return getRetroThemeClass('amber');
      default:
        if (this.style.colorPalette.length === 2 && 
            this.style.colorPalette[0] === '#000000' && 
            this.style.colorPalette[1] === '#ffffff') {
          return getRetroThemeClass('high-contrast');
        }
        return getRetroThemeClass('classic');
    }
  }
}