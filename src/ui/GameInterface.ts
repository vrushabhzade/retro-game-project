import { GameEngine } from '../engine/GameEngine';
import { AIMentorSystem } from '../ai/AIMentorSystem';
import { VisualAdaptationEngine } from '../ai/VisualAdaptationEngine';
import { CombatAnalysisSystem } from '../combat/CombatAnalysis';
import { GameCanvas } from './GameCanvas';
import { ThoughtBubbleUI } from './ThoughtBubbleUI';
import { AnalysisPanel } from './AnalysisPanel';
import { PlayerProfile } from '../player/PlayerProfile';
import { SaveManager } from '../data/SaveManager';
import { ConfigurationManager } from '../data/ConfigurationManager';
import { handleError } from '../utils/ErrorHandling';
import { PlayerAction } from '../types/GameTypes';

export interface GameInterfaceConfig {
  canvasWidth: number;
  canvasHeight: number;
  enableUI: boolean;
  enableAI: boolean;
  autoSaveInterval: number; // minutes
}

/**
 * Main game interface that coordinates all UI elements and game systems
 */
export class GameInterface {
  private gameEngine: GameEngine;
  private aiMentor: AIMentorSystem;
  private visualAdapter: VisualAdaptationEngine;
  private combatAnalysis: CombatAnalysisSystem;
  private saveManager: SaveManager;
  private configManager: ConfigurationManager;
  
  // UI Components
  private gameCanvas!: GameCanvas;
  private thoughtBubbleUI!: ThoughtBubbleUI;
  private analysisPanel!: AnalysisPanel;
  
  // Game state
  private currentProfile: PlayerProfile;
  private isGameActive: boolean = false;
  private isPaused: boolean = false;
  private autoSaveTimer: number | null = null;
  
  // UI Elements
  private containerElement!: HTMLElement;
  private hudElement!: HTMLElement;
  private config: GameInterfaceConfig;

  constructor(
    gameEngine: GameEngine,
    aiMentor: AIMentorSystem,
    visualAdapter: VisualAdaptationEngine,
    combatAnalysis: CombatAnalysisSystem,
    saveManager: SaveManager,
    configManager: ConfigurationManager,
    currentProfile: PlayerProfile,
    config?: Partial<GameInterfaceConfig>
  ) {
    this.gameEngine = gameEngine;
    this.aiMentor = aiMentor;
    this.visualAdapter = visualAdapter;
    this.combatAnalysis = combatAnalysis;
    this.saveManager = saveManager;
    this.configManager = configManager;
    this.currentProfile = currentProfile;
    
    this.config = {
      canvasWidth: 800,
      canvasHeight: 600,
      enableUI: true,
      enableAI: true,
      autoSaveInterval: 5,
      ...config
    };

    this.initializeInterface();
  }

  /**
   * Initialize the game interface
   */
  private initializeInterface(): void {
    this.createContainerElement();
    this.initializeUIComponents();
    this.setupEventListeners();
    this.setupAutoSave();
  }

  /**
   * Create the main container element
   */
  private createContainerElement(): void {
    // Check if we're in a browser environment
    if (typeof document === 'undefined' || !document.body) {
      // Create mock elements for testing
      this.containerElement = {
        id: 'game-interface',
        className: 'game-interface',
        style: {},
        appendChild: () => {},
        removeChild: () => {}
      } as any;
      
      this.hudElement = {
        id: 'game-hud',
        className: 'game-hud',
        style: {},
        innerHTML: ''
      } as any;
      return;
    }

    this.containerElement = document.createElement('div');
    this.containerElement.id = 'game-interface';
    this.containerElement.className = 'game-interface';
    
    this.containerElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000;
      color: #00ff00;
      font-family: 'Courier New', monospace;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 100;
    `;

    // Create HUD element
    this.hudElement = document.createElement('div');
    this.hudElement.id = 'game-hud';
    this.hudElement.className = 'game-hud';
    
    this.hudElement.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      height: 60px;
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid #00ff00;
      padding: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 200;
    `;

    this.containerElement.appendChild(this.hudElement);
    document.body.appendChild(this.containerElement);
  }

  /**
   * Initialize UI components
   */
  private initializeUIComponents(): void {
    try {
      // Create game canvas
      let canvas: HTMLCanvasElement;
      
      if (typeof document !== 'undefined') {
        canvas = document.createElement('canvas');
        canvas.width = this.config.canvasWidth;
        canvas.height = this.config.canvasHeight;
        canvas.style.cssText = `
          position: absolute;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          border: 2px solid #00ff00;
          background: #000;
        `;
      } else {
        // Mock canvas for testing
        canvas = {
          width: this.config.canvasWidth,
          height: this.config.canvasHeight,
          style: {},
          getContext: () => ({
            fillRect: () => {},
            clearRect: () => {},
            drawImage: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            scale: () => {},
            rotate: () => {},
            fillText: () => {},
            measureText: () => ({ width: 100 }),
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            stroke: () => {},
            fill: () => {},
            arc: () => {},
            rect: () => {},
            closePath: () => {}
          }),
          addEventListener: () => {},
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            width: this.config.canvasWidth,
            height: this.config.canvasHeight
          })
        } as any;
      }

      const canvasConfig = {
        width: this.config.canvasWidth,
        height: this.config.canvasHeight,
        pixelRatio: 1,
        backgroundColor: '#000000'
      };

      this.gameCanvas = new GameCanvas(canvas, canvasConfig, this.visualAdapter);
      this.containerElement.appendChild(canvas);

      // Initialize thought bubble UI
      if (this.config.enableUI) {
        let thoughtBubbleContainer: HTMLElement;
        
        if (typeof document !== 'undefined') {
          thoughtBubbleContainer = document.createElement('div');
          thoughtBubbleContainer.style.cssText = `
            position: absolute;
            top: 100px;
            right: 20px;
            width: 300px;
            max-height: 400px;
            z-index: 150;
          `;
        } else {
          // Mock container for testing
          thoughtBubbleContainer = {
            style: {},
            appendChild: () => {},
            removeChild: () => {},
            innerHTML: '',
            classList: {
              add: () => {},
              remove: () => {},
              contains: () => false
            }
          } as any;
        }
        
        this.thoughtBubbleUI = new ThoughtBubbleUI(thoughtBubbleContainer);
        this.containerElement.appendChild(thoughtBubbleContainer);

        // Initialize analysis panel
        let analysisPanelElement: HTMLElement;
        
        if (typeof document !== 'undefined') {
          analysisPanelElement = document.createElement('div');
          analysisPanelElement.id = 'analysis-panel';
          analysisPanelElement.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            height: 200px;
            z-index: 150;
          `;
        } else {
          // Mock element for testing
          analysisPanelElement = {
            id: 'analysis-panel',
            style: {},
            appendChild: () => {},
            removeChild: () => {}
          } as any;
        }
        
        this.containerElement.appendChild(analysisPanelElement);
        this.analysisPanel = new AnalysisPanel(this.gameCanvas, this.visualAdapter);
      }

      this.updateHUD();
      
    } catch (error) {
      handleError(error as Error, 'Failed to initialize UI components');
      throw error;
    }
  }

  /**
   * Setup event listeners for game controls
   */
  private setupEventListeners(): void {
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
      if (!this.isGameActive || this.isPaused) return;

      this.handleKeyboardInput(event);
    });

    // Mouse controls for canvas
    if (this.gameCanvas) {
      const canvas = this.gameCanvas.getCanvas();
      
      canvas.addEventListener('click', (event) => {
        if (!this.isGameActive || this.isPaused) return;
        
        this.handleMouseClick(event);
      });

      canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault(); // Prevent context menu
        if (!this.isGameActive || this.isPaused) return;
        
        this.handleRightClick(event);
      });
    }

    // Window events
    window.addEventListener('beforeunload', () => {
      this.handleGameExit();
    });

    window.addEventListener('blur', () => {
      this.pauseGame();
    });

    window.addEventListener('focus', () => {
      if (this.isGameActive) {
        this.resumeGame();
      }
    });
  }

  /**
   * Handle keyboard input
   */
  private handleKeyboardInput(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    
    // Movement keys
    const movementKeys: { [key: string]: string } = {
      'arrowup': 'north',
      'arrowdown': 'south',
      'arrowleft': 'west',
      'arrowright': 'east',
      'w': 'north',
      's': 'south',
      'a': 'west',
      'd': 'east'
    };

    if (movementKeys[key]) {
      const direction = movementKeys[key] as 'north' | 'south' | 'east' | 'west';
      const action: PlayerAction = {
        type: 'move',
        direction: direction,
        timestamp: Date.now()
      };
      this.gameEngine.queueAction(action);
      event.preventDefault();
      return;
    }

    // Action keys
    switch (key) {
      case ' ': // Spacebar - attack
        this.gameEngine.queueAction({
          type: 'attack',
          timestamp: Date.now()
        });
        event.preventDefault();
        break;

      case 'shift': // Defend
        this.gameEngine.queueAction({
          type: 'defend',
          timestamp: Date.now()
        });
        event.preventDefault();
        break;

      case 'escape': // Pause/Menu
        this.togglePause();
        event.preventDefault();
        break;

      case 'h': // Help/Hint
        this.requestAIHint();
        event.preventDefault();
        break;

      case 'i': // Inventory
        this.showInventory();
        event.preventDefault();
        break;

      case 'c': // Combat analysis
        this.showCombatAnalysis();
        event.preventDefault();
        break;

      case 'm': // Map
        this.showMap();
        event.preventDefault();
        break;

      case 'f1': // Debug info
        this.toggleDebugInfo();
        event.preventDefault();
        break;
    }
  }

  /**
   * Handle mouse click on canvas
   */
  private handleMouseClick(event: MouseEvent): void {
    const canvas = this.gameCanvas.getCanvas();
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert screen coordinates to game coordinates
    const gameCoords = this.gameCanvas.screenToGameCoordinates(x, y);
    
    // Queue movement action to clicked position
    const action: PlayerAction = {
      type: 'move',
      target: gameCoords,
      timestamp: Date.now()
    };
    
    this.gameEngine.queueAction(action);
  }

  /**
   * Handle right click (context actions)
   */
  private handleRightClick(event: MouseEvent): void {
    const canvas = this.gameCanvas.getCanvas();
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const gameCoords = this.gameCanvas.screenToGameCoordinates(x, y);
    
    // Show context menu or perform context action
    this.showContextMenu(gameCoords, x, y);
  }

  /**
   * Start the game interface
   */
  public startGame(): void {
    try {
      this.isGameActive = true;
      this.isPaused = false;
      
      // Start game engine
      this.gameEngine.start();
      
      // Start render loop
      this.startRenderLoop();
      
      // Initialize AI systems
      if (this.config.enableAI) {
        this.aiMentor.initialize(this.currentProfile);
        this.visualAdapter.initialize(this.currentProfile);
      }

      console.log('Game interface started');
      
    } catch (error) {
      handleError(error as Error, 'Failed to start game interface');
      throw error;
    }
  }

  /**
   * Stop the game interface
   */
  public stopGame(): void {
    try {
      this.isGameActive = false;
      
      // Stop game engine
      this.gameEngine.stop();
      
      // Save game state
      this.saveGameState();
      
      // Cleanup auto-save timer
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer);
        this.autoSaveTimer = null;
      }

      console.log('Game interface stopped');
      
    } catch (error) {
      handleError(error as Error, 'Failed to stop game interface');
    }
  }

  /**
   * Pause the game
   */
  public pauseGame(): void {
    if (!this.isGameActive) return;
    
    this.isPaused = true;
    this.gameEngine.stop();
    this.showPauseMenu();
  }

  /**
   * Resume the game
   */
  public resumeGame(): void {
    if (!this.isGameActive) return;
    
    this.isPaused = false;
    this.gameEngine.start();
    this.hidePauseMenu();
  }

  /**
   * Toggle pause state
   */
  public togglePause(): void {
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  /**
   * Start the render loop
   */
  private startRenderLoop(): void {
    const renderFrame = () => {
      if (!this.isGameActive) return;

      try {
        // Get current game state
        const gameState = this.gameEngine.getGameState();
        
        // Render game canvas
        this.gameCanvas.render(gameState);
        
        // Update UI components
        if (this.config.enableUI) {
          this.updateUI(gameState);
        }
        
        // Update HUD
        this.updateHUD();
        
        // Continue render loop
        requestAnimationFrame(renderFrame);
        
      } catch (error) {
        handleError(error as Error, 'Render loop error');
        this.stopGame();
      }
    };

    renderFrame();
  }

  /**
   * Update UI components
   */
  private updateUI(gameState: any): void {
    try {
      // Update thought bubble UI with AI suggestions
      if (this.thoughtBubbleUI && this.config.enableAI) {
        const aiSuggestion = this.aiMentor.generateHint(gameState);
        if (aiSuggestion) {
          this.thoughtBubbleUI.displayHint(aiSuggestion);
        }
      }

      // Update analysis panel if in combat
      if (this.analysisPanel && gameState.isInCombat) {
        const combatLog = this.gameEngine.getCombatLog();
        if (combatLog.length > 0) {
          // Analysis panel integration would be implemented here
          // For now, just log that combat is happening
          console.log('Combat analysis would be displayed here');
        }
      }
      
    } catch (error) {
      handleError(error as Error, 'UI update error');
    }
  }

  /**
   * Update HUD display
   */
  private updateHUD(): void {
    if (!this.hudElement) return;

    try {
      const gameState = this.gameEngine.getGameState();
      const player = gameState.player;
      const performanceMetrics = this.gameEngine.getPerformanceMetrics();

      this.hudElement.innerHTML = `
        <div class="hud-left">
          <span>HP: ${player.health}/${player.maxHealth}</span>
          <span style="margin-left: 20px;">Level: ${player.level}</span>
          <span style="margin-left: 20px;">XP: ${player.experience}</span>
        </div>
        
        <div class="hud-center">
          <span>${gameState.isInCombat ? 'COMBAT' : 'EXPLORING'}</span>
          ${this.isPaused ? '<span style="color: #ffff00; margin-left: 10px;">PAUSED</span>' : ''}
        </div>
        
        <div class="hud-right">
          <span>FPS: ${Math.round(1000 / performanceMetrics.averageFrameTime)}</span>
          <span style="margin-left: 20px;">Room: ${gameState.currentRoom || 'Unknown'}</span>
        </div>
      `;
      
    } catch (error) {
      handleError(error as Error, 'HUD update error');
    }
  }

  /**
   * Setup auto-save functionality
   */
  private setupAutoSave(): void {
    if (this.config.autoSaveInterval > 0) {
      this.autoSaveTimer = window.setInterval(() => {
        if (this.isGameActive && !this.isPaused) {
          this.autoSave();
        }
      }, this.config.autoSaveInterval * 60 * 1000); // Convert minutes to milliseconds
    }
  }

  /**
   * Perform auto-save
   */
  private async autoSave(): Promise<void> {
    try {
      const gameState = this.gameEngine.getGameState();
      await this.saveManager.autoSave(gameState, this.currentProfile);
      console.log('Auto-save completed');
    } catch (error) {
      handleError(error as Error, 'Auto-save failed');
    }
  }

  /**
   * Save current game state
   */
  private async saveGameState(): Promise<void> {
    try {
      const gameState = this.gameEngine.getGameState();
      await this.saveManager.autoSave(gameState, this.currentProfile);
    } catch (error) {
      handleError(error as Error, 'Failed to save game state');
    }
  }

  /**
   * Request AI hint
   */
  private requestAIHint(): void {
    if (!this.config.enableAI) return;

    try {
      const gameState = this.gameEngine.getGameState();
      const hint = this.aiMentor.generateHint(gameState);
      
      if (hint && this.thoughtBubbleUI) {
        this.thoughtBubbleUI.displayHint(hint);
      }
    } catch (error) {
      handleError(error as Error, 'Failed to generate AI hint');
    }
  }

  /**
   * Show inventory (placeholder)
   */
  private showInventory(): void {
    console.log('Inventory requested - not implemented yet');
  }

  /**
   * Show combat analysis
   */
  private showCombatAnalysis(): void {
    if (!this.analysisPanel) return;

    try {
      const combatLog = this.gameEngine.getCombatLog();
      if (combatLog.length > 0) {
        const analysisResult = this.combatAnalysis.analyzeCombat(combatLog, 1000, 'victory');
        console.log('Combat analysis result:', analysisResult);
      }
    } catch (error) {
      handleError(error as Error, 'Failed to show combat analysis');
    }
  }

  /**
   * Show map (placeholder)
   */
  private showMap(): void {
    console.log('Map requested - not implemented yet');
  }

  /**
   * Toggle debug information
   */
  private toggleDebugInfo(): void {
    const debugConfig = this.configManager.getDebugConfig();
    this.configManager.updateDebugConfig({
      showPerformanceMetrics: !debugConfig.showPerformanceMetrics
    });
  }

  /**
   * Show context menu
   */
  private showContextMenu(gameCoords: any, screenX: number, screenY: number): void {
    console.log('Context menu requested at:', gameCoords, 'screen:', screenX, screenY);
    // Placeholder for context menu implementation
  }

  /**
   * Show pause menu
   */
  private showPauseMenu(): void {
    const pauseMenu = document.createElement('div');
    pauseMenu.id = 'pause-menu';
    pauseMenu.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid #00ff00;
      padding: 2em;
      text-align: center;
      z-index: 300;
    `;

    pauseMenu.innerHTML = `
      <h2>Game Paused</h2>
      <p>Press ESC to resume</p>
      <p>Press F1 for help</p>
    `;

    this.containerElement.appendChild(pauseMenu);
  }

  /**
   * Hide pause menu
   */
  private hidePauseMenu(): void {
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
      pauseMenu.remove();
    }
  }

  /**
   * Handle game exit
   */
  private handleGameExit(): void {
    if (this.isGameActive) {
      this.saveGameState();
    }
  }

  /**
   * Get current game state
   */
  public getGameState(): any {
    return this.gameEngine.getGameState();
  }

  /**
   * Check if game is active
   */
  public isActive(): boolean {
    return this.isGameActive;
  }

  /**
   * Check if game is paused
   */
  public isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Get current player profile
   */
  public getCurrentProfile(): PlayerProfile {
    return this.currentProfile;
  }

  /**
   * Update current player profile
   */
  public setCurrentProfile(profile: PlayerProfile): void {
    this.currentProfile = profile;
    
    if (this.config.enableAI) {
      this.aiMentor.initialize(profile);
      this.visualAdapter.initialize(profile);
    }
  }

  /**
   * Cleanup interface resources
   */
  public destroy(): void {
    this.stopGame();
    
    if (this.containerElement && this.containerElement.parentNode) {
      this.containerElement.parentNode.removeChild(this.containerElement);
    }
    
    // Cleanup UI components
    if (this.thoughtBubbleUI) {
      this.thoughtBubbleUI.destroy();
    }
    
    // Analysis panel cleanup would be implemented here
    console.log('Analysis panel cleanup');
  }
}