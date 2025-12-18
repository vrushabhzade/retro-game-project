import * as fc from 'fast-check';
import { VisualAdaptationEngine } from '../../src/ai/VisualAdaptationEngine';
import { PlayerProfile } from '../../src/player/PlayerProfile';
import { PerformanceLevel } from '../../src/types/GameTypes';
import { UIComplexity } from '../../src/types/AITypes';

/**
 * **Feature: ai-dungeon-master, Property 8: Visual Adaptation Based on Performance**
 * **Validates: Requirements 3.2, 3.3**
 * 
 * For any detected improvement in player performance level, the visual adaptation engine 
 * should increase UI complexity and information density appropriately
 */
describe('Property 8: Visual Adaptation Based on Performance', () => {
  it('should increase UI complexity when player performance improves', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate player profile with varying performance statistics
        fc.record({
          playerId: fc.string({ minLength: 1, maxLength: 20 }),
          combatsWon: fc.integer({ min: 0, max: 50 }),
          combatsLost: fc.integer({ min: 0, max: 20 }),
          averageEfficiency: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
          totalPlayTime: fc.integer({ min: 0, max: 10000 })
        }),
        async (profileData) => {
          // Create player profile with generated statistics
          const profile = new PlayerProfile(profileData.playerId);
          profile.statistics.combatsWon = profileData.combatsWon;
          profile.statistics.combatsLost = profileData.combatsLost;
          profile.statistics.averageEfficiency = profileData.averageEfficiency;
          profile.statistics.totalPlayTime = profileData.totalPlayTime;

          // Initialize visual adaptation engine
          const engine = new VisualAdaptationEngine();
          engine.initialize(profile);

          // Get initial performance level and UI complexity
          const initialPerformanceLevel = engine.assessPerformanceLevel();
          const initialComplexity = engine.getCurrentUIComplexity();

          // Simulate performance improvement by increasing stats
          const improvedProfile = new PlayerProfile(profileData.playerId);
          improvedProfile.statistics.combatsWon = Math.max(profileData.combatsWon + 10, 20);
          improvedProfile.statistics.combatsLost = profileData.combatsLost;
          improvedProfile.statistics.averageEfficiency = Math.min(profileData.averageEfficiency + Math.fround(0.3), Math.fround(1.0));
          improvedProfile.statistics.totalPlayTime = profileData.totalPlayTime + 1000;

          // Initialize engine with improved profile
          const improvedEngine = new VisualAdaptationEngine();
          improvedEngine.initialize(improvedProfile);

          // Get improved performance level and UI complexity
          const improvedPerformanceLevel = improvedEngine.assessPerformanceLevel();
          const improvedComplexity = improvedEngine.getCurrentUIComplexity();

          // Define complexity ordering
          const complexityOrder: UIComplexity[] = ['minimal', 'standard', 'detailed', 'comprehensive'];
          const initialIndex = complexityOrder.indexOf(initialComplexity);
          const improvedIndex = complexityOrder.indexOf(improvedComplexity);

          // Property: If performance level improved, UI complexity should not decrease
          if (getPerformanceLevel(improvedPerformanceLevel) > getPerformanceLevel(initialPerformanceLevel)) {
            expect(improvedIndex).toBeGreaterThanOrEqual(initialIndex);
          }

          // Property: Advanced players should have at least standard complexity
          if (improvedPerformanceLevel === 'advanced') {
            expect(['standard', 'detailed', 'comprehensive']).toContain(improvedComplexity);
          }

          // Property: Beginner players should start with minimal or standard complexity
          if (improvedPerformanceLevel === 'beginner') {
            expect(['minimal', 'standard']).toContain(improvedComplexity);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should adapt UI configurations based on complexity level', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('beginner', 'intermediate', 'advanced') as fc.Arbitrary<PerformanceLevel>,
        async (performanceLevel) => {
          // Create a profile with appropriate statistics for the performance level
          const profile = new PlayerProfile('test-player');
          
          // Set statistics based on performance level
          switch (performanceLevel) {
            case 'beginner':
              profile.statistics.combatsWon = 2;
              profile.statistics.combatsLost = 3;
              profile.statistics.averageEfficiency = Math.fround(0.3);
              break;
            case 'intermediate':
              profile.statistics.combatsWon = 12;
              profile.statistics.combatsLost = 8;
              profile.statistics.averageEfficiency = Math.fround(0.65);
              break;
            case 'advanced':
              profile.statistics.combatsWon = 25;
              profile.statistics.combatsLost = 5;
              profile.statistics.averageEfficiency = Math.fround(0.85);
              break;
          }

          const engine = new VisualAdaptationEngine();
          engine.initialize(profile);

          // Adapt UI complexity based on performance level
          const complexity = engine.adaptUIComplexity(performanceLevel);
          
          // Get various UI configurations
          const retroStyle = engine.getRetroStyle();
          const renderConfig = engine.getRenderConfig();
          const thoughtBubbleConfig = engine.getThoughtBubbleConfig();
          const analysisPanelConfig = engine.getAnalysisPanelConfig();

          // Property: All configurations should be valid objects
          expect(retroStyle).toBeDefined();
          expect(renderConfig).toBeDefined();
          expect(thoughtBubbleConfig).toBeDefined();
          expect(analysisPanelConfig).toBeDefined();

          // Property: Higher complexity should result in larger UI elements
          if (complexity === 'comprehensive') {
            expect(thoughtBubbleConfig.maxWidth).toBeGreaterThan(200);
            expect(analysisPanelConfig.width).toBeGreaterThan(300);
          }

          // Property: Minimal complexity should have smaller UI elements
          if (complexity === 'minimal') {
            expect(thoughtBubbleConfig.maxWidth).toBeLessThanOrEqual(300);
            expect(analysisPanelConfig.autoHide).toBe(true);
          }

          // Property: Render config should have consistent frame rate
          expect(renderConfig.frameRate).toBe(60);
          expect(renderConfig.tileSize).toBeGreaterThan(0);
          expect(renderConfig.animationSpeed).toBeGreaterThan(0);

          // Property: Retro style should have valid properties
          expect(Array.isArray(retroStyle.colorPalette)).toBe(true);
          expect(retroStyle.colorPalette.length).toBeGreaterThan(0);
          expect(retroStyle.fontSize).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Helper function to convert performance level to numeric value for comparison
function getPerformanceLevel(level: PerformanceLevel): number {
  switch (level) {
    case 'beginner': return 1;
    case 'intermediate': return 2;
    case 'advanced': return 3;
    default: return 1;
  }
}