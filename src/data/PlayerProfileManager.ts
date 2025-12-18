import { PlayerProfile } from '../player/PlayerProfile';
import { PlayerProfile as IPlayerProfile } from '../types/AITypes';
import { ErrorHandler } from '../utils/ErrorHandling';

export interface ProfileStorage {
  save(playerId: string, profile: IPlayerProfile): Promise<void>;
  load(playerId: string): Promise<IPlayerProfile | null>;
  exists(playerId: string): Promise<boolean>;
  delete(playerId: string): Promise<void>;
  list(): Promise<string[]>;
}

// Local storage implementation for browser environments
class LocalStorageProfileStorage implements ProfileStorage {
  private readonly keyPrefix = 'ai-dungeon-master-profile-';

  async save(playerId: string, profile: IPlayerProfile): Promise<void> {
    try {
      const key = this.keyPrefix + playerId;
      const serialized = JSON.stringify(profile);
      localStorage.setItem(key, serialized);
    } catch (error) {
      throw new Error(`Failed to save profile for player ${playerId}: ${error}`);
    }
  }

  async load(playerId: string): Promise<IPlayerProfile | null> {
    try {
      const key = this.keyPrefix + playerId;
      const serialized = localStorage.getItem(key);
      if (!serialized) {
        return null;
      }
      return JSON.parse(serialized) as IPlayerProfile;
    } catch (error) {
      throw new Error(`Failed to load profile for player ${playerId}: ${error}`);
    }
  }

  async exists(playerId: string): Promise<boolean> {
    const key = this.keyPrefix + playerId;
    return localStorage.getItem(key) !== null;
  }

  async delete(playerId: string): Promise<void> {
    const key = this.keyPrefix + playerId;
    localStorage.removeItem(key);
  }

  async list(): Promise<string[]> {
    const profiles: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.keyPrefix)) {
        profiles.push(key.substring(this.keyPrefix.length));
      }
    }
    return profiles;
  }
}

// Player profile manager for data persistence
export class PlayerProfileManager {
  private storage: ProfileStorage;
  private profileCache: Map<string, PlayerProfile> = new Map();

  constructor(storage?: ProfileStorage) {
    this.storage = storage || new LocalStorageProfileStorage();
  }

  /**
   * Creates a new player profile
   */
  public async createProfile(playerId: string): Promise<PlayerProfile> {
    try {
      if (await this.storage.exists(playerId)) {
        throw new Error(`Profile already exists for player: ${playerId}`);
      }

      const profile = new PlayerProfile(playerId);
      await this.saveProfile(profile);
      this.profileCache.set(playerId, profile);
      
      return profile;
    } catch (error) {
      ErrorHandler.handleError(error, `Failed to create profile for player ${playerId}`);
      throw error;
    }
  }

  /**
   * Loads a player profile from storage
   */
  public async loadProfile(playerId: string): Promise<PlayerProfile | null> {
    try {
      // Check cache first
      if (this.profileCache.has(playerId)) {
        return this.profileCache.get(playerId)!;
      }

      const profileData = await this.storage.load(playerId);
      if (!profileData) {
        return null;
      }

      // Validate profile data structure
      this.validateProfileData(profileData);

      const profile = PlayerProfile.fromJSON(profileData);
      this.profileCache.set(playerId, profile);
      
      return profile;
    } catch (error) {
      ErrorHandler.handleError(error, `Failed to load profile for player ${playerId}`);
      
      // If profile is corrupted, return null to allow creating a new one
      if (error instanceof Error && error.message.includes('corrupted')) {
        return null;
      }
      
      throw error;
    }
  }

  /**
   * Saves a player profile to storage
   */
  public async saveProfile(profile: PlayerProfile): Promise<void> {
    try {
      const profileData = profile.toJSON();
      await this.storage.save(profile.playerId, profileData);
      this.profileCache.set(profile.playerId, profile);
    } catch (error) {
      ErrorHandler.handleError(error, `Failed to save profile for player ${profile.playerId}`);
      throw error;
    }
  }

  /**
   * Gets or creates a player profile
   */
  public async getOrCreateProfile(playerId: string): Promise<PlayerProfile> {
    try {
      let profile = await this.loadProfile(playerId);
      
      if (!profile) {
        profile = await this.createProfile(playerId);
      }
      
      return profile;
    } catch (error) {
      ErrorHandler.handleError(error, `Failed to get or create profile for player ${playerId}`);
      throw error;
    }
  }

  /**
   * Deletes a player profile
   */
  public async deleteProfile(playerId: string): Promise<void> {
    try {
      await this.storage.delete(playerId);
      this.profileCache.delete(playerId);
    } catch (error) {
      ErrorHandler.handleError(error, `Failed to delete profile for player ${playerId}`);
      throw error;
    }
  }

  /**
   * Lists all available player profiles
   */
  public async listProfiles(): Promise<string[]> {
    try {
      return await this.storage.list();
    } catch (error) {
      ErrorHandler.handleError(error, 'Failed to list player profiles');
      throw error;
    }
  }

  /**
   * Checks if a profile exists
   */
  public async profileExists(playerId: string): Promise<boolean> {
    try {
      return await this.storage.exists(playerId);
    } catch (error) {
      ErrorHandler.handleError(error, `Failed to check if profile exists for player ${playerId}`);
      return false;
    }
  }

  /**
   * Validates profile data structure to detect corruption
   */
  private validateProfileData(data: any): void {
    const requiredFields = [
      'playerId', 'skillLevel', 'behaviorPatterns', 
      'preferences', 'statistics', 'createdAt', 'lastPlayed'
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Profile data corrupted: missing field ${field}`);
      }
    }

    // Validate nested objects
    if (!data.behaviorPatterns || typeof data.behaviorPatterns !== 'object') {
      throw new Error('Profile data corrupted: invalid behaviorPatterns');
    }

    if (!data.preferences || typeof data.preferences !== 'object') {
      throw new Error('Profile data corrupted: invalid preferences');
    }

    if (!data.statistics || typeof data.statistics !== 'object') {
      throw new Error('Profile data corrupted: invalid statistics');
    }

    // Validate dates
    try {
      new Date(data.createdAt);
      new Date(data.lastPlayed);
    } catch {
      throw new Error('Profile data corrupted: invalid date fields');
    }
  }

  /**
   * Clears the profile cache
   */
  public clearCache(): void {
    this.profileCache.clear();
  }

  /**
   * Gets cached profile count for debugging
   */
  public getCacheSize(): number {
    return this.profileCache.size;
  }
}