import { PlayerProfileManager, ProfileStorage } from '../../src/data/PlayerProfileManager';
import { PlayerProfile } from '../../src/player/PlayerProfile';
import { PlayerProfile as IPlayerProfile } from '../../src/types/AITypes';
import { setSuppressErrorLogging } from '../../src/utils/ErrorHandling';

// Mock storage implementation for testing
class MockProfileStorage implements ProfileStorage {
  private storage: Map<string, IPlayerProfile> = new Map();

  async save(playerId: string, profile: IPlayerProfile): Promise<void> {
    this.storage.set(playerId, JSON.parse(JSON.stringify(profile)));
  }

  async load(playerId: string): Promise<IPlayerProfile | null> {
    const profile = this.storage.get(playerId);
    return profile ? JSON.parse(JSON.stringify(profile)) : null;
  }

  async exists(playerId: string): Promise<boolean> {
    return this.storage.has(playerId);
  }

  async delete(playerId: string): Promise<void> {
    this.storage.delete(playerId);
  }

  async list(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  // Test helper methods
  clear(): void {
    this.storage.clear();
  }

  corruptProfile(playerId: string): void {
    this.storage.set(playerId, { invalid: 'data' } as any);
  }
}

describe('PlayerProfileManager', () => {
  let manager: PlayerProfileManager;
  let mockStorage: MockProfileStorage;

  beforeAll(() => {
    // Suppress error logging for expected error tests
    setSuppressErrorLogging(true);
  });

  afterAll(() => {
    // Re-enable error logging after tests
    setSuppressErrorLogging(false);
  });

  beforeEach(() => {
    mockStorage = new MockProfileStorage();
    manager = new PlayerProfileManager(mockStorage);
  });

  afterEach(() => {
    mockStorage.clear();
  });

  describe('profile creation', () => {
    it('should create a new profile successfully', async () => {
      const profile = await manager.createProfile('test-player');
      
      expect(profile).toBeInstanceOf(PlayerProfile);
      expect(profile.playerId).toBe('test-player');
      expect(await mockStorage.exists('test-player')).toBe(true);
    });

    it('should throw error when creating duplicate profile', async () => {
      await manager.createProfile('test-player');
      
      await expect(manager.createProfile('test-player'))
        .rejects.toThrow('Profile already exists');
    });
  });

  describe('profile loading', () => {
    it('should load existing profile successfully', async () => {
      const originalProfile = await manager.createProfile('test-player');
      manager.clearCache(); // Clear cache to test actual loading
      
      const loadedProfile = await manager.loadProfile('test-player');
      
      expect(loadedProfile).not.toBeNull();
      expect(loadedProfile!.playerId).toBe('test-player');
      expect(loadedProfile!.skillLevel).toBe(originalProfile.skillLevel);
    });

    it('should return null for non-existent profile', async () => {
      const profile = await manager.loadProfile('non-existent');
      expect(profile).toBeNull();
    });

    it('should handle corrupted profile data gracefully', async () => {
      await manager.createProfile('test-player');
      mockStorage.corruptProfile('test-player');
      manager.clearCache(); // Clear cache to force loading from storage
      
      const profile = await manager.loadProfile('test-player');
      expect(profile).toBeNull();
    });

    it('should use cache for subsequent loads', async () => {
      await manager.createProfile('test-player');
      
      const profile1 = await manager.loadProfile('test-player');
      const profile2 = await manager.loadProfile('test-player');
      
      expect(profile1).toBe(profile2); // Same instance from cache
    });
  });

  describe('profile saving', () => {
    it('should save profile changes successfully', async () => {
      const profile = await manager.createProfile('test-player');
      profile.recordCombatResult(true, 0.8);
      
      await manager.saveProfile(profile);
      manager.clearCache();
      
      const loadedProfile = await manager.loadProfile('test-player');
      expect(loadedProfile!.statistics.combatsWon).toBe(1);
    });
  });

  describe('get or create profile', () => {
    it('should return existing profile if it exists', async () => {
      const originalProfile = await manager.createProfile('test-player');
      
      const profile = await manager.getOrCreateProfile('test-player');
      expect(profile.playerId).toBe(originalProfile.playerId);
    });

    it('should create new profile if it does not exist', async () => {
      const profile = await manager.getOrCreateProfile('new-player');
      
      expect(profile.playerId).toBe('new-player');
      expect(await manager.profileExists('new-player')).toBe(true);
    });
  });

  describe('profile deletion', () => {
    it('should delete profile successfully', async () => {
      await manager.createProfile('test-player');
      
      await manager.deleteProfile('test-player');
      
      expect(await manager.profileExists('test-player')).toBe(false);
      expect(manager.getCacheSize()).toBe(0);
    });
  });

  describe('profile listing', () => {
    it('should list all profiles', async () => {
      await manager.createProfile('player1');
      await manager.createProfile('player2');
      await manager.createProfile('player3');
      
      const profiles = await manager.listProfiles();
      
      expect(profiles).toHaveLength(3);
      expect(profiles).toContain('player1');
      expect(profiles).toContain('player2');
      expect(profiles).toContain('player3');
    });

    it('should return empty list when no profiles exist', async () => {
      const profiles = await manager.listProfiles();
      expect(profiles).toHaveLength(0);
    });
  });

  describe('cache management', () => {
    it('should clear cache correctly', async () => {
      await manager.createProfile('test-player');
      expect(manager.getCacheSize()).toBe(1);
      
      manager.clearCache();
      expect(manager.getCacheSize()).toBe(0);
    });

    it('should track cache size correctly', async () => {
      expect(manager.getCacheSize()).toBe(0);
      
      await manager.createProfile('player1');
      expect(manager.getCacheSize()).toBe(1);
      
      await manager.createProfile('player2');
      expect(manager.getCacheSize()).toBe(2);
    });
  });
});