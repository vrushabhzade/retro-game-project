import * as fc from 'fast-check';
import { PlayerProfile } from '../../src/player/PlayerProfile';
import { PlayerProfileManager, ProfileStorage } from '../../src/data/PlayerProfileManager';
import { PlayerProfile as IPlayerProfile } from '../../src/types/AITypes';

/**
 * Feature: ai-dungeon-master, Property 12: Player Profile Persistence Round Trip
 * Validates: Requirements 5.2, 5.4
 */

// Mock storage for testing
class TestProfileStorage implements ProfileStorage {
  private storage: Map<string, string> = new Map();

  async save(playerId: string, profile: IPlayerProfile): Promise<void> {
    // Simulate real JSON serialization like localStorage would do
    this.storage.set(playerId, JSON.stringify(profile));
  }

  async load(playerId: string): Promise<IPlayerProfile | null> {
    const serialized = this.storage.get(playerId);
    return serialized ? JSON.parse(serialized) : null;
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

  clear(): void {
    this.storage.clear();
  }
}

// Generators for property-based testing
const playerIdArb = fc.string({ minLength: 1, maxLength: 50 }).filter(id => id.trim().length > 0);

const skillLevelArb = fc.constantFrom('beginner' as const, 'intermediate' as const, 'advanced' as const);

const combatStyleArb = fc.constantFrom('aggressive' as const, 'defensive' as const, 'balanced' as const, 'tactical' as const);

const resourceStyleArb = fc.constantFrom('conservative' as const, 'moderate' as const, 'liberal' as const);

const explorationStyleArb = fc.constantFrom('thorough' as const, 'efficient' as const, 'cautious' as const, 'bold' as const);

const uiComplexityArb = fc.constantFrom('minimal' as const, 'standard' as const, 'detailed' as const, 'comprehensive' as const);

const colorSchemeArb = fc.constantFrom('classic' as const, 'high_contrast' as const, 'colorblind_friendly' as const, 'custom' as const);

const hintFrequencyArb = fc.constantFrom('never' as const, 'rare' as const, 'moderate' as const, 'frequent' as const, 'constant' as const);

const behaviorPatternsArb = fc.record({
  combatStyle: combatStyleArb,
  riskTolerance: fc.float({ min: 0, max: 1 }).filter(n => !isNaN(n) && isFinite(n)),
  resourceManagement: resourceStyleArb,
  explorationPattern: explorationStyleArb
});

const preferencesArb = fc.record({
  uiComplexity: uiComplexityArb,
  colorScheme: colorSchemeArb,
  hintFrequency: hintFrequencyArb
});

const statisticsArb = fc.record({
  totalPlayTime: fc.nat({ max: 1000000 }),
  combatsWon: fc.nat({ max: 1000 }),
  combatsLost: fc.nat({ max: 1000 }),
  averageEfficiency: fc.float({ min: 0, max: 1 }).filter(n => !isNaN(n) && isFinite(n)),
  dungeonsCleaned: fc.nat({ max: 100 }),
  itemsFound: fc.nat({ max: 1000 }),
  secretsDiscovered: fc.nat({ max: 100 }),
  lastUpdated: fc.date()
});

const playerProfileArb = fc.record({
  playerId: playerIdArb,
  skillLevel: skillLevelArb,
  behaviorPatterns: behaviorPatternsArb,
  preferences: preferencesArb,
  statistics: statisticsArb,
  createdAt: fc.date(),
  lastPlayed: fc.date()
});

describe('Property 12: Player Profile Persistence Round Trip', () => {
  let storage: TestProfileStorage;
  let manager: PlayerProfileManager;

  beforeEach(() => {
    storage = new TestProfileStorage();
    manager = new PlayerProfileManager(storage);
  });

  afterEach(() => {
    storage.clear();
  });

  it('should preserve profile data through save/load cycle', async () => {
    await fc.assert(
      fc.asyncProperty(playerProfileArb, async (profileData) => {
        // Create profile from test data
        const originalProfile = PlayerProfile.fromJSON(profileData);
        
        // Save the profile
        await manager.saveProfile(originalProfile);
        
        // Clear cache to force loading from storage
        manager.clearCache();
        
        // Load the profile
        const loadedProfile = await manager.loadProfile(profileData.playerId);
        
        // Verify the profile was loaded
        expect(loadedProfile).not.toBeNull();
        
        if (loadedProfile) {
          // Verify all fields are preserved
          expect(loadedProfile.playerId).toBe(originalProfile.playerId);
          expect(loadedProfile.skillLevel).toBe(originalProfile.skillLevel);
          
          // Verify behavior patterns
          expect(loadedProfile.behaviorPatterns.combatStyle).toBe(originalProfile.behaviorPatterns.combatStyle);
          expect(loadedProfile.behaviorPatterns.riskTolerance).toBeCloseTo(originalProfile.behaviorPatterns.riskTolerance, 5);
          expect(loadedProfile.behaviorPatterns.resourceManagement).toBe(originalProfile.behaviorPatterns.resourceManagement);
          expect(loadedProfile.behaviorPatterns.explorationPattern).toBe(originalProfile.behaviorPatterns.explorationPattern);
          
          // Verify preferences
          expect(loadedProfile.preferences.uiComplexity).toBe(originalProfile.preferences.uiComplexity);
          expect(loadedProfile.preferences.colorScheme).toBe(originalProfile.preferences.colorScheme);
          expect(loadedProfile.preferences.hintFrequency).toBe(originalProfile.preferences.hintFrequency);
          
          // Verify statistics
          expect(loadedProfile.statistics.totalPlayTime).toBe(originalProfile.statistics.totalPlayTime);
          expect(loadedProfile.statistics.combatsWon).toBe(originalProfile.statistics.combatsWon);
          expect(loadedProfile.statistics.combatsLost).toBe(originalProfile.statistics.combatsLost);
          expect(loadedProfile.statistics.averageEfficiency).toBeCloseTo(originalProfile.statistics.averageEfficiency, 5);
          expect(loadedProfile.statistics.dungeonsCleaned).toBe(originalProfile.statistics.dungeonsCleaned);
          expect(loadedProfile.statistics.itemsFound).toBe(originalProfile.statistics.itemsFound);
          expect(loadedProfile.statistics.secretsDiscovered).toBe(originalProfile.statistics.secretsDiscovered);
          
          // Verify dates (convert to timestamps for comparison)
          expect(loadedProfile.createdAt.getTime()).toBe(originalProfile.createdAt.getTime());
          expect(loadedProfile.lastPlayed.getTime()).toBe(originalProfile.lastPlayed.getTime());
          expect(loadedProfile.statistics.lastUpdated.getTime()).toBe(originalProfile.statistics.lastUpdated.getTime());
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain profile functionality after round trip', async () => {
    await fc.assert(
      fc.asyncProperty(playerIdArb, async (playerId) => {
        // Create a new profile
        const originalProfile = new PlayerProfile(playerId);
        
        // Modify the profile with some actions
        originalProfile.recordCombatResult(true, 0.8);
        originalProfile.recordExplorationEvent('item_found');
        originalProfile.updatePlayTime(1000);
        
        // Save and reload
        await manager.saveProfile(originalProfile);
        manager.clearCache();
        const loadedProfile = await manager.loadProfile(playerId);
        
        expect(loadedProfile).not.toBeNull();
        
        if (loadedProfile) {
          // Verify the modifications were preserved
          expect(loadedProfile.statistics.combatsWon).toBe(1);
          expect(loadedProfile.statistics.itemsFound).toBe(1);
          expect(loadedProfile.statistics.totalPlayTime).toBe(1000);
          expect(loadedProfile.statistics.averageEfficiency).toBe(0.8);
          
          // Verify the profile still functions correctly
          loadedProfile.recordCombatResult(false, 0.6);
          expect(loadedProfile.statistics.combatsLost).toBe(1);
          expect(loadedProfile.statistics.averageEfficiency).toBeCloseTo(0.7, 1);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle profile updates correctly after persistence', async () => {
    await fc.assert(
      fc.asyncProperty(
        playerIdArb,
        fc.float({ min: 0, max: 1 }).filter(n => !isNaN(n) && isFinite(n)),
        fc.nat({ max: 10 }),
        async (playerId, efficiency, combatCount) => {
          // Create and modify profile
          const profile = new PlayerProfile(playerId);
          
          // Record multiple combats
          for (let i = 0; i < combatCount; i++) {
            profile.recordCombatResult(true, efficiency);
          }
          
          // Save and reload
          await manager.saveProfile(profile);
          manager.clearCache();
          const loadedProfile = await manager.loadProfile(playerId);
          
          expect(loadedProfile).not.toBeNull();
          
          if (loadedProfile && combatCount > 0) {
            expect(loadedProfile.statistics.combatsWon).toBe(combatCount);
            expect(loadedProfile.statistics.averageEfficiency).toBeCloseTo(efficiency, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});