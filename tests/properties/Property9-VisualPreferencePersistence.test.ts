import * as fc from 'fast-check';
import { VisualAdaptationEngine } from '../../src/ai/VisualAdaptationEngine';
import { PlayerProfile } from '../../src/player/PlayerProfile';
import { ColorScheme, UIComplexity } from '../../src/types/AITypes';

/**
 * **Feature: ai-dungeon-master, Property 9: Visual Preference Persistence**
 * **Validates: Requirements 3.5**
 * 
 * For any learned visual preferences, saving and then loading the game 
 * should restore the same visual configuration
 */
describe('Property 9: Visual Preference Persistence', () => {
  it('should persist visual preferences across engine initialization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: fc.string({ minLength: 1, maxLength: 20 }),
          uiComplexity: fc.constantFrom('minimal', 'standard', 'detailed', 'comprehensive') as fc.Arbitrary<UIComplexity>,
          colorScheme: fc.constantFrom('classic', 'high_contrast', 'colorblind_friendly', 'custom') as fc.Arbitrary<ColorScheme>
        }),
        async (preferences) => {
          // Create original profile with specific preferences
          const originalProfile = new PlayerProfile(preferences.playerId);
          originalProfile.preferences.uiComplexity = preferences.uiComplexity;
          originalProfile.preferences.colorScheme = preferences.colorScheme;

          // Initialize first engine with original profile
          const originalEngine = new VisualAdaptationEngine();
          originalEngine.initialize(originalProfile);

          // Update color scheme to test persistence
          originalEngine.updateColorScheme(preferences.colorScheme);

          // Get original configurations
          const originalComplexity = originalEngine.getCurrentUIComplexity();
          const originalColorScheme = originalEngine.getCurrentColorScheme();
          const originalRetroStyle = originalEngine.getRetroStyle();
          const originalRenderConfig = originalEngine.getRenderConfig();
          const originalThoughtBubbleConfig = originalEngine.getThoughtBubbleConfig();
          const originalAnalysisPanelConfig = originalEngine.getAnalysisPanelConfig();

          // Simulate save/load by creating a new profile from the original profile's data
          const savedProfileData = originalProfile.toJSON();
          const restoredProfile = PlayerProfile.fromJSON(savedProfileData);

          // Initialize new engine with restored profile
          const restoredEngine = new VisualAdaptationEngine();
          restoredEngine.initialize(restoredProfile);

          // Get restored configurations
          const restoredComplexity = restoredEngine.getCurrentUIComplexity();
          const restoredColorScheme = restoredEngine.getCurrentColorScheme();
          const restoredRetroStyle = restoredEngine.getRetroStyle();
          const restoredRenderConfig = restoredEngine.getRenderConfig();
          const restoredThoughtBubbleConfig = restoredEngine.getThoughtBubbleConfig();
          const restoredAnalysisPanelConfig = restoredEngine.getAnalysisPanelConfig();

          // Property: UI complexity should be preserved
          expect(restoredComplexity).toBe(originalComplexity);

          // Property: Color scheme should be preserved
          expect(restoredColorScheme).toBe(originalColorScheme);

          // Property: Retro style configurations should be equivalent
          expect(restoredRetroStyle.fontSize).toBe(originalRetroStyle.fontSize);
          expect(restoredRetroStyle.fontFamily).toBe(originalRetroStyle.fontFamily);
          expect(restoredRetroStyle.borderStyle).toBe(originalRetroStyle.borderStyle);
          expect(restoredRetroStyle.shadowStyle).toBe(originalRetroStyle.shadowStyle);
          expect(restoredRetroStyle.colorPalette).toEqual(originalRetroStyle.colorPalette);

          // Property: Render configurations should be equivalent
          expect(restoredRenderConfig.tileSize).toBe(originalRenderConfig.tileSize);
          expect(restoredRenderConfig.animationSpeed).toBe(originalRenderConfig.animationSpeed);
          expect(restoredRenderConfig.frameRate).toBe(originalRenderConfig.frameRate);
          expect(restoredRenderConfig.enableAnimations).toBe(originalRenderConfig.enableAnimations);
          expect(restoredRenderConfig.pixelPerfect).toBe(originalRenderConfig.pixelPerfect);

          // Property: Thought bubble configurations should be equivalent
          expect(restoredThoughtBubbleConfig.maxWidth).toBe(originalThoughtBubbleConfig.maxWidth);
          expect(restoredThoughtBubbleConfig.maxHeight).toBe(originalThoughtBubbleConfig.maxHeight);
          expect(restoredThoughtBubbleConfig.displayDuration).toBe(originalThoughtBubbleConfig.displayDuration);
          expect(restoredThoughtBubbleConfig.position).toBe(originalThoughtBubbleConfig.position);

          // Property: Analysis panel configurations should be equivalent
          expect(restoredAnalysisPanelConfig.width).toBe(originalAnalysisPanelConfig.width);
          expect(restoredAnalysisPanelConfig.height).toBe(originalAnalysisPanelConfig.height);
          expect(restoredAnalysisPanelConfig.position).toBe(originalAnalysisPanelConfig.position);
          expect(restoredAnalysisPanelConfig.autoHide).toBe(originalAnalysisPanelConfig.autoHide);
          expect(restoredAnalysisPanelConfig.transparency).toBe(originalAnalysisPanelConfig.transparency);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain preference persistence indicator correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (playerId) => {
          // Test without profile - should not persist
          const engineWithoutProfile = new VisualAdaptationEngine();
          expect(engineWithoutProfile.shouldPersistPreferences()).toBe(false);

          // Test with profile - should persist
          const profile = new PlayerProfile(playerId);
          const engineWithProfile = new VisualAdaptationEngine();
          engineWithProfile.initialize(profile);
          expect(engineWithProfile.shouldPersistPreferences()).toBe(true);

          // Property: Persistence indicator should be consistent with profile presence
          const hasProfile = engineWithProfile.shouldPersistPreferences();
          expect(hasProfile).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle color scheme changes and persist them', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: fc.string({ minLength: 1, maxLength: 20 }),
          initialScheme: fc.constantFrom('classic', 'high_contrast', 'colorblind_friendly', 'custom') as fc.Arbitrary<ColorScheme>,
          newScheme: fc.constantFrom('classic', 'high_contrast', 'colorblind_friendly', 'custom') as fc.Arbitrary<ColorScheme>
        }),
        async (testData) => {
          // Create profile with initial color scheme
          const profile = new PlayerProfile(testData.playerId);
          profile.preferences.colorScheme = testData.initialScheme;

          // Initialize engine
          const engine = new VisualAdaptationEngine();
          engine.initialize(profile);

          // Verify initial scheme
          expect(engine.getCurrentColorScheme()).toBe(testData.initialScheme);

          // Update to new scheme
          engine.updateColorScheme(testData.newScheme);

          // Property: Color scheme should be updated immediately
          expect(engine.getCurrentColorScheme()).toBe(testData.newScheme);

          // Property: Profile should be updated with new scheme
          expect(profile.preferences.colorScheme).toBe(testData.newScheme);

          // Simulate persistence by creating new engine with same profile
          const newEngine = new VisualAdaptationEngine();
          newEngine.initialize(profile);

          // Property: New engine should have the updated color scheme
          expect(newEngine.getCurrentColorScheme()).toBe(testData.newScheme);

          // Property: Color palettes should be different for different schemes (unless same scheme)
          const originalPalette = engine.getRetroStyle().colorPalette;
          const newPalette = newEngine.getRetroStyle().colorPalette;
          expect(originalPalette).toEqual(newPalette);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve UI complexity adaptations across sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: fc.string({ minLength: 1, maxLength: 20 }),
          combatsWon: fc.integer({ min: 15, max: 30 }),
          combatsLost: fc.integer({ min: 2, max: 10 }),
          averageEfficiency: fc.float({ min: Math.fround(0.7), max: Math.fround(0.9) })
        }),
        async (profileData) => {
          // Create profile with intermediate/advanced performance
          const profile = new PlayerProfile(profileData.playerId);
          profile.statistics.combatsWon = profileData.combatsWon;
          profile.statistics.combatsLost = profileData.combatsLost;
          profile.statistics.averageEfficiency = profileData.averageEfficiency;

          // Initialize engine and adapt complexity
          const originalEngine = new VisualAdaptationEngine();
          originalEngine.initialize(profile);
          
          // Trigger adaptation based on performance
          const adaptedComplexity = originalEngine.adaptUIComplexity();

          // Simulate save/load cycle
          const savedData = profile.toJSON();
          const restoredProfile = PlayerProfile.fromJSON(savedData);

          // Initialize new engine with restored profile
          const restoredEngine = new VisualAdaptationEngine();
          restoredEngine.initialize(restoredProfile);

          // Property: UI complexity should be preserved after save/load
          expect(restoredEngine.getCurrentUIComplexity()).toBe(adaptedComplexity);

          // Property: Adapted complexity should be reflected in profile preferences
          expect(restoredProfile.preferences.uiComplexity).toBe(adaptedComplexity);

          // Property: UI configurations should be consistent with preserved complexity
          const originalConfig = originalEngine.getThoughtBubbleConfig();
          const restoredConfig = restoredEngine.getThoughtBubbleConfig();
          
          expect(restoredConfig.maxWidth).toBe(originalConfig.maxWidth);
          expect(restoredConfig.maxHeight).toBe(originalConfig.maxHeight);
          expect(restoredConfig.displayDuration).toBe(originalConfig.displayDuration);
        }
      ),
      { numRuns: 100 }
    );
  });
});