import { PerformanceManager } from '../utils/PerformanceManager';
import { RenderConfig } from '../types/UITypes';
import { handleError } from '../utils/ErrorHandling';

/**
 * Render Optimizer for managing rendering performance and quality
 * Implements rendering optimizations based on performance constraints
 */
export class RenderOptimizer {
  private static instance: RenderOptimizer;
  private performanceManager: PerformanceManager;
  private renderQueue: RenderTask[] = [];
  private frameBuffer: Map<string, ImageData> = new Map();
  private dirtyRegions: Set<string> = new Set();
  private optimizationLevel: OptimizationLevel = 'none';

  private constructor() {
    this.performanceManager = PerformanceManager.getInstance();
  }

  static getInstance(): RenderOptimizer {
    if (!RenderOptimizer.instance) {
      RenderOptimizer.instance = new RenderOptimizer();
    }
    return RenderOptimizer.instance;
  }

  /**
   * Optimize rendering based on current performance metrics
   */
  optimizeRendering(context: CanvasRenderingContext2D, config: RenderConfig): OptimizedRenderConfig {
    try {
      this.performanceManager.startSystemTimer('rendering');

      const adaptiveSettings = this.performanceManager.getAdaptiveSettings();
      const performanceMetrics = this.performanceManager.getPerformanceMetrics();

      // Determine optimization level based on performance
      this.updateOptimizationLevel(performanceMetrics);

      // Create optimized render config
      const optimizedConfig = this.createOptimizedConfig(config, adaptiveSettings);

      // Apply rendering optimizations
      this.applyRenderingOptimizations(context, optimizedConfig);

      const result = this.performanceManager.endSystemTimer('rendering');

      // Adjust optimization level if rendering is taking too long
      if (result.shouldThrottle) {
        this.increaseOptimizationLevel();
      }

      return optimizedConfig;

    } catch (error) {
      handleError(error, 'Failed to optimize rendering', { 
        context: 'RenderOptimizer.optimizeRendering' 
      });
      return this.createOptimizedConfig(config, { 
        aiProcessingEnabled: true,
        visualEffectsEnabled: false,
        animationQuality: 'low',
        renderOptimizations: true
      });
    }
  }

  /**
   * Queue a render task with priority
   */
  queueRenderTask(task: RenderTask): void {
    // Insert task based on priority
    const insertIndex = this.renderQueue.findIndex(
      existingTask => existingTask.priority < task.priority
    );

    if (insertIndex === -1) {
      this.renderQueue.push(task);
    } else {
      this.renderQueue.splice(insertIndex, 0, task);
    }

    // Limit queue size to prevent memory issues
    if (this.renderQueue.length > 100) {
      this.renderQueue = this.renderQueue.slice(0, 100);
    }
  }

  /**
   * Process render queue with time budget
   */
  processRenderQueue(context: CanvasRenderingContext2D, timeBudget: number): void {
    const startTime = performance.now();

    while (this.renderQueue.length > 0 && 
           (performance.now() - startTime) < timeBudget) {
      
      const task = this.renderQueue.shift();
      if (task) {
        this.executeRenderTask(context, task);
      }
    }

    // Clear remaining low-priority tasks if we're over budget
    if (performance.now() - startTime >= timeBudget) {
      this.renderQueue = this.renderQueue.filter(task => task.priority >= 3);
    }
  }

  /**
   * Mark a region as dirty for selective rendering
   */
  markDirtyRegion(regionId: string): void {
    this.dirtyRegions.add(regionId);
  }

  /**
   * Check if selective rendering should be used
   */
  shouldUseSelectiveRendering(): boolean {
    return this.optimizationLevel === 'aggressive' || 
           this.optimizationLevel === 'maximum';
  }

  /**
   * Get dirty regions for selective rendering
   */
  getDirtyRegions(): string[] {
    return Array.from(this.dirtyRegions);
  }

  /**
   * Clear dirty regions after rendering
   */
  clearDirtyRegions(): void {
    this.dirtyRegions.clear();
  }

  /**
   * Cache rendered content for reuse
   */
  cacheRenderResult(key: string, imageData: ImageData): void {
    // Limit cache size to prevent memory issues
    if (this.frameBuffer.size > 50) {
      // Remove oldest entries
      const keys = Array.from(this.frameBuffer.keys());
      for (let i = 0; i < 10 && i < keys.length; i++) {
        const key = keys[i];
        if (key) {
          this.frameBuffer.delete(key);
        }
      }
    }

    this.frameBuffer.set(key, imageData);
  }

  /**
   * Get cached render result
   */
  getCachedRenderResult(key: string): ImageData | null {
    return this.frameBuffer.get(key) || null;
  }

  /**
   * Clear render cache
   */
  clearRenderCache(): void {
    this.frameBuffer.clear();
  }

  /**
   * Get current optimization level
   */
  getOptimizationLevel(): OptimizationLevel {
    return this.optimizationLevel;
  }

  /**
   * Force optimization level
   */
  setOptimizationLevel(level: OptimizationLevel): void {
    this.optimizationLevel = level;
  }

  // Private helper methods

  private updateOptimizationLevel(metrics: any): void {
    const frameTime = metrics.averageFrameTime;
    const targetFrameTime = 1000 / 60; // 16.67ms for 60fps

    if (frameTime > targetFrameTime * 2) {
      this.optimizationLevel = 'maximum';
    } else if (frameTime > targetFrameTime * 1.5) {
      this.optimizationLevel = 'aggressive';
    } else if (frameTime > targetFrameTime * 1.2) {
      this.optimizationLevel = 'moderate';
    } else {
      this.optimizationLevel = 'none';
    }
  }

  private increaseOptimizationLevel(): void {
    const levels: OptimizationLevel[] = ['none', 'moderate', 'aggressive', 'maximum'];
    const currentIndex = levels.indexOf(this.optimizationLevel);
    
    if (currentIndex < levels.length - 1) {
      const nextLevel = levels[currentIndex + 1];
      if (nextLevel) {
        this.optimizationLevel = nextLevel;
      }
    }
  }

  private createOptimizedConfig(
    baseConfig: RenderConfig, 
    adaptiveSettings: any
  ): OptimizedRenderConfig {
    const config: OptimizedRenderConfig = {
      ...baseConfig,
      optimizationLevel: this.optimizationLevel,
      useSelectiveRendering: this.shouldUseSelectiveRendering(),
      useCaching: this.optimizationLevel !== 'none',
      reduceQuality: this.optimizationLevel === 'aggressive' || this.optimizationLevel === 'maximum',
      skipNonEssential: this.optimizationLevel === 'maximum'
    };

    // Apply adaptive settings
    if (!adaptiveSettings.visualEffectsEnabled) {
      config.enableAnimations = false;
      config.skipNonEssential = true;
    }

    if (adaptiveSettings.animationQuality === 'low') {
      config.animationSpeed *= 0.5;
      config.reduceQuality = true;
    }

    if (adaptiveSettings.renderOptimizations) {
      config.useSelectiveRendering = true;
      config.useCaching = true;
    }

    return config;
  }

  private applyRenderingOptimizations(
    context: CanvasRenderingContext2D, 
    config: OptimizedRenderConfig
  ): void {
    // Apply quality optimizations
    if (config.reduceQuality) {
      context.imageSmoothingEnabled = false;
    }

    // Set rendering hints for performance
    if (config.optimizationLevel === 'aggressive' || config.optimizationLevel === 'maximum') {
      // Disable expensive rendering features
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
    }

    // Configure pixel perfect rendering based on optimization level
    if (config.pixelPerfect && config.optimizationLevel === 'none') {
      context.imageSmoothingEnabled = false;
    }
  }

  private executeRenderTask(context: CanvasRenderingContext2D, task: RenderTask): void {
    try {
      switch (task.type) {
        case 'sprite':
          this.renderSprite(context, task);
          break;
        case 'text':
          this.renderText(context, task);
          break;
        case 'ui':
          this.renderUI(context, task);
          break;
        case 'effect':
          if (this.optimizationLevel !== 'maximum') {
            this.renderEffect(context, task);
          }
          break;
        default:
          console.warn('Unknown render task type:', task.type);
      }
    } catch (error) {
      handleError(error, 'Failed to execute render task', { 
        context: 'RenderOptimizer.executeRenderTask',
        taskType: task.type 
      });
    }
  }

  private renderSprite(context: CanvasRenderingContext2D, task: RenderTask): void {
    // Check cache first
    const cacheKey = `sprite_${task.id}_${task.x}_${task.y}`;
    const cached = this.getCachedRenderResult(cacheKey);
    
    if (cached && task.cacheable) {
      context.putImageData(cached, task.x, task.y);
      return;
    }

    // Render sprite (simplified implementation)
    if (task.image) {
      context.drawImage(task.image, task.x, task.y, task.width || 32, task.height || 32);
    }
  }

  private renderText(context: CanvasRenderingContext2D, task: RenderTask): void {
    if (task.text) {
      context.fillStyle = task.color || '#FFFFFF';
      context.font = task.font || '12px monospace';
      context.fillText(task.text, task.x, task.y);
    }
  }

  private renderUI(context: CanvasRenderingContext2D, task: RenderTask): void {
    // Render UI elements (simplified implementation)
    if (task.width && task.height) {
      context.fillStyle = task.color || '#333333';
      context.fillRect(task.x, task.y, task.width, task.height);
    }
  }

  private renderEffect(context: CanvasRenderingContext2D, task: RenderTask): void {
    // Skip effects under high optimization
    if (this.optimizationLevel === 'aggressive' || this.optimizationLevel === 'maximum') {
      return;
    }

    // Render visual effects (simplified implementation)
    if (task.effect) {
      context.globalAlpha = task.effect.opacity || 1.0;
      // Apply effect rendering logic here
      context.globalAlpha = 1.0;
    }
  }
}

// Type definitions

export interface RenderTask {
  id: string;
  type: 'sprite' | 'text' | 'ui' | 'effect';
  priority: number; // 1-5, higher is more important
  x: number;
  y: number;
  width?: number;
  height?: number;
  image?: HTMLImageElement;
  text?: string;
  font?: string;
  color?: string;
  effect?: {
    type: string;
    opacity: number;
  };
  cacheable?: boolean;
}

export interface OptimizedRenderConfig extends RenderConfig {
  optimizationLevel: OptimizationLevel;
  useSelectiveRendering: boolean;
  useCaching: boolean;
  reduceQuality: boolean;
  skipNonEssential: boolean;
}

export type OptimizationLevel = 'none' | 'moderate' | 'aggressive' | 'maximum';