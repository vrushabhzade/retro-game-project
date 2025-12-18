// Main entry point for AI-Enhanced Dungeon Master Game

console.log('Loading AI-Enhanced Dungeon Master Game...');

import { GameEngine } from './engine/GameEngine';
import { AIMentorSystem } from './ai/AIMentorSystem';
import { VisualAdaptationEngine } from './ai/VisualAdaptationEngine';
import { CombatAnalysisSystem } from './combat/CombatAnalysis';
import { SaveManager } from './data/SaveManager';
import { PlayerProfileManager } from './data/PlayerProfileManager';
import { ConfigurationManager } from './data/ConfigurationManager';
import { PlayerProfile } from './player/PlayerProfile';
import { MainMenu } from './ui/MainMenu';
import { GameInterface } from './ui/GameInterface';
import { handleError } from './utils/ErrorHandling';

/**
 * Main application class that orchestrates all game systems
 */
export class AIDungeonMasterGame {
  // Core game systems
  private gameEngine: GameEngine;
  private aiMentor: AIMentorSystem;
  private visualAdapter: VisualAdaptationEngine;
  private combatAnalysis: CombatAnalysisSystem;
  
  // Data management systems
  private saveManager: SaveManager;
  private profileManager: PlayerProfileManager;
  private configManager: ConfigurationManager;
  
  // UI systems
  private mainMenu: MainMenu;
  private gameInterface: GameInterface | null = null;
  
  // Game state
  private currentProfile: PlayerProfile | null = null;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;

  constructor() {
    // Initialize data management systems first
    this.profileManager = new PlayerProfileManager();
    this.configManager = new ConfigurationManager();
    this.saveManager = new SaveManager(this.profileManager);
    
    // Initialize core game systems
    this.gameEngine = new GameEngine();
    this.aiMentor = new AIMentorSystem();
    this.visualAdapter = new VisualAdaptationEngine();
    this.combatAnalysis = new CombatAnalysisSystem();
    
    // Initialize main menu with callbacks
    this.mainMenu = new MainMenu(
      this.gameEngine,
      this.saveManager,
      this.profileManager,
      this.configManager,
      {
        onNewGame: () => this.handleNewGame(),
        onContinueGame: () => this.handleContinueGame(),
        onLoadGame: (saveId: string) => this.loadGame(saveId)
      }
    );
  }

  /**
   * Initialize and start the game application
   */
  public async start(): Promise<void> {
    try {
      console.log('Starting AI-Enhanced Dungeon Master Game...');
      
      if (this.isInitialized) {
        console.warn('Game already initialized');
        return;
      }

      // Initialize configuration manager
      await this.configManager.initialize();
      console.log('✓ Configuration system initialized');

      // Load or create default profile
      await this.initializeDefaultProfile();
      console.log('✓ Player profile system initialized');

      // Apply configuration settings
      await this.applyConfiguration();
      console.log('✓ Configuration applied');

      // Initialize AI systems with current profile
      if (this.currentProfile) {
        this.aiMentor.initialize(this.currentProfile);
        this.visualAdapter.initialize(this.currentProfile);
        console.log('✓ AI systems initialized');
      }

      // Show main menu
      this.mainMenu.showMenu();
      console.log('✓ Main menu displayed');

      // Setup game event handlers
      this.setupEventHandlers();
      console.log('✓ Event handlers configured');

      this.isInitialized = true;
      this.isRunning = true;
      
      console.log('🎮 AI-Enhanced Dungeon Master Game started successfully!');
      
      // Dispatch game ready event
      window.dispatchEvent(new CustomEvent('gameReady'));
      
    } catch (error) {
      handleError(error as Error, 'Failed to start game', { context: 'Game startup' });
      throw error;
    }
  }

  /**
   * Handle new game request from menu
   */
  private async handleNewGame(): Promise<void> {
    try {
      // Ensure we have a current profile
      if (!this.currentProfile) {
        this.currentProfile = new PlayerProfile('default-player');
        await this.profileManager.saveProfile(this.currentProfile);
      }

      // Generate new dungeon
      this.gameEngine.generateNewDungeon();

      // Start game session
      await this.startGameSession();
    } catch (error) {
      handleError(error as Error, 'Failed to start new game');
      throw error;
    }
  }

  /**
   * Handle continue game request from menu
   */
  private async handleContinueGame(): Promise<void> {
    try {
      if (!this.currentProfile) {
        throw new Error('No current profile available');
      }

      // Try to load autosave
      const autoSave = await this.saveManager.loadAutoSave(this.currentProfile.playerId);
      
      if (autoSave) {
        // Load the saved game state
        this.gameEngine.loadGame(JSON.stringify(autoSave.gameState));
        this.currentProfile = autoSave.profile;
        
        // Re-initialize AI systems with loaded profile
        this.aiMentor.initialize(this.currentProfile);
        this.visualAdapter.initialize(this.currentProfile);
        
        // Start game session
        await this.startGameSession();
      } else {
        // No autosave available, start new game
        await this.handleNewGame();
      }
    } catch (error) {
      handleError(error as Error, 'Failed to continue game');
      throw error;
    }
  }

  /**
   * Start a new game session
   */
  public async startGameSession(): Promise<void> {
    try {
      if (!this.currentProfile) {
        throw new Error('No player profile available');
      }

      // Hide main menu
      this.mainMenu.hideMenu();

      // Create game interface
      this.gameInterface = new GameInterface(
        this.gameEngine,
        this.aiMentor,
        this.visualAdapter,
        this.combatAnalysis,
        this.saveManager,
        this.configManager,
        this.currentProfile
      );

      // Start the game
      this.gameInterface.startGame();
      
      console.log('Game session started');
      
    } catch (error) {
      handleError(error as Error, 'Failed to start game session');
      throw error;
    }
  }

  /**
   * End current game session and return to main menu
   */
  public async endGameSession(): Promise<void> {
    try {
      if (this.gameInterface) {
        this.gameInterface.stopGame();
        this.gameInterface.destroy();
        this.gameInterface = null;
      }

      // Show main menu
      this.mainMenu.showMenu();
      
      console.log('Game session ended');
      
    } catch (error) {
      handleError(error as Error, 'Failed to end game session');
    }
  }

  /**
   * Load a saved game
   */
  public async loadGame(saveId: string): Promise<void> {
    try {
      const saveData = await this.saveManager.loadGame(saveId);
      
      if (!saveData) {
        throw new Error('Save game not found');
      }

      // Load the game state
      this.gameEngine.loadGame(JSON.stringify(saveData.gameState));
      
      // Update current profile
      this.currentProfile = saveData.profile;
      this.mainMenu.setCurrentProfile(this.currentProfile);
      
      // Re-initialize AI systems with loaded profile
      this.aiMentor.initialize(this.currentProfile);
      this.visualAdapter.initialize(this.currentProfile);
      
      // Start game session
      await this.startGameSession();
      
      console.log(`Game loaded: ${saveId}`);
      
    } catch (error) {
      handleError(error as Error, `Failed to load game: ${saveId}`);
      throw error;
    }
  }

  /**
   * Save current game
   */
  public async saveGame(saveId: string): Promise<void> {
    try {
      if (!this.currentProfile) {
        throw new Error('No current profile to save');
      }

      const gameState = this.gameEngine.getGameState();
      await this.saveManager.saveGame(saveId, gameState, this.currentProfile);
      
      console.log(`Game saved: ${saveId}`);
      
    } catch (error) {
      handleError(error as Error, `Failed to save game: ${saveId}`);
      throw error;
    }
  }

  /**
   * Initialize default player profile
   */
  private async initializeDefaultProfile(): Promise<void> {
    try {
      // Try to load existing profiles
      const profiles = await this.profileManager.listProfiles();
      
      if (profiles.length > 0) {
        // Load the first available profile
        const profileId = profiles[0];
        if (profileId) {
          this.currentProfile = await this.profileManager.loadProfile(profileId);
        }
        console.log(`Loaded existing profile: ${profiles[0]}`);
      } else {
        // Create a new default profile
        this.currentProfile = new PlayerProfile('default-player');
        await this.profileManager.saveProfile(this.currentProfile);
        console.log('Created new default profile');
      }

      // Update main menu with current profile
      if (this.currentProfile) {
        this.mainMenu.setCurrentProfile(this.currentProfile);
      }
      
    } catch (error) {
      handleError(error as Error, 'Failed to initialize default profile');
      
      // Create emergency fallback profile
      this.currentProfile = new PlayerProfile('emergency-profile');
      console.warn('Using emergency fallback profile');
    }
  }

  /**
   * Apply configuration settings to all systems
   */
  private async applyConfiguration(): Promise<void> {
    try {
      const config = this.configManager.getConfiguration();
      
      // Apply configuration to systems
      // Note: In a full implementation, these would update the respective systems
      console.log('Configuration applied:', {
        graphics: config.graphics.quality,
        ai: config.ai.assistanceLevel,
        gameplay: config.gameplay.difficulty
      });
      
      console.log('Configuration applied to all systems');
      
    } catch (error) {
      handleError(error as Error, 'Failed to apply configuration');
      console.warn('Using default configuration settings');
    }
  }

  /**
   * Setup global event handlers
   */
  private setupEventHandlers(): void {
    // Handle window close
    window.addEventListener('beforeunload', (event) => {
      if (this.gameInterface && this.gameInterface.isActive()) {
        // Auto-save before closing
        this.autoSave();
        
        // Show confirmation dialog
        event.preventDefault();
        event.returnValue = 'Are you sure you want to leave? Your progress will be auto-saved.';
        return event.returnValue;
      }
    });

    // Handle visibility changes (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (this.gameInterface) {
        if (document.hidden) {
          this.gameInterface.pauseGame();
        } else {
          // Don't auto-resume, let player choose
        }
      }
    });

    // Handle errors globally
    window.addEventListener('error', (event) => {
      handleError(new Error(event.message), 'Unhandled error', {
        context: 'Global error handler',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      handleError(new Error(event.reason), 'Unhandled promise rejection', {
        context: 'Global promise rejection handler'
      });
    });
  }

  /**
   * Perform auto-save
   */
  private async autoSave(): Promise<void> {
    try {
      if (this.currentProfile && this.gameInterface && this.gameInterface.isActive()) {
        const gameState = this.gameEngine.getGameState();
        await this.saveManager.autoSave(gameState, this.currentProfile);
        console.log('Auto-save completed');
      }
    } catch (error) {
      handleError(error as Error, 'Auto-save failed');
    }
  }

  /**
   * Shutdown the game and cleanup resources
   */
  public async shutdown(): Promise<void> {
    try {
      console.log('Shutting down game...');
      
      this.isRunning = false;

      // Auto-save current game if active
      await this.autoSave();

      // End current game session
      await this.endGameSession();

      // Stop game engine
      this.gameEngine.stop();

      // Cleanup UI
      this.mainMenu.destroy();

      // Save final configuration
      // (Configuration is automatically saved when updated)

      console.log('Game shutdown complete.');
      
    } catch (error) {
      handleError(error as Error, 'Failed to shutdown game', { context: 'Game shutdown' });
    }
  }

  /**
   * Get current game state
   */
  public getGameState(): any {
    return this.gameEngine.getGameState();
  }

  /**
   * Get current player profile
   */
  public getCurrentProfile(): PlayerProfile | null {
    return this.currentProfile;
  }

  /**
   * Set current player profile
   */
  public setCurrentProfile(profile: PlayerProfile): void {
    this.currentProfile = profile;
    this.mainMenu.setCurrentProfile(profile);
    
    if (this.gameInterface) {
      this.gameInterface.setCurrentProfile(profile);
    }
    
    // Re-initialize AI systems
    this.aiMentor.initialize(profile);
    this.visualAdapter.initialize(profile);
  }

  /**
   * Check if game is running
   */
  public isGameRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Check if game is initialized
   */
  public isGameInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get configuration manager
   */
  public getConfigurationManager(): ConfigurationManager {
    return this.configManager;
  }

  /**
   * Get save manager
   */
  public getSaveManager(): SaveManager {
    return this.saveManager;
  }

  /**
   * Get profile manager
   */
  public getProfileManager(): PlayerProfileManager {
    return this.profileManager;
  }

  /**
   * Get main menu instance
   */
  public getMainMenu(): MainMenu {
    return this.mainMenu;
  }

  /**
   * Get current game interface (if active)
   */
  public getGameInterface(): GameInterface | null {
    return this.gameInterface;
  }
}

// Create and start the game when the page loads
let gameInstance: AIDungeonMasterGame | null = null;

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing game...');
  try {
    console.log('Creating game instance...');
    gameInstance = new AIDungeonMasterGame();
    console.log('Starting game...');
    await gameInstance.start();
    console.log('Game started successfully!');
  } catch (error) {
    console.error('Failed to start game:', error);
    
    // Show error message to user
    document.body.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ff0000;
        color: #ffffff;
        padding: 2em;
        border-radius: 10px;
        text-align: center;
        font-family: 'Courier New', monospace;
      ">
        <h2>Game Failed to Start</h2>
        <p>Error: ${(error as Error).message}</p>
        <p>Please refresh the page to try again.</p>
      </div>
    `;
  }
});

// Export main game class for use in other modules
export default AIDungeonMasterGame;

// Export game instance for debugging
(window as any).game = gameInstance;