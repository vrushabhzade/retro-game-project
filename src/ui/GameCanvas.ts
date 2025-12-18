import { CanvasConfig, RenderConfig, RetroStyle, SpriteData } from '../types/UITypes';
import { VisualAdaptationEngine } from '../ai/VisualAdaptationEngine';
import { handleError } from '../utils/ErrorHandling';
import { RenderOptimizer, OptimizedRenderConfig } from './RenderOptimizer';
import { PerformanceManager } from '../utils/PerformanceManager';

/**
 * Game canvas for retro UI with pixel art rendering
 * Implements requirements 1.2, 6.2
 */
export class GameCanvas {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private config: CanvasConfig;
  private renderConfig: RenderConfig;
  private retroStyle: RetroStyle;
  private visualAdapter: VisualAdaptationEngine;
  private renderOptimizer: RenderOptimizer;
  private performanceManager: PerformanceManager;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private targetFrameRate: number = 60;
  private actualFrameRate: number = 60;
  private optimizedConfig: OptimizedRenderConfig | null = null;

  constructor(
    canvasElement: HTMLCanvasElement, 
    config: CanvasConfig,
    visualAdapter: VisualAdaptationEngine
  ) {
    this.canvas = canvasElement;
    this.config = config;
    this.visualAdapter = visualAdapter;
    this.renderOptimizer = RenderOptimizer.getInstance();
    this.performanceManager = PerformanceManager.getInstance();
    
    // Get 2D context with pixel art settings
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.context = context;

    // Initialize configurations
    this.renderConfig = this.visualAdapter.getRenderConfig();
    this.retroStyle = this.visualAdapter.getRetroStyle();

    this.initializeCanvas();
    this.setupPixelArtRendering();
  }

  /**
   * Initialize canvas with retro settings
   */
  private initializeCanvas(): void {
    try {
      // Set canvas size
      this.canvas.width = this.config.width;
      this.canvas.height = this.config.height;
      
      // Set CSS size for proper scaling
      this.canvas.style.width = `${this.config.width}px`;
      this.canvas.style.height = `${this.config.height}px`;
      
      // Set background color
      this.canvas.style.backgroundColor = this.config.backgroundColor;
      
      // Pixel art styling
      this.canvas.style.imageRendering = 'pixelated';
      this.canvas.style.imageRendering = 'crisp-edges';
      
    } catch (error) {
      handleError(error, 'Failed to initialize canvas', { 
        context: 'GameCanvas.initializeCanvas' 
      });
    }
  }

  /**
   * Setup pixel art rendering settings
   */
  private setupPixelArtRendering(): void {
    try {
      // Disable anti-aliasing for pixel perfect rendering
      this.context.imageSmoothingEnabled = false;
      
      // Set pixel ratio for high DPI displays
      const pixelRatio = this.config.pixelRatio || window.devicePixelRatio || 1;
      
      if (pixelRatio !== 1) {
        const displayWidth = this.canvas.width;
        const displayHeight = this.canvas.height;
        
        this.canvas.width = displayWidth * pixelRatio;
        this.canvas.height = displayHeight * pixelRatio;
        
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;
        
        this.context.scale(pixelRatio, pixelRatio);
      }

      // Set default font for retro text
      this.context.font = `${this.retroStyle.fontSize}px ${this.retroStyle.fontFamily}`;
      this.context.textAlign = 'left';
      this.context.textBaseline = 'top';
      
    } catch (error) {
      handleError(error, 'Failed to setup pixel art rendering', { 
        context: 'GameCanvas.setupPixelArtRendering' 
      });
    }
  }

  /**
   * Start the rendering loop with frame rate management and performance optimization
   * Requirement 6.2: Maintain consistent frame rates without stuttering
   */
  public startRenderLoop(renderCallback: (deltaTime: number) => void): void {
    try {
      this.targetFrameRate = this.renderConfig.frameRate;
      const targetFrameTime = 1000 / this.targetFrameRate;
      
      const renderFrame = (currentTime: number) => {
        const deltaTime = currentTime - this.lastFrameTime;
        
        // Frame rate limiting
        if (deltaTime >= targetFrameTime) {
          const frameStartTime = performance.now();
          
          // Optimize rendering based on performance
          this.optimizedConfig = this.renderOptimizer.optimizeRendering(this.context, this.renderConfig);
          
          // Calculate actual frame rate
          this.frameCount++;
          if (this.frameCount % 60 === 0) {
            this.actualFrameRate = 1000 / deltaTime;
          }
          
          // Clear canvas (may be optimized)
          this.clear();
          
          // Process render queue with time budget
          const renderBudget = this.performanceManager.getSystemBudget('rendering');
          this.renderOptimizer.processRenderQueue(this.context, renderBudget);
          
          // Call render callback
          renderCallback(deltaTime);
          
          // Record frame performance
          const frameTime = performance.now() - frameStartTime;
          this.performanceManager.recordFrameTime(frameTime);
          
          this.lastFrameTime = currentTime;
        }
        
        this.animationFrameId = requestAnimationFrame(renderFrame);
      };
      
      this.animationFrameId = requestAnimationFrame(renderFrame);
      
    } catch (error) {
      handleError(error, 'Failed to start render loop', { 
        context: 'GameCanvas.startRenderLoop' 
      });
    }
  }

  /**
   * Stop the rendering loop
   */
  public stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Clear the canvas with background color
   */
  public clear(): void {
    try {
      this.context.fillStyle = this.config.backgroundColor;
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } catch (error) {
      handleError(error, 'Failed to clear canvas', { 
        context: 'GameCanvas.clear' 
      });
    }
  }

  /**
   * Render a sprite with retro styling and performance optimization
   */
  public renderSprite(sprite: SpriteData, imageSource?: HTMLImageElement): void {
    try {
      // Check if we should skip non-essential rendering
      if (this.optimizedConfig?.skipNonEssential && sprite.priority && sprite.priority < 3) {
        return;
      }

      // Queue render task instead of immediate rendering for better performance
      if (imageSource) {
        this.renderOptimizer.queueRenderTask({
          id: sprite.id || `sprite_${Date.now()}`,
          type: 'sprite',
          priority: sprite.priority || 3,
          x: sprite.x,
          y: sprite.y,
          width: sprite.width,
          height: sprite.height,
          image: imageSource,
          cacheable: true
        });
      } else {
        // Queue a simple rectangle render task
        this.renderOptimizer.queueRenderTask({
          id: sprite.id || `sprite_${Date.now()}`,
          type: 'ui',
          priority: sprite.priority || 3,
          x: sprite.x,
          y: sprite.y,
          width: sprite.width,
          height: sprite.height,
          color: this.retroStyle.colorPalette[0] || '#FFFFFF',
          cacheable: true
        });
      }

      // Mark region as dirty for selective rendering
      if (this.optimizedConfig?.useSelectiveRendering) {
        this.renderOptimizer.markDirtyRegion(`${Math.floor(sprite.x / 32)}_${Math.floor(sprite.y / 32)}`);
      }

      // Fallback to immediate rendering if not using optimization
      if (!this.optimizedConfig || this.optimizedConfig.optimizationLevel === 'none') {
        this.renderSpriteImmediate(sprite, imageSource);
      }
      
    } catch (error) {
      handleError(error, 'Failed to render sprite', { 
        context: 'GameCanvas.renderSprite',
        spriteId: sprite.id 
      });
    }
  }

  /**
   * Immediate sprite rendering (fallback)
   */
  private renderSpriteImmediate(sprite: SpriteData, imageSource?: HTMLImageElement): void {
    try {
      if (!imageSource) {
        // Render colored rectangle if no image source
        this.context.fillStyle = this.retroStyle.colorPalette[0] || '#FFFFFF';
        this.context.fillRect(sprite.x, sprite.y, sprite.width, sprite.height);
        return;
      }

      this.context.save();
      
      // Apply transformations
      if (sprite.rotation) {
        this.context.translate(sprite.x + sprite.width / 2, sprite.y + sprite.height / 2);
        this.context.rotate(sprite.rotation);
        this.context.translate(-sprite.width / 2, -sprite.height / 2);
      } else {
        this.context.translate(sprite.x, sprite.y);
      }
      
      if (sprite.scale) {
        this.context.scale(sprite.scale, sprite.scale);
      }
      
      if (sprite.opacity !== undefined) {
        this.context.globalAlpha = sprite.opacity;
      }

      // Draw sprite from source
      this.context.drawImage(
        imageSource,
        sprite.sourceX, sprite.sourceY, sprite.width, sprite.height,
        0, 0, sprite.width, sprite.height
      );
      
      this.context.restore();
      
    } catch (error) {
      handleError(error, 'Failed to render sprite immediately', { 
        context: 'GameCanvas.renderSpriteImmediate',
        spriteId: sprite.id 
      });
    }
  }

  /**
   * Render text with retro styling
   */
  public renderText(
    text: string, 
    x: number, 
    y: number, 
    color?: string, 
    fontSize?: number
  ): void {
    try {
      this.context.save();
      
      // Set font and color
      const size = fontSize || this.retroStyle.fontSize;
      this.context.font = `${size}px ${this.retroStyle.fontFamily}`;
      this.context.fillStyle = color || this.retroStyle.colorPalette[1] || '#FFFFFF';
      
      // Add retro text effects based on style
      if (this.retroStyle.shadowStyle === 'drop') {
        this.context.fillStyle = this.retroStyle.colorPalette[0] || '#000000';
        this.context.fillText(text, x + 1, y + 1);
        this.context.fillStyle = color || this.retroStyle.colorPalette[1] || '#FFFFFF';
      }
      
      this.context.fillText(text, x, y);
      
      this.context.restore();
      
    } catch (error) {
      handleError(error, 'Failed to render text', { 
        context: 'GameCanvas.renderText',
        text: text.substring(0, 50) 
      });
    }
  }

  /**
   * Render a rectangle with retro border styling
   */
  public renderRectangle(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    fillColor?: string, 
    borderColor?: string
  ): void {
    try {
      this.context.save();
      
      // Fill rectangle
      if (fillColor) {
        this.context.fillStyle = fillColor;
        this.context.fillRect(x, y, width, height);
      }
      
      // Draw border based on retro style
      if (borderColor && this.retroStyle.borderStyle !== 'none') {
        this.context.strokeStyle = borderColor;
        this.context.lineWidth = 1;
        
        if (this.retroStyle.borderStyle === 'detailed') {
          // Draw detailed retro border
          this.drawDetailedBorder(x, y, width, height, borderColor);
        } else {
          // Simple border
          this.context.strokeRect(x, y, width, height);
        }
      }
      
      this.context.restore();
      
    } catch (error) {
      handleError(error, 'Failed to render rectangle', { 
        context: 'GameCanvas.renderRectangle' 
      });
    }
  }

  /**
   * Draw detailed retro-style border
   */
  private drawDetailedBorder(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    color: string
  ): void {
    this.context.strokeStyle = color;
    this.context.lineWidth = 1;
    
    // Outer border
    this.context.strokeRect(x, y, width, height);
    
    // Inner highlight
    this.context.strokeStyle = this.lightenColor(color, 0.3);
    this.context.strokeRect(x + 1, y + 1, width - 2, height - 2);
    
    // Corner details
    this.context.strokeStyle = color;
    this.context.fillRect(x, y, 2, 2);
    this.context.fillRect(x + width - 2, y, 2, 2);
    this.context.fillRect(x, y + height - 2, 2, 2);
    this.context.fillRect(x + width - 2, y + height - 2, 2, 2);
  }

  /**
   * Lighten a color for border effects
   */
  private lightenColor(color: string, factor: number): string {
    // Simple color lightening - in a real implementation you'd use a proper color library
    if (color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16);
      const r = Math.min(255, Math.floor((num >> 16) * (1 + factor)));
      const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) * (1 + factor)));
      const b = Math.min(255, Math.floor((num & 0x0000FF) * (1 + factor)));
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
    return color;
  }

  /**
   * Update visual configuration based on adaptation engine
   */
  public updateVisualConfig(): void {
    try {
      this.renderConfig = this.visualAdapter.getRenderConfig();
      this.retroStyle = this.visualAdapter.getRetroStyle();
      
      // Update font
      this.context.font = `${this.retroStyle.fontSize}px ${this.retroStyle.fontFamily}`;
      
    } catch (error) {
      handleError(error, 'Failed to update visual config', { 
        context: 'GameCanvas.updateVisualConfig' 
      });
    }
  }

  /**
   * Get current frame rate
   */
  public getFrameRate(): number {
    return this.actualFrameRate;
  }

  /**
   * Get canvas element
   */
  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get rendering context
   */
  public getContext(): CanvasRenderingContext2D {
    return this.context;
  }

  /**
   * Get current render configuration
   */
  public getRenderConfig(): RenderConfig {
    return { ...this.renderConfig };
  }

  /**
   * Get current retro style
   */
  public getRetroStyle(): RetroStyle {
    return { ...this.retroStyle };
  }

  /**
   * Resize canvas
   */
  public resize(width: number, height: number): void {
    try {
      this.config.width = width;
      this.config.height = height;
      this.initializeCanvas();
      this.setupPixelArtRendering();
    } catch (error) {
      handleError(error, 'Failed to resize canvas', { 
        context: 'GameCanvas.resize',
        width,
        height 
      });
    }
  }

  /**
   * Get performance metrics for rendering
   */
  public getPerformanceMetrics() {
    return {
      frameRate: this.actualFrameRate,
      targetFrameRate: this.targetFrameRate,
      frameCount: this.frameCount,
      optimizationLevel: this.optimizedConfig?.optimizationLevel || 'none',
      renderQueueSize: this.renderOptimizer.getDirtyRegions().length
    };
  }

  /**
   * Enable or disable performance optimizations
   */
  public setPerformanceOptimizations(enabled: boolean): void {
    if (enabled) {
      this.renderOptimizer.setOptimizationLevel('moderate');
    } else {
      this.renderOptimizer.setOptimizationLevel('none');
    }
  }

  /**
   * Clear render cache for memory management
   */
  public clearRenderCache(): void {
    this.renderOptimizer.clearRenderCache();
  }

  /**
   * Get render optimization status
   */
  public getOptimizationStatus() {
    return {
      level: this.renderOptimizer.getOptimizationLevel(),
      useSelectiveRendering: this.optimizedConfig?.useSelectiveRendering || false,
      useCaching: this.optimizedConfig?.useCaching || false,
      dirtyRegions: this.renderOptimizer.getDirtyRegions().length
    };
  }

  /**
   * Convert screen coordinates to game coordinates
   */
  public screenToGameCoordinates(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    return {
      x: Math.floor((screenX - rect.left) * scaleX),
      y: Math.floor((screenY - rect.top) * scaleY)
    };
  }

  /**
   * Convert game coordinates to screen coordinates
   */
  public gameToScreenCoordinates(gameX: number, gameY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / this.canvas.width;
    const scaleY = rect.height / this.canvas.height;
    
    return {
      x: gameX * scaleX + rect.left,
      y: gameY * scaleY + rect.top
    };
  }

  /**
   * Render the game state
   */
  public render(gameState: any): void {
    try {
      // Clear canvas
      this.clear();

      // Render dungeon
      if (gameState.dungeon) {
        this.renderDungeon(gameState.dungeon);
      }

      // Render player
      if (gameState.player) {
        this.renderPlayer(gameState.player);
      }

      // Render enemies
      if (gameState.enemies) {
        gameState.enemies.forEach((enemy: any) => {
          if (enemy.isAlive && enemy.isAlive()) {
            this.renderEnemy(enemy);
          }
        });
      }

      // Render items
      if (gameState.items) {
        gameState.items.forEach((item: any) => {
          this.renderItem(item);
        });
      }

      // Render UI overlays
      this.renderUIOverlays(gameState);

    } catch (error) {
      handleError(error as Error, 'Failed to render game state', {
        context: 'GameCanvas.render'
      });
    }
  }

  /**
   * Render the dungeon layout
   */
  private renderDungeon(dungeon: any): void {
    const tileSize = 20; // Size of each tile in pixels

    // Render rooms
    if (dungeon.rooms) {
      dungeon.rooms.forEach((room: any) => {
        this.renderRectangle(
          room.position.x * tileSize,
          room.position.y * tileSize,
          room.width * tileSize,
          room.height * tileSize,
          'rgba(0, 100, 0, 0.3)',
          '#00ff00'
        );
      });
    }

    // Render corridors
    if (dungeon.corridors) {
      dungeon.corridors.forEach((corridor: any) => {
        corridor.tiles.forEach((tile: any) => {
          this.renderRectangle(
            tile.x * tileSize,
            tile.y * tileSize,
            tileSize,
            tileSize,
            'rgba(0, 50, 0, 0.3)',
            '#008800'
          );
        });
      });
    }
  }

  /**
   * Render the player character
   */
  private renderPlayer(player: any): void {
    const tileSize = 20;
    const x = player.position.x * tileSize;
    const y = player.position.y * tileSize;

    // Render player as a bright green square
    this.renderRectangle(
      x + 2,
      y + 2,
      tileSize - 4,
      tileSize - 4,
      '#00ff00',
      '#ffffff'
    );

    // Render health bar above player
    const healthBarWidth = tileSize;
    const healthBarHeight = 4;
    const healthPercent = player.health / player.maxHealth;

    this.renderRectangle(
      x,
      y - 8,
      healthBarWidth,
      healthBarHeight,
      '#ff0000'
    );

    this.renderRectangle(
      x,
      y - 8,
      healthBarWidth * healthPercent,
      healthBarHeight,
      '#00ff00'
    );
  }

  /**
   * Render an enemy
   */
  private renderEnemy(enemy: any): void {
    const tileSize = 20;
    const x = enemy.position.x * tileSize;
    const y = enemy.position.y * tileSize;

    // Render enemy as a red square
    this.renderRectangle(
      x + 2,
      y + 2,
      tileSize - 4,
      tileSize - 4,
      '#ff0000',
      '#ffffff'
    );

    // Render health bar above enemy
    const healthBarWidth = tileSize;
    const healthBarHeight = 3;
    const healthPercent = enemy.health / enemy.maxHealth;

    this.renderRectangle(
      x,
      y - 6,
      healthBarWidth,
      healthBarHeight,
      '#800000'
    );

    this.renderRectangle(
      x,
      y - 6,
      healthBarWidth * healthPercent,
      healthBarHeight,
      '#ff0000'
    );
  }

  /**
   * Render an item
   */
  private renderItem(item: any): void {
    const tileSize = 20;
    const x = item.position.x * tileSize;
    const y = item.position.y * tileSize;

    // Render item as a yellow circle
    this.context.save();
    this.context.fillStyle = '#ffff00';
    this.context.beginPath();
    this.context.arc(x + tileSize / 2, y + tileSize / 2, tileSize / 4, 0, 2 * Math.PI);
    this.context.fill();
    this.context.restore();
  }

  /**
   * Render UI overlays
   */
  private renderUIOverlays(gameState: any): void {
    // Render combat indicator
    if (gameState.isInCombat) {
      this.renderText(
        'COMBAT',
        10,
        10,
        '#ff0000',
        24
      );
    }

    // Render turn indicator
    if (gameState.turnNumber) {
      this.renderText(
        `Turn: ${gameState.turnNumber}`,
        this.canvas.width - 100,
        10,
        '#ffffff',
        16
      );
    }
  }
}