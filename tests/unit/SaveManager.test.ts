import { SaveManager, SaveStorage, SaveData } from '../../src/data/SaveManager';
import { PlayerProfileManager } from '../../src/data/PlayerProfileManager';
import { PlayerProfile } from '../../src/player/PlayerProfile';
import { GameState } from '../../src/types/GameTypes';
import { setSuppressErrorLogging } from '../../src/utils/ErrorHandling';

// Mock storage implementation for testing
class MockSaveStorage implements SaveStorage {
  private storage: Map<string, SaveData> = new Map();

  async save(saveId: string, data: SaveData): Promise<void> {
    this.storage.set(saveId, JSON.parse(JSON.stringify(data)));
  }

  async load(saveId: string): Promise<SaveData | null> {
    const data = this.storage.get(saveId);
    return data ? JSON.parse(JSON.stringify(data)) : null;
  }

  async exists(saveId: string): Promise<boolean> {
    return this.storage.has(saveId);
  }

  async delete(saveId: string): Promise<void> {
    this.storage.delete(saveId);
  }

  async list(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  // Test helper methods
  clear(): void {
    this.storage.clear();
  }

  corruptSave(saveId: string): void {
    this.storage.set(saveId, { invalid: 'data' } as any);
  }
}

// Mock profile manager
class MockProfileManager extends PlayerProfileManager {
  private profiles: Map<string, PlayerProfile> = new Map();

  override async saveProfile(profile: PlayerProfile): Promise<void> {
    this.profiles.set(profile.playerId, profile);
  }

  override async loadProfile(playerId: string): Promise<PlayerProfile | null> {
    return this.profiles.get(playerId) || null;
  }

  override async listProfiles(): Promise<string[]> {
    return Array.from(this.profiles.keys());
  }

  // Test helper
  addProfile(profile: PlayerProfile): void {
    this.profiles.set(profile.playerId, profile);
  }

  clear(): void {
    this.profiles.clear();
  }
}

describe('SaveManager', () => {
  let saveManager: SaveManager;
  let mockStorage: MockSaveStorage;
  let mockProfileManager: MockProfileManager;
  let testGameState: GameState;
  let testProfile: PlayerProfile;

  beforeAll(() => {
    // Suppress error logging for expected error tests
    setSuppressErrorLogging(true);
  });

  afterAll(() => {
    // Re-enable error logging after tests
    setSuppressErrorLogging(false);
  });

  beforeEach(() => {
    mockStorage = new MockSaveStorage();
    mockProfileManager = new MockProfileManager();
    saveManager = new SaveManager(mockProfileManager, mockStorage);

    // Create test data
    testProfile = new PlayerProfile('test-player');
    testGameState = {
      dungeon: {
        rooms: [],
        corridors: [],
        width: 10,
        height: 10
      },
      player: {
        id: 'player1',
        position: { x: 0, y: 0 },
        health: 100,
        maxHealth: 100,
        level: 1,
        experience: 0,
        inventory: [],
        equipment: {},
        stats: {
          strength: 10,
          defense: 10,
          agility: 10,
          intelligence: 10
        }
      },
      enemies: [],
      items: [],
      currentRoom: 'room1',
      gameTime: 0,
      difficulty: 'medium',
      isInCombat: false,
      turnNumber: 0
    };
  });

  afterEach(() => {
    mockStorage.clear();
    mockProfileManager.clear();
  });

  describe('saving games', () => {
    it('should save game successfully', async () => {
      await saveManager.saveGame('test-save', testGameState, testProfile);
      
      expect(await mockStorage.exists('test-save')).toBe(true);
      
      const saveData = await mockStorage.load('test-save');
      expect(saveData).not.toBeNull();
      expect(saveData!.profileId).toBe('test-player');
      expect(saveData!.saveId).toBe('test-save');
    });

    it('should save profile when saving game', async () => {
      await saveManager.saveGame('test-save', testGameState, testProfile);
      
      const savedProfile = await mockProfileManager.loadProfile('test-player');
      expect(savedProfile).not.toBeNull();
      expect(savedProfile!.playerId).toBe('test-player');
    });
  });

  describe('loading games', () => {
    beforeEach(async () => {
      mockProfileManager.addProfile(testProfile);
      await saveManager.saveGame('test-save', testGameState, testProfile);
    });

    it('should load game successfully', async () => {
      const result = await saveManager.loadGame('test-save');
      
      expect(result).not.toBeNull();
      expect(result!.gameState.player.id).toBe('player1');
      expect(result!.profile.playerId).toBe('test-player');
    });

    it('should return null for non-existent save', async () => {
      const result = await saveManager.loadGame('non-existent');
      expect(result).toBeNull();
    });

    it('should handle corrupted save data gracefully', async () => {
      mockStorage.corruptSave('test-save');
      
      const result = await saveManager.loadGame('test-save');
      expect(result).toBeNull();
    });

    it('should throw error if associated profile not found', async () => {
      mockProfileManager.clear();
      
      await expect(saveManager.loadGame('test-save'))
        .rejects.toThrow('Associated player profile not found');
    });
  });

  describe('auto-save functionality', () => {
    it('should create auto-save correctly', async () => {
      await saveManager.autoSave(testGameState, testProfile);
      
      const autoSaveId = `autosave-${testProfile.playerId}`;
      expect(await mockStorage.exists(autoSaveId)).toBe(true);
    });

    it('should load auto-save correctly', async () => {
      mockProfileManager.addProfile(testProfile);
      await saveManager.autoSave(testGameState, testProfile);
      
      const result = await saveManager.loadAutoSave(testProfile.playerId);
      
      expect(result).not.toBeNull();
      expect(result!.profile.playerId).toBe(testProfile.playerId);
    });

    it('should return null if no auto-save exists', async () => {
      const result = await saveManager.loadAutoSave('non-existent-player');
      expect(result).toBeNull();
    });
  });

  describe('save management', () => {
    beforeEach(async () => {
      mockProfileManager.addProfile(testProfile);
      await saveManager.saveGame('save1', testGameState, testProfile);
      await saveManager.saveGame('save2', testGameState, testProfile);
    });

    it('should delete save successfully', async () => {
      await saveManager.deleteSave('save1');
      
      expect(await mockStorage.exists('save1')).toBe(false);
      expect(await mockStorage.exists('save2')).toBe(true);
    });

    it('should list saves correctly', async () => {
      const saves = await saveManager.listSaves();
      
      expect(saves).toHaveLength(2);
      expect(saves.map(s => s.saveId)).toContain('save1');
      expect(saves.map(s => s.saveId)).toContain('save2');
    });

    it('should sort saves by timestamp', async () => {
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      await saveManager.saveGame('save3', testGameState, testProfile);
      
      const saves = await saveManager.listSaves();
      
      expect(saves.length).toBeGreaterThan(0);
      expect(saves[0]?.saveId).toBe('save3'); // Most recent first
    });

    it('should check save existence correctly', async () => {
      expect(await saveManager.saveExists('save1')).toBe(true);
      expect(await saveManager.saveExists('non-existent')).toBe(false);
    });
  });

  describe('backup and restore', () => {
    beforeEach(async () => {
      mockProfileManager.addProfile(testProfile);
      await saveManager.saveGame('save1', testGameState, testProfile);
    });

    it('should create backup successfully', async () => {
      const backup = await saveManager.createBackup();
      
      expect(backup).toBeTruthy();
      const backupData = JSON.parse(backup);
      expect(backupData.saves).toHaveLength(1);
      expect(backupData.profiles).toHaveLength(1);
    });

    it('should restore from backup successfully', async () => {
      const backup = await saveManager.createBackup();
      
      // Clear everything
      mockStorage.clear();
      mockProfileManager.clear();
      
      // Restore
      await saveManager.restoreFromBackup(backup);
      
      // Verify restoration
      expect(await mockStorage.exists('save1')).toBe(true);
      const profile = await mockProfileManager.loadProfile('test-player');
      expect(profile).not.toBeNull();
    });

    it('should handle invalid backup data', async () => {
      const invalidBackup = JSON.stringify({ invalid: 'data' });
      
      await expect(saveManager.restoreFromBackup(invalidBackup))
        .rejects.toThrow('Invalid backup data structure');
    });
  });
});