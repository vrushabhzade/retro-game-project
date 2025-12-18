import { GameState } from '../types/GameTypes';
import { PlayerProfile } from '../player/PlayerProfile';
import { PlayerProfileManager } from './PlayerProfileManager';
import { ErrorHandler } from '../utils/ErrorHandling';

export interface SaveData {
  gameState: GameState;
  profileId: string;
  saveId: string;
  timestamp: Date;
  version: string;
}

export interface SaveStorage {
  save(saveId: string, data: SaveData): Promise<void>;
  load(saveId: string): Promise<SaveData | null>;
  exists(saveId: string): Promise<boolean>;
  delete(saveId: string): Promise<void>;
  list(): Promise<string[]>;
}

// Local storage implementation for browser environments
class LocalStorageSaveStorage implements SaveStorage {
  private readonly keyPrefix = 'ai-dungeon-master-save-';

  async save(saveId: string, data: SaveData): Promise<void> {
    try {
      const key = this.keyPrefix + saveId;
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
    } catch (error) {
      throw new Error(`Failed to save game data for save ${saveId}: ${error}`);
    }
  }

  async load(saveId: string): Promise<SaveData | null> {
    try {
      const key = this.keyPrefix + saveId;
      const serialized = localStorage.getItem(key);
      if (!serialized) {
        return null;
      }
      return JSON.parse(serialized) as SaveData;
    } catch (error) {
      throw new Error(`Failed to load game data for save ${saveId}: ${error}`);
    }
  }

  async exists(saveId: string): Promise<boolean> {
    const key = this.keyPrefix + saveId;
    return localStorage.getItem(key) !== null;
  }

  async delete(saveId: string): Promise<void> {
    const key = this.keyPrefix + saveId;
    localStorage.removeItem(key);
  }

  async list(): Promise<string[]> {
    const saves: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.keyPrefix)) {
        saves.push(key.substring(this.keyPrefix.length));
      }
    }
    return saves;
  }
}

// Save manager for game state and profile serialization
export class SaveManager {
  private storage: SaveStorage;
  private profileManager: PlayerProfileManager;
  private readonly currentVersion = '1.0.0';

  constructor(profileManager: PlayerProfileManager, storage?: SaveStorage) {
    this.profileManager = profileManager;
    this.storage = storage || new LocalStorageSaveStorage();
  }

  /**
   * Saves the current game state and player profile
   */
  public async saveGame(
    saveId: string, 
    gameState: GameState, 
    profile: PlayerProfile
  ): Promise<void> {
    try {
      // First save the player profile
      await this.profileManager.saveProfile(profile);

      // Create save data
      const saveData: SaveData = {
        gameState: this.serializeGameState(gameState),
        profileId: profile.playerId,
        saveId,
        timestamp: new Date(),
        version: this.currentVersion
      };

      // Save the game data
      await this.storage.save(saveId, saveData);
      
    } catch (error) {
      ErrorHandler.handleError(error, `Failed to save game with ID ${saveId}`);
      throw error;
    }
  }

  /**
   * Loads a saved game state and associated player profile
   */
  public async loadGame(saveId: string): Promise<{
    gameState: GameState;
    profile: PlayerProfile;
  } | null> {
    try {
      const saveData = await this.storage.load(saveId);
      if (!saveData) {
        return null;
      }

      // Validate save data
      this.validateSaveData(saveData);

      // Load the associated player profile
      const profile = await this.profileManager.loadProfile(saveData.profileId);
      if (!profile) {
        throw new Error(`Associated player profile not found: ${saveData.profileId}`);
      }

      // Deserialize game state
      const gameState = this.deserializeGameState(saveData.gameState);

      return { gameState, profile };
      
    } catch (error) {
      ErrorHandler.handleError(error, `Failed to load game with ID ${saveId}`);
      
      // If save is corrupted, return null to allow graceful handling
      if (error instanceof Error && error.message.includes('corrupted')) {
        return null;
      }
      
      throw error;
    }
  }

  /**
   * Creates an auto-save of the current game
   */
  public async autoSave(gameState: GameState, profile: PlayerProfile): Promise<void> {
    const autoSaveId = `autosave-${profile.playerId}`;
    await this.saveGame(autoSaveId, gameState, profile);
  }

  /**
   * Loads the most recent auto-save for a player
   */
  public async loadAutoSave(playerId: string): Promise<{
    gameState: GameState;
    profile: PlayerProfile;
  } | null> {
    const autoSaveId = `autosave-${playerId}`;
    return await this.loadGame(autoSaveId);
  }

  /**
   * Deletes a saved game
   */
  public async deleteSave(saveId: string): Promise<void> {
    try {
      await this.storage.delete(saveId);
    } catch (error) {
      ErrorHandler.handleError(error, `Failed to delete save with ID ${saveId}`);
      throw error;
    }
  }

  /**
   * Lists all available saves
   */
  public async listSaves(): Promise<Array<{
    saveId: string;
    timestamp: Date;
    profileId: string;
  }>> {
    try {
      const saveIds = await this.storage.list();
      const saves = [];

      for (const saveId of saveIds) {
        try {
          const saveData = await this.storage.load(saveId);
          if (saveData && this.isValidSaveData(saveData)) {
            saves.push({
              saveId: saveData.saveId,
              timestamp: new Date(saveData.timestamp),
              profileId: saveData.profileId
            });
          }
        } catch (error) {
          // Skip corrupted saves
          ErrorHandler.handleError(error, `Skipping corrupted save: ${saveId}`);
        }
      }

      // Sort by timestamp, most recent first
      return saves.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
    } catch (error) {
      ErrorHandler.handleError(error, 'Failed to list saves');
      throw error;
    }
  }

  /**
   * Checks if save data has the required structure for listing
   */
  private isValidSaveData(data: any): data is SaveData {
    return data && 
           typeof data.saveId === 'string' && 
           data.timestamp && 
           typeof data.profileId === 'string' &&
           data.gameState &&
           typeof data.version === 'string';
  }

  /**
   * Checks if a save exists
   */
  public async saveExists(saveId: string): Promise<boolean> {
    try {
      return await this.storage.exists(saveId);
    } catch (error) {
      ErrorHandler.handleError(error, `Failed to check if save exists: ${saveId}`);
      return false;
    }
  }

  /**
   * Serializes game state for storage
   */
  private serializeGameState(gameState: GameState): GameState {
    // Deep clone to avoid modifying original state
    return JSON.parse(JSON.stringify(gameState));
  }

  /**
   * Deserializes game state from storage
   */
  private deserializeGameState(serializedState: GameState): GameState {
    // Validate and reconstruct game state
    this.validateGameState(serializedState);
    return serializedState;
  }

  /**
   * Validates save data structure to detect corruption
   */
  private validateSaveData(data: any): void {
    const requiredFields = ['gameState', 'profileId', 'saveId', 'timestamp', 'version'];

    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Save data corrupted: missing field ${field}`);
      }
    }

    // Validate timestamp
    try {
      new Date(data.timestamp);
    } catch {
      throw new Error('Save data corrupted: invalid timestamp');
    }

    // Check version compatibility
    if (data.version !== this.currentVersion) {
      // In a real implementation, this would handle version migration
      console.warn(`Save version mismatch: ${data.version} vs ${this.currentVersion}`);
    }
  }

  /**
   * Validates game state structure
   */
  private validateGameState(gameState: any): void {
    const requiredFields = [
      'dungeon', 'player', 'enemies', 'items', 
      'currentRoom', 'gameTime', 'difficulty'
    ];

    for (const field of requiredFields) {
      if (!(field in gameState)) {
        throw new Error(`Game state corrupted: missing field ${field}`);
      }
    }

    // Validate nested objects
    if (!gameState.dungeon || typeof gameState.dungeon !== 'object') {
      throw new Error('Game state corrupted: invalid dungeon data');
    }

    if (!gameState.player || typeof gameState.player !== 'object') {
      throw new Error('Game state corrupted: invalid player data');
    }

    if (!Array.isArray(gameState.enemies)) {
      throw new Error('Game state corrupted: invalid enemies data');
    }

    if (!Array.isArray(gameState.items)) {
      throw new Error('Game state corrupted: invalid items data');
    }
  }

  /**
   * Creates a backup of all saves and profiles
   */
  public async createBackup(): Promise<string> {
    try {
      const saves = await this.listSaves();
      const profiles = await this.profileManager.listProfiles();
      
      const backup = {
        saves: [] as SaveData[],
        profiles: [] as any[],
        timestamp: new Date(),
        version: this.currentVersion
      };

      // Collect all save data
      for (const save of saves) {
        const saveData = await this.storage.load(save.saveId);
        if (saveData) {
          backup.saves.push(saveData);
        }
      }

      // Collect all profile data
      for (const profileId of profiles) {
        const profile = await this.profileManager.loadProfile(profileId);
        if (profile) {
          backup.profiles.push(profile.toJSON());
        }
      }

      return JSON.stringify(backup);
      
    } catch (error) {
      ErrorHandler.handleError(error, 'Failed to create backup');
      throw error;
    }
  }

  /**
   * Restores from a backup
   */
  public async restoreFromBackup(backupData: string): Promise<void> {
    try {
      const backup = JSON.parse(backupData);
      
      // Validate backup structure
      if (!backup.saves || !backup.profiles || !backup.timestamp) {
        throw new Error('Invalid backup data structure');
      }

      // Restore profiles first
      for (const profileData of backup.profiles) {
        const profile = PlayerProfile.fromJSON(profileData);
        await this.profileManager.saveProfile(profile);
      }

      // Restore saves
      for (const saveData of backup.saves) {
        await this.storage.save(saveData.saveId, saveData);
      }
      
    } catch (error) {
      ErrorHandler.handleError(error, 'Failed to restore from backup');
      throw error;
    }
  }
}