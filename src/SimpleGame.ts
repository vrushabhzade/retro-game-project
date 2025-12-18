import { GameEngine, GameEngineConfig } from './engine/GameEngine';
import { logger } from './utils/ErrorHandling';

/**
 * Simple Game Implementation for Local Development
 * This version works without backend dependencies
 */
export class SimpleGame {
  private gameEngine: GameEngine;
  private canvas: HTMLCanvasElement;
  private isInitialized: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    const config: Partial<GameEngineConfig> = {
      targetFrameRate: 60,
      dungeonConfig: {
        width: 20,
        height: 20,
        minRooms: 5,
        maxRooms: 8
      }
    };

    this.gameEngine = new GameEngine(config);
    this.setupEventHandlers();
  }

  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      // Start the game engine
      this.gameEngine.start();
      this.isInitialized = true;
      
      logger.info('Simple game initialized successfully');
      
      // Start render loop
      this.startRenderLoop();
      
    } catch (error) {
      logger.error('Failed to initialize simple game:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    // Handle keyboard input
    document.addEventListener('keydown', (event) => {
      this.handleKeyPress(event);
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });

    // Initial canvas resize
    this.resizeCanvas();
  }

  private handleKeyPress(event: KeyboardEvent): void {
    const direction = this.getDirectionFromKey(event.key);
    
    if (direction) {
      // Queue movement action
      this.gameEngine.queueAction({
        type: 'move',
        direction: direction as any,
        timestamp: Date.now()
      });
      
      event.preventDefault();
      return;
    }

    // Handle other actions
    switch (event.key.toLowerCase()) {
      case ' ':
        // Space for attack
        this.gameEngine.queueAction({
          type: 'attack',
          timestamp: Date.now()
        });
        event.preventDefault();
        break;
        
      case 'e':
        // E for use item
        this.gameEngine.queueAction({
          type: 'use_item',
          timestamp: Date.now()
        });
        event.preventDefault();
        break;
        
      case 'shift':
        // Shift for defend
        this.gameEngine.queueAction({
          type: 'defend',
          timestamp: Date.now()
        });
        event.preventDefault();
        break;
        
      case 'n':
        // N for new dungeon
        this.gameEngine.generateNewDungeon();
        logger.info('Generated new dungeon');
        event.preventDefault();
        break;
        
      case 'p':
        // P for performance metrics
        const metrics = this.gameEngine.getPerformanceMetrics();
        logger.info('Performance metrics:', metrics);
        event.preventDefault();
        break;
    }
  }

  private getDirectionFromKey(key: string): string | null {
    switch (key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        return 'north';
      case 's':
      case 'arrowdown':
        return 'south';
      case 'a':
      case 'arrowleft':
        return 'west';
      case 'd':
      case 'arrowright':
        return 'east';
      default:
        return null;
    }
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      this.canvas.width = Math.min(800, rect.width - 40);
      this.canvas.height = Math.min(600, rect.height - 40);
    }
  }

  private startRenderLoop(): void {
    const render = () => {
      if (!this.isInitialized) {
        return;
      }

      try {
        this.renderGame();
      } catch (error) {
        logger.error('Render error:', error);
      }

      requestAnimationFrame(render);
    };

    render();
  }

  private renderGame(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Get current game state
    const gameState = this.gameEngine.getGameState();
    
    // Simple rendering
    this.renderDungeon(ctx, gameState);
    this.renderPlayer(ctx, gameState);
    this.renderEnemies(ctx, gameState);
    this.renderItems(ctx, gameState);
    this.renderUI(ctx, gameState);
  }

  private renderDungeon(ctx: CanvasRenderingContext2D, gameState: any): void {
    const cellSize = 20;
    const dungeon = gameState.dungeon;
    
    // Render rooms
    ctx.fillStyle = '#333333';
    for (const room of dungeon.rooms) {
      ctx.fillRect(
        room.position.x * cellSize,
        room.position.y * cellSize,
        room.width * cellSize,
        room.height * cellSize
      );
    }

    // Render corridors
    ctx.fillStyle = '#444444';
    for (const corridor of dungeon.corridors) {
      for (const point of corridor.path) {
        ctx.fillRect(
          point.x * cellSize,
          point.y * cellSize,
          cellSize,
          cellSize
        );
      }
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D, gameState: any): void {
    const cellSize = 20;
    const player = gameState.player;
    
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(
      player.position.x * cellSize + 2,
      player.position.y * cellSize + 2,
      cellSize - 4,
      cellSize - 4
    );
    
    // Player health bar
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(
      player.position.x * cellSize,
      player.position.y * cellSize - 8,
      cellSize,
      4
    );
    
    ctx.fillStyle = '#00FF00';
    const healthPercent = player.health / player.maxHealth;
    ctx.fillRect(
      player.position.x * cellSize,
      player.position.y * cellSize - 8,
      cellSize * healthPercent,
      4
    );
  }

  private renderEnemies(ctx: CanvasRenderingContext2D, gameState: any): void {
    const cellSize = 20;
    
    ctx.fillStyle = '#FF0000';
    for (const enemy of gameState.enemies) {
      if (enemy.health > 0) {
        ctx.fillRect(
          enemy.position.x * cellSize + 2,
          enemy.position.y * cellSize + 2,
          cellSize - 4,
          cellSize - 4
        );
        
        // Enemy health bar
        ctx.fillStyle = '#800000';
        ctx.fillRect(
          enemy.position.x * cellSize,
          enemy.position.y * cellSize - 8,
          cellSize,
          4
        );
        
        ctx.fillStyle = '#FF0000';
        const healthPercent = enemy.health / enemy.maxHealth;
        ctx.fillRect(
          enemy.position.x * cellSize,
          enemy.position.y * cellSize - 8,
          cellSize * healthPercent,
          4
        );
      }
    }
  }

  private renderItems(ctx: CanvasRenderingContext2D, gameState: any): void {
    const cellSize = 20;
    
    ctx.fillStyle = '#FFFF00';
    for (const item of gameState.items) {
      ctx.fillRect(
        item.position.x * cellSize + 6,
        item.position.y * cellSize + 6,
        cellSize - 12,
        cellSize - 12
      );
    }
  }

  private renderUI(ctx: CanvasRenderingContext2D, gameState: any): void {
    const player = gameState.player;
    
    // UI background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 100);
    
    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px monospace';
    ctx.fillText(`Health: ${player.health}/${player.maxHealth}`, 20, 30);
    ctx.fillText(`Level: ${player.level}`, 20, 50);
    ctx.fillText(`XP: ${player.experience}`, 20, 70);
    ctx.fillText(`Room: ${gameState.currentRoom}`, 20, 90);
    
    // Combat status
    if (gameState.isInCombat) {
      ctx.fillStyle = '#FF0000';
      ctx.fillText('IN COMBAT!', 20, 110);
    }
    
    // Controls
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '12px monospace';
    ctx.fillText('WASD: Move | Space: Attack | E: Use Item', 10, this.canvas.height - 40);
    ctx.fillText('N: New Dungeon | P: Performance', 10, this.canvas.height - 25);
    ctx.fillText('Shift: Defend', 10, this.canvas.height - 10);
  }

  // Public API
  public getGameState(): any {
    return this.gameEngine.getGameState();
  }

  public isRunning(): boolean {
    return this.gameEngine.isGameRunning();
  }

  public stop(): void {
    this.gameEngine.stop();
    this.isInitialized = false;
  }

  public getPerformanceMetrics(): any {
    return this.gameEngine.getPerformanceMetrics();
  }
}