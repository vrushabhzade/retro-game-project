import { GameEngine } from '../engine/GameEngine';
import { SaveManager } from '../data/SaveManager';
import { PlayerProfileManager } from '../data/PlayerProfileManager';
import { PlayerProfile } from '../player/PlayerProfile';
import { ConfigurationManager } from '../data/ConfigurationManager';
import { handleError } from '../utils/ErrorHandling';

export interface MenuOption {
  id: string;
  label: string;
  action: () => Promise<void> | void;
  enabled: boolean;
}

export interface MainMenuConfig {
  title: string;
  version: string;
  showDebugOptions: boolean;
}

export interface MainMenuCallbacks {
  onNewGame: () => Promise<void>;
  onContinueGame: () => Promise<void>;
  onLoadGame: (saveId: string) => Promise<void>;
}

/**
 * Main menu system for the AI-Enhanced Dungeon Master game
 */
export class MainMenu {
  private gameEngine: GameEngine;
  private saveManager: SaveManager;
  private profileManager: PlayerProfileManager;
  private configManager: ConfigurationManager;
  private config: MainMenuConfig;
  private callbacks: MainMenuCallbacks;
  private currentProfile: PlayerProfile | null = null;
  private menuElement: HTMLElement | null = null;
  private isVisible: boolean = true;

  constructor(
    gameEngine: GameEngine,
    saveManager: SaveManager,
    profileManager: PlayerProfileManager,
    configManager: ConfigurationManager,
    callbacks: MainMenuCallbacks,
    config?: Partial<MainMenuConfig>
  ) {
    this.gameEngine = gameEngine;
    this.saveManager = saveManager;
    this.profileManager = profileManager;
    this.configManager = configManager;
    this.callbacks = callbacks;
    
    this.config = {
      title: 'AI-Enhanced Dungeon Master',
      version: '1.0.0',
      showDebugOptions: false,
      ...config
    };

    this.initializeMenu();
  }

  /**
   * Initialize the main menu UI
   */
  private initializeMenu(): void {
    this.createMenuElement();
    this.loadDefaultProfile();
  }

  /**
   * Create the main menu DOM element
   */
  private createMenuElement(): void {
    this.menuElement = document.createElement('div');
    this.menuElement.id = 'main-menu';
    this.menuElement.className = 'main-menu';
    
    // Add retro styling
    this.menuElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(45deg, #1a1a2e, #16213e);
      color: #00ff00;
      font-family: 'Courier New', monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      text-shadow: 0 0 10px #00ff00;
    `;

    document.body.appendChild(this.menuElement);
    this.renderMenu();
  }

  /**
   * Render the main menu content
   */
  private renderMenu(): void {
    if (!this.menuElement) return;

    const menuOptions = this.getMenuOptions();
    
    this.menuElement.innerHTML = `
      <div class="menu-header">
        <h1 style="font-size: 3em; margin-bottom: 0.2em; text-align: center;">
          ${this.config.title}
        </h1>
        <p style="font-size: 1.2em; margin-bottom: 2em; text-align: center; opacity: 0.8;">
          Version ${this.config.version}
        </p>
        ${this.currentProfile ? `
          <p style="font-size: 1em; margin-bottom: 1em; text-align: center; color: #ffff00;">
            Welcome back, ${this.currentProfile.playerId}
          </p>
        ` : ''}
      </div>
      
      <div class="menu-options" style="display: flex; flex-direction: column; gap: 1em;">
        ${menuOptions.map((option, index) => `
          <button 
            id="menu-option-${option.id}"
            class="menu-option ${option.enabled ? 'enabled' : 'disabled'}"
            style="
              background: ${option.enabled ? 'rgba(0, 255, 0, 0.1)' : 'rgba(128, 128, 128, 0.1)'};
              border: 2px solid ${option.enabled ? '#00ff00' : '#808080'};
              color: ${option.enabled ? '#00ff00' : '#808080'};
              padding: 1em 2em;
              font-family: 'Courier New', monospace;
              font-size: 1.2em;
              cursor: ${option.enabled ? 'pointer' : 'not-allowed'};
              transition: all 0.3s ease;
              min-width: 300px;
              text-align: center;
            "
            ${option.enabled ? '' : 'disabled'}
          >
            ${index + 1}. ${option.label}
          </button>
        `).join('')}
      </div>
      
      <div class="menu-footer" style="position: absolute; bottom: 2em; text-align: center; opacity: 0.6;">
        <p>Use mouse or keyboard (1-${menuOptions.length}) to navigate</p>
      </div>
    `;

    // Add event listeners
    this.attachEventListeners(menuOptions);
  }

  /**
   * Get available menu options based on current state
   */
  private getMenuOptions(): MenuOption[] {
    const options: MenuOption[] = [
      {
        id: 'new-game',
        label: 'New Game',
        action: () => this.startNewGame(),
        enabled: true
      },
      {
        id: 'continue',
        label: 'Continue Game',
        action: () => this.continueGame(),
        enabled: this.currentProfile !== null
      },
      {
        id: 'load-game',
        label: 'Load Game',
        action: () => this.showLoadGameMenu(),
        enabled: true
      },
      {
        id: 'settings',
        label: 'Settings',
        action: () => this.showSettingsMenu(),
        enabled: true
      },
      {
        id: 'profile',
        label: 'Player Profile',
        action: () => this.showProfileMenu(),
        enabled: true
      }
    ];

    // Add debug options if enabled
    if (this.config.showDebugOptions) {
      options.push(
        {
          id: 'debug-test',
          label: 'Debug: Test Systems',
          action: () => this.runSystemTests(),
          enabled: true
        },
        {
          id: 'debug-performance',
          label: 'Debug: Performance Monitor',
          action: () => this.showPerformanceMonitor(),
          enabled: true
        }
      );
    }

    return options;
  }

  /**
   * Attach event listeners to menu options
   */
  private attachEventListeners(options: MenuOption[]): void {
    options.forEach((option) => {
      const button = document.getElementById(`menu-option-${option.id}`);
      if (button && option.enabled) {
        // Mouse click
        button.addEventListener('click', () => {
          this.executeMenuAction(option);
        });

        // Hover effects
        button.addEventListener('mouseenter', () => {
          button.style.background = 'rgba(0, 255, 0, 0.2)';
          button.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.5)';
        });

        button.addEventListener('mouseleave', () => {
          button.style.background = 'rgba(0, 255, 0, 0.1)';
          button.style.boxShadow = 'none';
        });
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (event) => {
      if (!this.isVisible) return;

      const key = event.key;
      const numKey = parseInt(key);
      
      if (numKey >= 1 && numKey <= options.length) {
        const option = options[numKey - 1];
        if (option && option.enabled) {
          this.executeMenuAction(option);
        }
      }
    });
  }

  /**
   * Execute a menu action with error handling
   */
  private async executeMenuAction(option: MenuOption): Promise<void> {
    try {
      await option.action();
    } catch (error) {
      handleError(error as Error, `Menu action failed: ${option.label}`, { 
        context: 'MainMenu.executeMenuAction',
        optionId: option.id 
      });
      
      // Show error to user
      this.showErrorMessage(`Failed to ${option.label.toLowerCase()}: ${(error as Error).message}`);
    }
  }

  /**
   * Start a new game
   */
  private async startNewGame(): Promise<void> {
    // Create or load default profile
    if (!this.currentProfile) {
      this.currentProfile = await this.createDefaultProfile();
    }

    // Call the main application's new game handler
    await this.callbacks.onNewGame();
    console.log('New game started!');
  }

  /**
   * Continue the current game (load autosave)
   */
  private async continueGame(): Promise<void> {
    if (!this.currentProfile) {
      throw new Error('No current profile available');
    }

    // Call the main application's continue game handler
    await this.callbacks.onContinueGame();
    console.log('Game continued!');
  }

  /**
   * Show load game menu
   */
  private async showLoadGameMenu(): Promise<void> {
    try {
      const saves = await this.saveManager.listSaves();
      
      if (saves.length === 0) {
        this.showMessage('No saved games found.');
        return;
      }

      // Create load game submenu
      const loadMenuHtml = `
        <div class="submenu" style="text-align: center;">
          <h2 style="margin-bottom: 1em;">Load Game</h2>
          <div class="save-list" style="display: flex; flex-direction: column; gap: 0.5em; margin-bottom: 2em;">
            ${saves.map((save, index) => `
              <button 
                id="load-save-${save.saveId}"
                class="save-option"
                style="
                  background: rgba(0, 255, 0, 0.1);
                  border: 1px solid #00ff00;
                  color: #00ff00;
                  padding: 0.8em;
                  font-family: 'Courier New', monospace;
                  cursor: pointer;
                  text-align: left;
                "
              >
                ${index + 1}. ${save.saveId} - ${save.timestamp.toLocaleString()}
                <br><small>Profile: ${save.profileId}</small>
              </button>
            `).join('')}
          </div>
          <button id="back-to-main" class="menu-option" style="
            background: rgba(255, 0, 0, 0.1);
            border: 2px solid #ff0000;
            color: #ff0000;
            padding: 0.8em 2em;
            font-family: 'Courier New', monospace;
            cursor: pointer;
          ">
            Back to Main Menu
          </button>
        </div>
      `;

      if (this.menuElement) {
        this.menuElement.innerHTML = loadMenuHtml;

        // Add event listeners for save options
        saves.forEach((save) => {
          const button = document.getElementById(`load-save-${save.saveId}`);
          if (button) {
            button.addEventListener('click', () => this.loadSavedGame(save.saveId));
          }
        });

        // Back button
        const backButton = document.getElementById('back-to-main');
        if (backButton) {
          backButton.addEventListener('click', () => this.renderMenu());
        }
      }
    } catch (error) {
      handleError(error as Error, 'Failed to show load game menu');
      this.showErrorMessage('Failed to load save game list.');
    }
  }

  /**
   * Load a specific saved game
   */
  private async loadSavedGame(saveId: string): Promise<void> {
    try {
      // Call the main application's load game handler
      await this.callbacks.onLoadGame(saveId);
      console.log(`Loaded game: ${saveId}`);
    } catch (error) {
      handleError(error as Error, `Failed to load game: ${saveId}`);
      this.showErrorMessage(`Failed to load game: ${(error as Error).message}`);
    }
  }

  /**
   * Show settings menu
   */
  private showSettingsMenu(): void {
    const settingsHtml = `
      <div class="submenu" style="text-align: center;">
        <h2 style="margin-bottom: 1em;">Settings</h2>
        <div class="settings-options" style="display: flex; flex-direction: column; gap: 1em; margin-bottom: 2em;">
          <div class="setting-group">
            <label style="display: block; margin-bottom: 0.5em;">Graphics Quality:</label>
            <select id="graphics-quality" style="
              background: rgba(0, 255, 0, 0.1);
              border: 1px solid #00ff00;
              color: #00ff00;
              padding: 0.5em;
              font-family: 'Courier New', monospace;
            ">
              <option value="low">Low (Better Performance)</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High (Better Quality)</option>
            </select>
          </div>
          
          <div class="setting-group">
            <label style="display: block; margin-bottom: 0.5em;">AI Assistance Level:</label>
            <select id="ai-assistance" style="
              background: rgba(0, 255, 0, 0.1);
              border: 1px solid #00ff00;
              color: #00ff00;
              padding: 0.5em;
              font-family: 'Courier New', monospace;
            ">
              <option value="minimal">Minimal</option>
              <option value="normal" selected>Normal</option>
              <option value="maximum">Maximum</option>
            </select>
          </div>
          
          <div class="setting-group">
            <label style="display: flex; align-items: center; gap: 0.5em;">
              <input type="checkbox" id="debug-mode" style="transform: scale(1.5);">
              Enable Debug Mode
            </label>
          </div>
        </div>
        
        <div style="display: flex; gap: 1em; justify-content: center;">
          <button id="save-settings" class="menu-option" style="
            background: rgba(0, 255, 0, 0.1);
            border: 2px solid #00ff00;
            color: #00ff00;
            padding: 0.8em 2em;
            font-family: 'Courier New', monospace;
            cursor: pointer;
          ">
            Save Settings
          </button>
          <button id="back-to-main" class="menu-option" style="
            background: rgba(255, 0, 0, 0.1);
            border: 2px solid #ff0000;
            color: #ff0000;
            padding: 0.8em 2em;
            font-family: 'Courier New', monospace;
            cursor: pointer;
          ">
            Back
          </button>
        </div>
      </div>
    `;

    if (this.menuElement) {
      this.menuElement.innerHTML = settingsHtml;

      // Add event listeners
      const saveButton = document.getElementById('save-settings');
      const backButton = document.getElementById('back-to-main');
      const debugCheckbox = document.getElementById('debug-mode') as HTMLInputElement;

      if (saveButton) {
        saveButton.addEventListener('click', () => {
          this.saveSettings();
          this.renderMenu();
        });
      }

      if (backButton) {
        backButton.addEventListener('click', () => this.renderMenu());
      }

      if (debugCheckbox) {
        debugCheckbox.addEventListener('change', () => {
          this.config.showDebugOptions = debugCheckbox.checked;
        });
      }
    }
  }

  /**
   * Show player profile menu
   */
  private async showProfileMenu(): Promise<void> {
    const profiles = await this.profileManager.listProfiles();
    
    const profileHtml = `
      <div class="submenu" style="text-align: center;">
        <h2 style="margin-bottom: 1em;">Player Profile</h2>
        
        ${this.currentProfile ? `
          <div class="current-profile" style="margin-bottom: 2em; padding: 1em; border: 1px solid #00ff00;">
            <h3>Current Profile: ${this.currentProfile.playerId}</h3>
            <p>Skill Level: ${this.currentProfile.skillLevel}</p>
            <p>Total Play Time: ${Math.round(this.currentProfile.statistics.totalPlayTime / 60)} minutes</p>
            <p>Combats Won: ${this.currentProfile.statistics.combatsWon}</p>
            <p>Average Efficiency: ${Math.round(this.currentProfile.statistics.averageEfficiency * 100)}%</p>
          </div>
        ` : ''}
        
        <div class="profile-actions" style="display: flex; flex-direction: column; gap: 1em; margin-bottom: 2em;">
          <button id="create-profile" class="menu-option" style="
            background: rgba(0, 255, 0, 0.1);
            border: 2px solid #00ff00;
            color: #00ff00;
            padding: 0.8em 2em;
            font-family: 'Courier New', monospace;
            cursor: pointer;
          ">
            Create New Profile
          </button>
          
          ${profiles.length > 0 ? `
            <button id="switch-profile" class="menu-option" style="
              background: rgba(255, 255, 0, 0.1);
              border: 2px solid #ffff00;
              color: #ffff00;
              padding: 0.8em 2em;
              font-family: 'Courier New', monospace;
              cursor: pointer;
            ">
              Switch Profile (${profiles.length} available)
            </button>
          ` : ''}
        </div>
        
        <button id="back-to-main" class="menu-option" style="
          background: rgba(255, 0, 0, 0.1);
          border: 2px solid #ff0000;
          color: #ff0000;
          padding: 0.8em 2em;
          font-family: 'Courier New', monospace;
          cursor: pointer;
        ">
          Back
        </button>
      </div>
    `;

    if (this.menuElement) {
      this.menuElement.innerHTML = profileHtml;

      // Add event listeners
      const createButton = document.getElementById('create-profile');
      const switchButton = document.getElementById('switch-profile');
      const backButton = document.getElementById('back-to-main');

      if (createButton) {
        createButton.addEventListener('click', () => this.showCreateProfileDialog());
      }

      if (switchButton) {
        switchButton.addEventListener('click', () => this.showSwitchProfileDialog());
      }

      if (backButton) {
        backButton.addEventListener('click', () => this.renderMenu());
      }
    }
  }

  /**
   * Save current settings
   */
  private async saveSettings(): Promise<void> {
    try {
      // Save settings to ConfigurationManager
      await this.configManager.updateDebugConfig({
        showPerformanceMetrics: this.config.showDebugOptions
      });
      console.log('Settings saved');
      this.showMessage('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showMessage('Failed to save settings');
    }
  }

  /**
   * Create default profile
   */
  private async createDefaultProfile(): Promise<PlayerProfile> {
    const profile = new PlayerProfile('player-' + Date.now());
    await this.profileManager.saveProfile(profile);
    return profile;
  }

  /**
   * Show create profile dialog
   */
  private showCreateProfileDialog(): void {
    const profileId = prompt('Enter profile name:');
    if (profileId && profileId.trim()) {
      this.createProfile(profileId.trim());
    }
  }

  /**
   * Create a new profile
   */
  private async createProfile(profileId: string): Promise<void> {
    try {
      const profile = new PlayerProfile(profileId);
      await this.profileManager.saveProfile(profile);
      this.currentProfile = profile;
      this.showMessage(`Profile "${profileId}" created successfully!`);
      this.renderMenu();
    } catch (error) {
      handleError(error as Error, `Failed to create profile: ${profileId}`);
      this.showErrorMessage(`Failed to create profile: ${(error as Error).message}`);
    }
  }

  /**
   * Show switch profile dialog
   */
  private async showSwitchProfileDialog(): Promise<void> {
    try {
      const profiles = await this.profileManager.listProfiles();
      
      if (profiles.length === 0) {
        this.showMessage('No profiles available.');
        return;
      }

      // Simple profile selection (in a real implementation, this would be a proper UI)
      const profileList = profiles.map((id, index) => `${index + 1}. ${id}`).join('\n');
      const selection = prompt(`Select profile:\n${profileList}\n\nEnter number:`);
      
      if (selection) {
        const index = parseInt(selection) - 1;
        if (index >= 0 && index < profiles.length && profiles[index]) {
          await this.switchProfile(profiles[index]!);
        }
      }
    } catch (error) {
      handleError(error as Error, 'Failed to show switch profile dialog');
      this.showErrorMessage('Failed to load profiles.');
    }
  }

  /**
   * Switch to a different profile
   */
  private async switchProfile(profileId: string): Promise<void> {
    try {
      const profile = await this.profileManager.loadProfile(profileId);
      if (profile) {
        this.currentProfile = profile;
        this.showMessage(`Switched to profile: ${profileId}`);
        this.renderMenu();
      } else {
        throw new Error('Profile not found');
      }
    } catch (error) {
      handleError(error as Error, `Failed to switch to profile: ${profileId}`);
      this.showErrorMessage(`Failed to switch profile: ${(error as Error).message}`);
    }
  }

  /**
   * Load default profile on startup
   */
  private async loadDefaultProfile(): Promise<void> {
    try {
      const profiles = await this.profileManager.listProfiles();
      if (profiles.length > 0 && profiles[0]) {
        // Load the first available profile
        this.currentProfile = await this.profileManager.loadProfile(profiles[0]);
      }
    } catch (error) {
      // Ignore errors during default profile loading
      console.warn('Could not load default profile:', error);
    }
  }

  /**
   * Run system tests (debug feature)
   */
  private async runSystemTests(): Promise<void> {
    console.log('Running system tests...');
    
    try {
      // Test game engine
      const testEngine = new GameEngine();
      console.log('✓ Game Engine initialized:', testEngine.isGameRunning());

      // Test save/load
      const testProfile = new PlayerProfile('test-profile');
      await this.profileManager.saveProfile(testProfile);
      const loadedProfile = await this.profileManager.loadProfile('test-profile');
      console.log('✓ Save/Load system working:', loadedProfile?.playerId);

      // Clean up test data
      await this.profileManager.deleteProfile('test-profile');

      this.showMessage('All system tests passed!');
    } catch (error) {
      handleError(error as Error, 'System tests failed');
      this.showErrorMessage(`System tests failed: ${(error as Error).message}`);
    }
  }

  /**
   * Show performance monitor (debug feature)
   */
  private showPerformanceMonitor(): void {
    const metrics = this.gameEngine.getPerformanceMetrics();
    
    const metricsHtml = `
      <div class="submenu" style="text-align: left; max-width: 600px;">
        <h2 style="text-align: center; margin-bottom: 1em;">Performance Monitor</h2>
        <div class="metrics" style="font-family: 'Courier New', monospace; font-size: 0.9em;">
          <p><strong>Frame Rate:</strong> ${(1000 / metrics.averageFrameTime).toFixed(1)} FPS</p>
          <p><strong>Frame Time:</strong> ${metrics.averageFrameTime.toFixed(2)} ms</p>
          <p><strong>Memory Usage:</strong> ${(performance as any).memory ? 
            `${((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB` : 
            'Not available'}</p>
          <p><strong>System Load:</strong> ${metrics.systemLoad}</p>
          <p><strong>Performance Mode:</strong> ${metrics.systemLoad > 0.8 ? 'Enabled' : 'Disabled'}</p>
        </div>
        <button id="back-to-main" class="menu-option" style="
          background: rgba(255, 0, 0, 0.1);
          border: 2px solid #ff0000;
          color: #ff0000;
          padding: 0.8em 2em;
          font-family: 'Courier New', monospace;
          cursor: pointer;
          margin-top: 2em;
        ">
          Back
        </button>
      </div>
    `;

    if (this.menuElement) {
      this.menuElement.innerHTML = metricsHtml;

      const backButton = document.getElementById('back-to-main');
      if (backButton) {
        backButton.addEventListener('click', () => this.renderMenu());
      }
    }
  }

  /**
   * Show a temporary message to the user
   */
  private showMessage(message: string): void {
    // Simple alert for now - in a real implementation, this would be a styled overlay
    alert(message);
  }

  /**
   * Show an error message to the user
   */
  private showErrorMessage(message: string): void {
    // Simple alert for now - in a real implementation, this would be a styled error overlay
    alert(`Error: ${message}`);
  }

  /**
   * Hide the main menu
   */
  public hideMenu(): void {
    if (this.menuElement) {
      this.menuElement.style.display = 'none';
    }
    this.isVisible = false;
  }

  /**
   * Show the main menu
   */
  public showMenu(): void {
    if (this.menuElement) {
      this.menuElement.style.display = 'flex';
    }
    this.isVisible = true;
    this.renderMenu();
  }

  /**
   * Check if menu is currently visible
   */
  public isMenuVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Get current profile
   */
  public getCurrentProfile(): PlayerProfile | null {
    return this.currentProfile;
  }

  /**
   * Set current profile
   */
  public setCurrentProfile(profile: PlayerProfile): void {
    this.currentProfile = profile;
    if (this.isVisible) {
      this.renderMenu();
    }
  }

  /**
   * Cleanup menu resources
   */
  public destroy(): void {
    if (this.menuElement && this.menuElement.parentNode) {
      this.menuElement.parentNode.removeChild(this.menuElement);
    }
    this.menuElement = null;
  }
}