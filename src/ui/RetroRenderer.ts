import { GameCanvas } from './GameCanvas';
import { GameState, Room } from '../types/GameTypes';
import { SpriteData, AnimationFrame, RetroStyle, RenderConfig } from '../types/UITypes';
import { VisualAdaptationEngine } from '../ai/VisualAdaptationEngine';
import { handleError } from '../utils/ErrorHandling';

/**
 * Retro renderer for pixel art with adaptive UI complexity
 * Implements requirements 1.2, 6.2
 */
export class RetroRenderer {
  private canvas: GameCanvas;
  private visualAdapter: VisualAdaptationEngine;
  private animations: Map<string, AnimationFrame[]> = new Map();
  private currentAnimationFrames: Map<string, number> = new Map();
  private lastAnimationUpdate: number = 0;
  private tileCache: Map<string, ImageData> = new Map();

  constructor(canvas: GameCanvas, visualAdapter: VisualAdaptationEngine) {
    this.canvas = canvas;
    this.visualAdapter = visualAdapter;
    this.initializeAnimations();
  }

  /**
   * Initialize basic animations for game elements
   */
  private initializeAnimations(): void {
    try {
      // Player walking animation
      this.animations.set('player_walk', [
        { frameNumber: 0, duration: 200, sprites: [{ 
          id: 'player', x: 0, y: 0, width: 24, height: 24, 
          sourceX: 0, sourceY: 0 
        }] },
        { frameNumber: 1, duration: 200, sprites: [{ 
          id: 'player', x: 0, y: 0, width: 24, height: 24, 
          sourceX: 24, sourceY: 0 
        }] }
      ]);

      // Enemy idle animation
      this.animations.set('enemy_idle', [
        { frameNumber: 0, duration: 500, sprites: [{ 
          id: 'enemy', x: 0, y: 0, width: 24, height: 24, 
          sourceX: 0, sourceY: 24 
        }] },
        { frameNumber: 1, duration: 500, sprites: [{ 
          id: 'enemy', x: 0, y: 0, width: 24, height: 24, 
          sourceX: 24, sourceY: 24 
        }] }
      ]);

      // UI pulse animation for important elements
      this.animations.set('ui_pulse', [
        { frameNumber: 0, duration: 300, sprites: [{ 
          id: 'ui_element', x: 0, y: 0, width: 16, height: 16, 
          sourceX: 0, sourceY: 0, opacity: 1.0 
        }] },
        { frameNumber: 1, duration: 300, sprites: [{ 
          id: 'ui_element', x: 0, y: 0, width: 16, height: 16, 
          sourceX: 0, sourceY: 0, opacity: 0.7 
        }] }
      ]);

    } catch (error) {
      handleError(error, 'Failed to initialize animations', { 
        context: 'RetroRenderer.initializeAnimations' 
      });
    }
  }

  /**
   * Render the complete game state with adaptive UI complexity
   */
  public renderGameState(gameState: GameState, deltaTime: number): void {
    try {
      // Update animations
      this.updateAnimations(deltaTime);

      // Get current UI complexity
      const uiComplexity = this.visualAdapter.getCurrentUIComplexity();
      const renderConfig = this.canvas.getRenderConfig();
      const retroStyle = this.canvas.getRetroStyle();

      // Render dungeon
      this.renderDungeon(gameState, renderConfig);

      // Render player
      this.renderPlayer(gameState, renderConfig);

      // Render enemies
      this.renderEnemies(gameState, renderConfig);

      // Render UI elements based on complexity
      this.renderUI(gameState, uiComplexity, retroStyle);

      // Render debug info for advanced users
      if (uiComplexity === 'comprehensive') {
        this.renderDebugInfo(gameState, retroStyle);
      }

    } catch (error) {
      handleError(error, 'Failed to render game state', { 
        context: 'RetroRenderer.renderGameState' 
      });
    }
  }

  /**
   * Render the dungeon with retro tile-based graphics
   */
  private renderDungeon(gameState: GameState, renderConfig: RenderConfig): void {
    try {
      const tileSize = renderConfig.tileSize;
      const currentRoom = gameState.dungeon.rooms.find(r => r.id === gameState.currentRoom);
      
      if (!currentRoom) return;

      // Render floor tiles
      for (let x = 0; x < currentRoom.width; x++) {
        for (let y = 0; y < currentRoom.height; y++) {
          const screenX = x * tileSize;
          const screenY = y * tileSize;
          
          // Get tile type from room layout
          const tileType = this.getTileType(currentRoom, x, y);
          this.renderTile(tileType, screenX, screenY, tileSize);
        }
      }

      // Render room connections (doors/corridors)
      this.renderConnections(currentRoom, tileSize);

    } catch (error) {
      handleError(error, 'Failed to render dungeon', { 
        context: 'RetroRenderer.renderDungeon' 
      });
    }
  }

  /**
   * Render a single tile with retro styling
   */
  private renderTile(tileType: string, x: number, y: number, size: number): void {
    try {
      const retroStyle = this.canvas.getRetroStyle();
      const colors = retroStyle.colorPalette;

      let fillColor: string;
      let borderColor: string | undefined;

      switch (tileType) {
        case 'floor':
          fillColor = colors[7] || '#CCCCCC'; // Light gray
          break;
        case 'wall':
          fillColor = colors[0] || '#000000'; // Black
          borderColor = colors[1] || '#FFFFFF'; // White border
          break;
        case 'door':
          fillColor = colors[5] || '#FFFF00'; // Yellow
          borderColor = colors[0] || '#000000';
          break;
        case 'secret':
          fillColor = colors[6] || '#FF00FF'; // Magenta
          break;
        default:
          fillColor = colors[1] || '#FFFFFF'; // White
      }

      this.canvas.renderRectangle(x, y, size, size, fillColor, borderColor);

      // Add texture pattern for walls
      if (tileType === 'wall') {
        this.addWallTexture(x, y, size, colors);
      }

    } catch (error) {
      handleError(error, 'Failed to render tile', { 
        context: 'RetroRenderer.renderTile',
        tileType 
      });
    }
  }

  /**
   * Add retro wall texture pattern
   */
  private addWallTexture(x: number, y: number, size: number, colors: string[]): void {
    const context = this.canvas.getContext();
    context.fillStyle = colors[1] || '#FFFFFF';
    
    // Simple brick pattern
    for (let i = 0; i < size; i += 4) {
      for (let j = 0; j < size; j += 4) {
        if ((i + j) % 8 === 0) {
          context.fillRect(x + i, y + j, 1, 1);
        }
      }
    }
  }

  /**
   * Get tile type from room layout
   */
  private getTileType(room: Room, x: number, y: number): string {
    // Simple room layout logic - in a real game this would be more complex
    if (x === 0 || y === 0 || x === room.width - 1 || y === room.height - 1) {
      return 'wall';
    }
    
    // Check for doors at room edges
    if ((x === Math.floor(room.width / 2) && (y === 0 || y === room.height - 1)) ||
        (y === Math.floor(room.height / 2) && (x === 0 || x === room.width - 1))) {
      return 'door';
    }
    
    return 'floor';
  }

  /**
   * Render room connections
   */
  private renderConnections(room: Room, tileSize: number): void {
    // Render corridor connections - simplified for this implementation
    room.connections.forEach(connectionId => {
      // In a real implementation, this would render actual corridor graphics
      const x = room.width * tileSize + 10;
      const y = Math.floor(room.height / 2) * tileSize;
      this.canvas.renderText(`→ ${connectionId}`, x, y, undefined, 12);
    });
  }

  /**
   * Render player character with animation
   */
  private renderPlayer(gameState: GameState, renderConfig: RenderConfig): void {
    try {
      const tileSize = renderConfig.tileSize;
      const playerX = gameState.player.position.x * tileSize;
      const playerY = gameState.player.position.y * tileSize;

      // Get current animation frame
      const animationKey = gameState.player.isMoving ? 'player_walk' : 'player_idle';
      const sprite = this.getCurrentAnimationSprite(animationKey, playerX, playerY, tileSize);

      if (sprite) {
        this.canvas.renderSprite(sprite);
      } else {
        // Fallback rendering
        const colors = this.canvas.getRetroStyle().colorPalette;
        this.canvas.renderRectangle(
          playerX + 2, playerY + 2, 
          tileSize - 4, tileSize - 4, 
          colors[2] || '#FF0000' // Red for player
        );
      }

      // Render player health bar if UI complexity allows
      const uiComplexity = this.visualAdapter.getCurrentUIComplexity();
      if (uiComplexity !== 'minimal') {
        this.renderHealthBar(playerX, playerY - 8, tileSize, gameState.player.health, gameState.player.maxHealth);
      }

    } catch (error) {
      handleError(error, 'Failed to render player', { 
        context: 'RetroRenderer.renderPlayer' 
      });
    }
  }

  /**
   * Render enemies with animations
   */
  private renderEnemies(gameState: GameState, renderConfig: RenderConfig): void {
    try {
      const tileSize = renderConfig.tileSize;
      const colors = this.canvas.getRetroStyle().colorPalette;

      gameState.enemies.forEach(enemy => {
        const enemyX = enemy.position.x * tileSize;
        const enemyY = enemy.position.y * tileSize;

        // Get current animation frame
        const sprite = this.getCurrentAnimationSprite('enemy_idle', enemyX, enemyY, tileSize);

        if (sprite) {
          this.canvas.renderSprite(sprite);
        } else {
          // Fallback rendering
          this.canvas.renderRectangle(
            enemyX + 2, enemyY + 2, 
            tileSize - 4, tileSize - 4, 
            colors[4] || '#0000FF' // Blue for enemies
          );
        }

        // Render enemy health bar for detailed UI
        const uiComplexity = this.visualAdapter.getCurrentUIComplexity();
        if (uiComplexity === 'detailed' || uiComplexity === 'comprehensive') {
          this.renderHealthBar(enemyX, enemyY - 8, tileSize, enemy.health, enemy.maxHealth);
        }
      });

    } catch (error) {
      handleError(error, 'Failed to render enemies', { 
        context: 'RetroRenderer.renderEnemies' 
      });
    }
  }

  /**
   * Render health bar with retro styling
   */
  private renderHealthBar(x: number, y: number, width: number, health: number, maxHealth: number): void {
    try {
      const colors = this.canvas.getRetroStyle().colorPalette;
      const healthPercent = health / maxHealth;
      const barWidth = width - 4;
      const barHeight = 4;

      // Background
      this.canvas.renderRectangle(x + 2, y, barWidth, barHeight, colors[0] || '#000000');

      // Health fill
      const fillWidth = Math.floor(barWidth * healthPercent);
      const healthColor = healthPercent > 0.6 ? (colors[3] || '#00FF00') : 
                         healthPercent > 0.3 ? (colors[5] || '#FFFF00') : 
                         (colors[2] || '#FF0000');
      
      if (fillWidth > 0) {
        this.canvas.renderRectangle(x + 2, y, fillWidth, barHeight, healthColor);
      }

    } catch (error) {
      handleError(error, 'Failed to render health bar', { 
        context: 'RetroRenderer.renderHealthBar' 
      });
    }
  }

  /**
   * Render UI elements based on complexity level
   */
  private renderUI(gameState: GameState, uiComplexity: string, retroStyle: RetroStyle): void {
    try {
      const colors = retroStyle.colorPalette;

      // Always show basic info
      this.canvas.renderText(`HP: ${gameState.player.health}/${gameState.player.maxHealth}`, 10, 10, colors[1]);
      
      if (uiComplexity !== 'minimal') {
        // Show additional stats
        this.canvas.renderText(`Level: ${gameState.player.level}`, 10, 30, colors[1]);
        this.canvas.renderText(`Room: ${gameState.currentRoom}`, 10, 50, colors[1]);
      }

      if (uiComplexity === 'detailed' || uiComplexity === 'comprehensive') {
        // Show detailed information
        this.canvas.renderText(`Enemies: ${gameState.enemies.length}`, 10, 70, colors[1]);
        this.canvas.renderText(`Items: ${gameState.items.length}`, 10, 90, colors[1]);
      }

      if (uiComplexity === 'comprehensive') {
        // Show comprehensive analytics
        this.renderMiniMap(gameState, 200, 10, 100, 80, colors);
        this.renderPerformanceMetrics(gameState, 10, 120, colors);
      }

    } catch (error) {
      handleError(error, 'Failed to render UI', { 
        context: 'RetroRenderer.renderUI' 
      });
    }
  }

  /**
   * Render mini-map for comprehensive UI
   */
  private renderMiniMap(gameState: GameState, x: number, y: number, width: number, height: number, colors: string[]): void {
    try {
      // Background
      this.canvas.renderRectangle(x, y, width, height, colors[0], colors[1]);
      
      // Title
      this.canvas.renderText('Map', x + 5, y + 5, colors[1], 10);

      // Simplified room representation
      const roomSize = 8;
      gameState.dungeon.rooms.forEach((room, index) => {
        const roomX = x + 10 + (index % 8) * (roomSize + 2);
        const roomY = y + 20 + Math.floor(index / 8) * (roomSize + 2);
        
        const isCurrentRoom = room.id === gameState.currentRoom;
        const roomColor = isCurrentRoom ? colors[2] : colors[7];
        
        this.canvas.renderRectangle(roomX, roomY, roomSize, roomSize, roomColor);
      });

    } catch (error) {
      handleError(error, 'Failed to render mini-map', { 
        context: 'RetroRenderer.renderMiniMap' 
      });
    }
  }

  /**
   * Render performance metrics for comprehensive UI
   */
  private renderPerformanceMetrics(gameState: GameState, x: number, y: number, colors: string[]): void {
    try {
      const frameRate = this.canvas.getFrameRate();
      
      this.canvas.renderText(`FPS: ${Math.round(frameRate)}`, x, y, colors[1], 10);
      this.canvas.renderText(`Time: ${Math.round(gameState.gameTime / 1000)}s`, x, y + 15, colors[1], 10);

    } catch (error) {
      handleError(error, 'Failed to render performance metrics', { 
        context: 'RetroRenderer.renderPerformanceMetrics' 
      });
    }
  }

  /**
   * Render debug information for advanced users
   */
  private renderDebugInfo(gameState: GameState, retroStyle: RetroStyle): void {
    try {
      const colors = retroStyle.colorPalette;
      const debugY = 200;

      this.canvas.renderText('DEBUG INFO:', 10, debugY, colors[6], 10);
      this.canvas.renderText(`Player Pos: (${gameState.player.position.x}, ${gameState.player.position.y})`, 10, debugY + 15, colors[1], 10);
      this.canvas.renderText(`Dungeon Seed: ${gameState.dungeon.seed || 'N/A'}`, 10, debugY + 30, colors[1], 10);
      this.canvas.renderText(`Difficulty: ${gameState.difficulty}`, 10, debugY + 45, colors[1], 10);

    } catch (error) {
      handleError(error, 'Failed to render debug info', { 
        context: 'RetroRenderer.renderDebugInfo' 
      });
    }
  }

  /**
   * Update animation frames based on delta time
   */
  private updateAnimations(deltaTime: number): void {
    try {
      this.lastAnimationUpdate += deltaTime;
      
      const renderConfig = this.canvas.getRenderConfig();
      if (!renderConfig.enableAnimations) return;

      const animationSpeed = renderConfig.animationSpeed;
      const updateInterval = 100 / animationSpeed; // Base animation speed

      if (this.lastAnimationUpdate >= updateInterval) {
        this.animations.forEach((frames, animationKey) => {
          const currentFrame = this.currentAnimationFrames.get(animationKey) || 0;
          const nextFrame = (currentFrame + 1) % frames.length;
          this.currentAnimationFrames.set(animationKey, nextFrame);
        });
        
        this.lastAnimationUpdate = 0;
      }

    } catch (error) {
      handleError(error, 'Failed to update animations', { 
        context: 'RetroRenderer.updateAnimations' 
      });
    }
  }

  /**
   * Get current animation sprite for an animation key
   */
  private getCurrentAnimationSprite(animationKey: string, x: number, y: number, size: number): SpriteData | null {
    try {
      const frames = this.animations.get(animationKey);
      if (!frames || frames.length === 0) return null;

      const currentFrameIndex = this.currentAnimationFrames.get(animationKey) || 0;
      const frame = frames[currentFrameIndex];
      
      if (!frame || frame.sprites.length === 0) return null;

      const baseSprite = frame.sprites[0];
      if (!baseSprite) return null;
      
      const sprite: SpriteData = {
        id: baseSprite.id,
        x: x,
        y: y,
        width: size,
        height: size,
        sourceX: baseSprite.sourceX,
        sourceY: baseSprite.sourceY,
        ...(baseSprite.rotation !== undefined && { rotation: baseSprite.rotation }),
        ...(baseSprite.scale !== undefined && { scale: baseSprite.scale }),
        ...(baseSprite.opacity !== undefined && { opacity: baseSprite.opacity })
      };

      return sprite;

    } catch (error) {
      handleError(error, 'Failed to get animation sprite', { 
        context: 'RetroRenderer.getCurrentAnimationSprite',
        animationKey 
      });
      return null;
    }
  }

  /**
   * Add custom animation
   */
  public addAnimation(key: string, frames: AnimationFrame[]): void {
    try {
      this.animations.set(key, frames);
      this.currentAnimationFrames.set(key, 0);
    } catch (error) {
      handleError(error, 'Failed to add animation', { 
        context: 'RetroRenderer.addAnimation',
        animationKey: key 
      });
    }
  }

  /**
   * Remove animation
   */
  public removeAnimation(key: string): void {
    this.animations.delete(key);
    this.currentAnimationFrames.delete(key);
  }

  /**
   * Update visual configuration
   */
  public updateVisualConfig(): void {
    try {
      this.canvas.updateVisualConfig();
    } catch (error) {
      handleError(error, 'Failed to update visual config', { 
        context: 'RetroRenderer.updateVisualConfig' 
      });
    }
  }

  /**
   * Clear tile cache (useful when visual settings change)
   */
  public clearCache(): void {
    this.tileCache.clear();
  }

  /**
   * Get animation keys
   */
  public getAnimationKeys(): string[] {
    return Array.from(this.animations.keys());
  }
}