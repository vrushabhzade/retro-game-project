import { 
  PlayerProfile, 
  UIComplexity, 
  ColorScheme
} from '../types/AITypes';
import { 
  PerformanceLevel 
} from '../types/GameTypes';
import { 
  RetroStyle, 
  RenderConfig, 
  ThoughtBubbleConfig, 
  AnalysisPanelConfig 
} from '../types/UITypes';
import { handleError } from '../utils/ErrorHandling';
import { PerformanceManager } from '../utils/PerformanceManager';

/**
 * Visual Adaptation Engine that adjusts UI complexity and styling based on player performance
 * Implements requirements 3.1, 3.2, 3.3, 3.5
 */
export class VisualAdaptationEngine {
  private playerProfile: PlayerProfile | null = null;
  private currentUIComplexity: UIComplexity = 'standard';
  private currentColorScheme: ColorScheme = 'classic';
  private adaptationEnabled: boolean = true;
  private performanceThresholds = {
    beginner: { efficiency: 0.4, winRate: 0.4 },
    intermediate: { efficiency: 0.6, winRate: 0.6 },
    advanced: { efficiency: 0.8, winRate: 0.8 }
  };
  private performanceManager: PerformanceManager;

  constructor() {
    this.currentUIComplexity = 'standard';
    this.currentColorScheme = 'classic';
    this.performanceManager = PerformanceManager.getInstance();
  }

  /**
   * Initialize the visual adaptation engine with a player profile
   * Requirement 3.1: Initialize with simplified UI elements for new players
   */
  public initialize(profile: PlayerProfile): void {
    try {
      this.playerProfile = profile;
      
      // Set initial UI complexity based on skill level
      if (profile.skillLevel === 'beginner') {
        this.currentUIComplexity = 'minimal';
      } else if (profile.skillLevel === 'intermediate') {
        this.currentUIComplexity = 'standard';
      } else {
        this.currentUIComplexity = 'detailed';
      }

      // Apply saved preferences
      this.currentUIComplexity = profile.preferences.uiComplexity;
      this.currentColorScheme = profile.preferences.colorScheme;

    } catch (error) {
      handleError(error, 'Failed to initialize visual adaptation engine', { 
        context: 'VisualAdaptationEngine.initialize' 
      });
    }
  }

  /**
   * Assess current player performance level based on statistics
   * Requirement 3.2: Detect improved player performance
   */
  public assessPerformanceLevel(): PerformanceLevel {
    try {
      if (!this.playerProfile) {
        return 'beginner';
      }

      const stats = this.playerProfile.statistics;
      const totalCombats = stats.combatsWon + stats.combatsLost;
      const winRate = totalCombats > 0 ? stats.combatsWon / totalCombats : 0;
      const efficiency = stats.averageEfficiency;

      // Determine performance level based on thresholds
      if (efficiency >= this.performanceThresholds.advanced.efficiency && 
          winRate >= this.performanceThresholds.advanced.winRate &&
          totalCombats >= 20) {
        return 'advanced';
      } else if (efficiency >= this.performanceThresholds.intermediate.efficiency && 
                 winRate >= this.performanceThresholds.intermediate.winRate &&
                 totalCombats >= 10) {
        return 'intermediate';
      } else {
        return 'beginner';
      }

    } catch (error) {
      handleError(error, 'Failed to assess performance level', { 
        context: 'VisualAdaptationEngine.assessPerformanceLevel' 
      });
      return 'beginner';
    }
  }

  /**
   * Adapt UI complexity based on current performance level
   * Requirement 3.2: Gradually increase UI complexity with improved performance
   * Requirement 3.3: Provide detailed analytics for advanced players
   */
  public adaptUIComplexity(performanceLevel?: PerformanceLevel): UIComplexity {
    try {
      if (!this.adaptationEnabled || !this.playerProfile) {
        return this.currentUIComplexity;
      }

      const level = performanceLevel || this.assessPerformanceLevel();
      let targetComplexity: UIComplexity;

      // Map performance level to UI complexity
      switch (level) {
        case 'beginner':
          targetComplexity = 'minimal';
          break;
        case 'intermediate':
          targetComplexity = 'standard';
          break;
        case 'advanced':
          targetComplexity = 'comprehensive';
          break;
        default:
          targetComplexity = 'standard';
      }

      // Gradual adaptation - don't jump more than one level at a time
      const complexityLevels: UIComplexity[] = ['minimal', 'standard', 'detailed', 'comprehensive'];
      const currentIndex = complexityLevels.indexOf(this.currentUIComplexity);
      const targetIndex = complexityLevels.indexOf(targetComplexity);

      if (targetIndex > currentIndex) {
        // Increase complexity gradually
        const newIndex = Math.min(currentIndex + 1, targetIndex);
        this.currentUIComplexity = complexityLevels[newIndex] || 'standard';
      } else if (targetIndex < currentIndex) {
        // Decrease complexity if performance drops
        const newIndex = Math.max(currentIndex - 1, targetIndex);
        this.currentUIComplexity = complexityLevels[newIndex] || 'standard';
      }

      // Update player preferences
      this.playerProfile.preferences.uiComplexity = this.currentUIComplexity;

      return this.currentUIComplexity;

    } catch (error) {
      handleError(error, 'Failed to adapt UI complexity', { 
        context: 'VisualAdaptationEngine.adaptUIComplexity' 
      });
      return this.currentUIComplexity;
    }
  }

  /**
   * Update color scheme based on preferences and accessibility needs
   * Requirement 3.4: Adjust visual elements smoothly without disrupting gameplay
   */
  public updateColorScheme(scheme: ColorScheme): void {
    try {
      this.currentColorScheme = scheme;
      
      if (this.playerProfile) {
        this.playerProfile.preferences.colorScheme = scheme;
      }

    } catch (error) {
      handleError(error, 'Failed to update color scheme', { 
        context: 'VisualAdaptationEngine.updateColorScheme' 
      });
    }
  }

  /**
   * Get current retro style configuration based on complexity and color scheme
   */
  public getRetroStyle(): RetroStyle {
    try {
      const baseStyle: RetroStyle = {
        colorPalette: this.getColorPalette(),
        fontFamily: 'monospace',
        fontSize: this.getFontSize(),
        borderStyle: this.getBorderStyle(),
        shadowStyle: this.getShadowStyle()
      };

      return baseStyle;

    } catch (error) {
      handleError(error, 'Failed to get retro style', { 
        context: 'VisualAdaptationEngine.getRetroStyle' 
      });
      return this.getDefaultRetroStyle();
    }
  }

  /**
   * Get render configuration based on current UI complexity and performance
   */
  public getRenderConfig(): RenderConfig {
    try {
      // Get adaptive settings from performance manager
      const adaptiveSettings = this.performanceManager.getAdaptiveSettings();
      
      const baseConfig: RenderConfig = {
        tileSize: this.getTileSize(),
        animationSpeed: this.getAnimationSpeed(adaptiveSettings),
        frameRate: 60,
        enableAnimations: this.shouldEnableAnimations(adaptiveSettings),
        pixelPerfect: !adaptiveSettings.renderOptimizations
      };

      return baseConfig;

    } catch (error) {
      handleError(error, 'Failed to get render config', { 
        context: 'VisualAdaptationEngine.getRenderConfig' 
      });
      return this.getDefaultRenderConfig();
    }
  }

  /**
   * Get thought bubble configuration based on UI complexity
   */
  public getThoughtBubbleConfig(): ThoughtBubbleConfig {
    try {
      const complexity = this.currentUIComplexity;
      
      return {
        maxWidth: complexity === 'minimal' ? 200 : complexity === 'comprehensive' ? 400 : 300,
        maxHeight: complexity === 'minimal' ? 100 : complexity === 'comprehensive' ? 200 : 150,
        fadeInDuration: 300,
        fadeOutDuration: 200,
        displayDuration: this.getDisplayDuration(),
        position: 'top-right'
      };

    } catch (error) {
      handleError(error, 'Failed to get thought bubble config', { 
        context: 'VisualAdaptationEngine.getThoughtBubbleConfig' 
      });
      return this.getDefaultThoughtBubbleConfig();
    }
  }

  /**
   * Get analysis panel configuration based on UI complexity
   */
  public getAnalysisPanelConfig(): AnalysisPanelConfig {
    try {
      const complexity = this.currentUIComplexity;
      
      return {
        width: complexity === 'comprehensive' ? 400 : complexity === 'detailed' ? 300 : 200,
        height: complexity === 'comprehensive' ? 600 : complexity === 'detailed' ? 400 : 200,
        position: 'right',
        autoHide: complexity === 'minimal',
        transparency: complexity === 'minimal' ? 0.8 : 0.9
      };

    } catch (error) {
      handleError(error, 'Failed to get analysis panel config', { 
        context: 'VisualAdaptationEngine.getAnalysisPanelConfig' 
      });
      return this.getDefaultAnalysisPanelConfig();
    }
  }

  /**
   * Check if visual preferences should be persisted
   * Requirement 3.5: Persist visual preferences for future sessions
   */
  public shouldPersistPreferences(): boolean {
    return this.playerProfile !== null;
  }

  /**
   * Get current UI complexity level
   */
  public getCurrentUIComplexity(): UIComplexity {
    return this.currentUIComplexity;
  }

  /**
   * Get current color scheme
   */
  public getCurrentColorScheme(): ColorScheme {
    return this.currentColorScheme;
  }

  /**
   * Enable or disable automatic adaptation
   */
  public setAdaptationEnabled(enabled: boolean): void {
    this.adaptationEnabled = enabled;
  }

  /**
   * Update performance thresholds for adaptation
   */
  public updatePerformanceThresholds(thresholds: typeof this.performanceThresholds): void {
    this.performanceThresholds = { ...thresholds };
  }

  // Private helper methods

  private getColorPalette(): string[] {
    const palettes = {
      classic: ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
      high_contrast: ['#000000', '#FFFFFF', '#FF0000', '#FFFF00'],
      colorblind_friendly: ['#000000', '#FFFFFF', '#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00'],
      custom: ['#2D2D2D', '#F0F0F0', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
    };

    return palettes[this.currentColorScheme] || palettes.classic;
  }

  private getFontSize(): number {
    const sizes = {
      minimal: 12,
      standard: 14,
      detailed: 16,
      comprehensive: 18
    };

    return sizes[this.currentUIComplexity] || 14;
  }

  private getBorderStyle(): RetroStyle['borderStyle'] {
    return this.currentUIComplexity === 'minimal' ? 'none' : 
           this.currentUIComplexity === 'comprehensive' ? 'detailed' : 'simple';
  }

  private getShadowStyle(): RetroStyle['shadowStyle'] {
    return this.currentUIComplexity === 'minimal' ? 'none' : 
           this.currentUIComplexity === 'comprehensive' ? 'drop' : 'inner';
  }

  private getTileSize(): number {
    const sizes = {
      minimal: 16,
      standard: 24,
      detailed: 32,
      comprehensive: 40
    };

    return sizes[this.currentUIComplexity] || 24;
  }

  private getAnimationSpeed(adaptiveSettings?: any): number {
    const speeds = {
      minimal: 0.5,
      standard: 1.0,
      detailed: 1.2,
      comprehensive: 1.5
    };

    let baseSpeed = speeds[this.currentUIComplexity] || 1.0;

    // Adjust based on performance settings
    if (adaptiveSettings) {
      if (adaptiveSettings.animationQuality === 'low') {
        baseSpeed *= 0.5;
      } else if (adaptiveSettings.animationQuality === 'medium') {
        baseSpeed *= 0.75;
      }
    }

    return baseSpeed;
  }

  private shouldEnableAnimations(adaptiveSettings?: any): boolean {
    if (adaptiveSettings && !adaptiveSettings.visualEffectsEnabled) {
      return false;
    }
    return this.currentUIComplexity !== 'minimal';
  }

  private getDisplayDuration(): number {
    const durations = {
      minimal: 2000,
      standard: 3000,
      detailed: 4000,
      comprehensive: 5000
    };

    return durations[this.currentUIComplexity] || 3000;
  }

  // Default configurations for error recovery

  private getDefaultRetroStyle(): RetroStyle {
    return {
      colorPalette: ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
      fontFamily: 'monospace',
      fontSize: 14,
      borderStyle: 'simple',
      shadowStyle: 'inner'
    };
  }

  private getDefaultRenderConfig(): RenderConfig {
    return {
      tileSize: 24,
      animationSpeed: 1.0,
      frameRate: 60,
      enableAnimations: true,
      pixelPerfect: true
    };
  }

  private getDefaultThoughtBubbleConfig(): ThoughtBubbleConfig {
    return {
      maxWidth: 300,
      maxHeight: 150,
      fadeInDuration: 300,
      fadeOutDuration: 200,
      displayDuration: 3000,
      position: 'top-right'
    };
  }

  private getDefaultAnalysisPanelConfig(): AnalysisPanelConfig {
    return {
      width: 300,
      height: 400,
      position: 'right',
      autoHide: false,
      transparency: 0.9
    };
  }
}