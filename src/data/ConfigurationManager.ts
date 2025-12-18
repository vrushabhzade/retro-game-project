import { handleError } from '../utils/ErrorHandling';

export interface GameConfiguration {
  graphics: {
    quality: 'low' | 'medium' | 'high';
    frameRate: number;
    pixelRatio: number;
    enableAnimations: boolean;
  };
  ai: {
    assistanceLevel: 'minimal' | 'normal' | 'maximum';
    learningRate: number;
    adaptationSpeed: number;
    enableThoughtBubbles: boolean;
  };
  gameplay: {
    difficulty: 'easy' | 'normal' | 'hard';
    autoSave: boolean;
    autoSaveInterval: number; // minutes
    combatSpeed: number;
  };
  audio: {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    enableRetroSounds: boolean;
  };
  debug: {
    enableDebugMode: boolean;
    showPerformanceMetrics: boolean;
    enableConsoleLogging: boolean;
    showAIDecisionProcess: boolean;
  };
}

export interface ConfigurationStorage {
  save(config: GameConfiguration): Promise<void>;
  load(): Promise<GameConfiguration | null>;
  exists(): Promise<boolean>;
  reset(): Promise<void>;
}

// Local storage implementation for browser environments
class LocalStorageConfigStorage implements ConfigurationStorage {
  private readonly configKey = 'ai-dungeon-master-config';

  async save(config: GameConfiguration): Promise<void> {
    try {
      const serialized = JSON.stringify(config);
      localStorage.setItem(this.configKey, serialized);
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  async load(): Promise<GameConfiguration | null> {
    try {
      const serialized = localStorage.getItem(this.configKey);
      if (!serialized) {
        return null;
      }
      return JSON.parse(serialized) as GameConfiguration;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error}`);
    }
  }

  async exists(): Promise<boolean> {
    return localStorage.getItem(this.configKey) !== null;
  }

  async reset(): Promise<void> {
    localStorage.removeItem(this.configKey);
  }
}

/**
 * Configuration manager for game settings and AI parameters
 */
export class ConfigurationManager {
  private storage: ConfigurationStorage;
  private currentConfig: GameConfiguration;
  private defaultConfig: GameConfiguration;

  constructor(storage?: ConfigurationStorage) {
    this.storage = storage || new LocalStorageConfigStorage();
    
    // Define default configuration
    this.defaultConfig = {
      graphics: {
        quality: 'medium',
        frameRate: 60,
        pixelRatio: 1,
        enableAnimations: true
      },
      ai: {
        assistanceLevel: 'normal',
        learningRate: 0.1,
        adaptationSpeed: 0.05,
        enableThoughtBubbles: true
      },
      gameplay: {
        difficulty: 'normal',
        autoSave: true,
        autoSaveInterval: 5, // 5 minutes
        combatSpeed: 1.0
      },
      audio: {
        masterVolume: 0.8,
        sfxVolume: 0.7,
        musicVolume: 0.6,
        enableRetroSounds: true
      },
      debug: {
        enableDebugMode: false,
        showPerformanceMetrics: false,
        enableConsoleLogging: false,
        showAIDecisionProcess: false
      }
    };

    // Initialize with default config
    this.currentConfig = { ...this.defaultConfig };
  }

  /**
   * Initialize configuration manager and load saved settings
   */
  public async initialize(): Promise<void> {
    try {
      const savedConfig = await this.storage.load();
      if (savedConfig) {
        // Merge saved config with defaults to handle new settings
        this.currentConfig = this.mergeConfigurations(this.defaultConfig, savedConfig);
      } else {
        // No saved config, use defaults
        this.currentConfig = { ...this.defaultConfig };
      }
    } catch (error) {
      handleError(error as Error, 'Failed to initialize configuration');
      // Fall back to default configuration
      this.currentConfig = { ...this.defaultConfig };
    }
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): GameConfiguration {
    return { ...this.currentConfig };
  }

  /**
   * Update configuration settings
   */
  public async updateConfiguration(updates: Partial<GameConfiguration>): Promise<void> {
    try {
      // Deep merge the updates with current config
      this.currentConfig = this.mergeConfigurations(this.currentConfig, updates);
      
      // Validate the configuration
      this.validateConfiguration(this.currentConfig);
      
      // Save to storage
      await this.storage.save(this.currentConfig);
      
    } catch (error) {
      handleError(error as Error, 'Failed to update configuration');
      throw error;
    }
  }

  /**
   * Get specific configuration section
   */
  public getGraphicsConfig() {
    return { ...this.currentConfig.graphics };
  }

  public getAIConfig() {
    return { ...this.currentConfig.ai };
  }

  public getGameplayConfig() {
    return { ...this.currentConfig.gameplay };
  }

  public getAudioConfig() {
    return { ...this.currentConfig.audio };
  }

  public getDebugConfig() {
    return { ...this.currentConfig.debug };
  }

  /**
   * Update specific configuration sections
   */
  public async updateGraphicsConfig(graphics: Partial<GameConfiguration['graphics']>): Promise<void> {
    await this.updateConfiguration({ graphics: { ...this.currentConfig.graphics, ...graphics } });
  }

  public async updateAIConfig(ai: Partial<GameConfiguration['ai']>): Promise<void> {
    await this.updateConfiguration({ ai: { ...this.currentConfig.ai, ...ai } });
  }

  public async updateGameplayConfig(gameplay: Partial<GameConfiguration['gameplay']>): Promise<void> {
    await this.updateConfiguration({ gameplay: { ...this.currentConfig.gameplay, ...gameplay } });
  }

  public async updateAudioConfig(audio: Partial<GameConfiguration['audio']>): Promise<void> {
    await this.updateConfiguration({ audio: { ...this.currentConfig.audio, ...audio } });
  }

  public async updateDebugConfig(debug: Partial<GameConfiguration['debug']>): Promise<void> {
    await this.updateConfiguration({ debug: { ...this.currentConfig.debug, ...debug } });
  }

  /**
   * Reset configuration to defaults
   */
  public async resetToDefaults(): Promise<void> {
    try {
      this.currentConfig = { ...this.defaultConfig };
      await this.storage.save(this.currentConfig);
    } catch (error) {
      handleError(error as Error, 'Failed to reset configuration');
      throw error;
    }
  }

  /**
   * Export configuration as JSON string
   */
  public exportConfiguration(): string {
    return JSON.stringify(this.currentConfig, null, 2);
  }

  /**
   * Import configuration from JSON string
   */
  public async importConfiguration(configJson: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configJson) as GameConfiguration;
      
      // Validate imported configuration
      this.validateConfiguration(importedConfig);
      
      // Merge with defaults to ensure all required fields are present
      this.currentConfig = this.mergeConfigurations(this.defaultConfig, importedConfig);
      
      // Save the imported configuration
      await this.storage.save(this.currentConfig);
      
    } catch (error) {
      handleError(error as Error, 'Failed to import configuration');
      throw new Error(`Invalid configuration format: ${(error as Error).message}`);
    }
  }

  /**
   * Check if configuration exists in storage
   */
  public async hasStoredConfiguration(): Promise<boolean> {
    try {
      return await this.storage.exists();
    } catch (error) {
      handleError(error as Error, 'Failed to check configuration existence');
      return false;
    }
  }

  /**
   * Get configuration optimized for current performance level
   */
  public getPerformanceOptimizedConfig(performanceLevel: 'low' | 'medium' | 'high'): Partial<GameConfiguration> {
    const baseConfig = { ...this.currentConfig };

    switch (performanceLevel) {
      case 'low':
        return {
          ...baseConfig,
          graphics: {
            ...baseConfig.graphics,
            quality: 'low',
            frameRate: 30,
            enableAnimations: false
          },
          ai: {
            ...baseConfig.ai,
            adaptationSpeed: 0.02, // Slower adaptation to reduce processing
            enableThoughtBubbles: false
          }
        };

      case 'medium':
        return {
          ...baseConfig,
          graphics: {
            ...baseConfig.graphics,
            quality: 'medium',
            frameRate: 45,
            enableAnimations: true
          },
          ai: {
            ...baseConfig.ai,
            adaptationSpeed: 0.05,
            enableThoughtBubbles: true
          }
        };

      case 'high':
        return {
          ...baseConfig,
          graphics: {
            ...baseConfig.graphics,
            quality: 'high',
            frameRate: 60,
            enableAnimations: true
          },
          ai: {
            ...baseConfig.ai,
            adaptationSpeed: 0.1,
            enableThoughtBubbles: true
          }
        };

      default:
        return baseConfig;
    }
  }

  /**
   * Deep merge two configuration objects
   */
  private mergeConfigurations(base: GameConfiguration, updates: Partial<GameConfiguration>): GameConfiguration {
    const result = { ...base };

    for (const key in updates) {
      const updateValue = updates[key as keyof GameConfiguration];
      if (updateValue && typeof updateValue === 'object' && !Array.isArray(updateValue)) {
        // Deep merge nested objects
        result[key as keyof GameConfiguration] = {
          ...result[key as keyof GameConfiguration],
          ...updateValue
        } as any;
      } else if (updateValue !== undefined) {
        // Direct assignment for primitive values
        (result as any)[key] = updateValue;
      }
    }

    return result;
  }

  /**
   * Validate configuration structure and values
   */
  private validateConfiguration(config: GameConfiguration): void {
    // Validate graphics settings
    if (!['low', 'medium', 'high'].includes(config.graphics.quality)) {
      throw new Error('Invalid graphics quality setting');
    }

    if (config.graphics.frameRate < 15 || config.graphics.frameRate > 120) {
      throw new Error('Frame rate must be between 15 and 120');
    }

    if (config.graphics.pixelRatio < 0.5 || config.graphics.pixelRatio > 3) {
      throw new Error('Pixel ratio must be between 0.5 and 3');
    }

    // Validate AI settings
    if (!['minimal', 'normal', 'maximum'].includes(config.ai.assistanceLevel)) {
      throw new Error('Invalid AI assistance level');
    }

    if (config.ai.learningRate < 0 || config.ai.learningRate > 1) {
      throw new Error('Learning rate must be between 0 and 1');
    }

    if (config.ai.adaptationSpeed < 0 || config.ai.adaptationSpeed > 1) {
      throw new Error('Adaptation speed must be between 0 and 1');
    }

    // Validate gameplay settings
    if (!['easy', 'normal', 'hard'].includes(config.gameplay.difficulty)) {
      throw new Error('Invalid difficulty setting');
    }

    if (config.gameplay.autoSaveInterval < 1 || config.gameplay.autoSaveInterval > 60) {
      throw new Error('Auto-save interval must be between 1 and 60 minutes');
    }

    if (config.gameplay.combatSpeed < 0.1 || config.gameplay.combatSpeed > 5) {
      throw new Error('Combat speed must be between 0.1 and 5');
    }

    // Validate audio settings
    if (config.audio.masterVolume < 0 || config.audio.masterVolume > 1) {
      throw new Error('Master volume must be between 0 and 1');
    }

    if (config.audio.sfxVolume < 0 || config.audio.sfxVolume > 1) {
      throw new Error('SFX volume must be between 0 and 1');
    }

    if (config.audio.musicVolume < 0 || config.audio.musicVolume > 1) {
      throw new Error('Music volume must be between 0 and 1');
    }
  }

  /**
   * Get default configuration
   */
  public getDefaultConfiguration(): GameConfiguration {
    return { ...this.defaultConfig };
  }

  /**
   * Check if current configuration differs from defaults
   */
  public isConfigurationModified(): boolean {
    return JSON.stringify(this.currentConfig) !== JSON.stringify(this.defaultConfig);
  }
}