import { VisualAdaptationEngine } from '../../src/ai/VisualAdaptationEngine';
import { PlayerProfile } from '../../src/player/PlayerProfile';
import { ColorScheme } from '../../src/types/AITypes';

describe('VisualAdaptationEngine', () => {
  let engine: VisualAdaptationEngine;
  let playerProfile: PlayerProfile;

  beforeEach(() => {
    engine = new VisualAdaptationEngine();
    playerProfile = new PlayerProfile('test-player');
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(engine.getCurrentUIComplexity()).toBe('standard');
      expect(engine.getCurrentColorScheme()).toBe('classic');
    });

    it('should initialize with beginner profile settings', () => {
      playerProfile.skillLevel = 'beginner';
      playerProfile.preferences.uiComplexity = 'minimal';
      
      engine.initialize(playerProfile);
      
      expect(engine.getCurrentUIComplexity()).toBe('minimal');
    });

    it('should initialize with advanced profile settings', () => {
      playerProfile.skillLevel = 'advanced';
      playerProfile.preferences.uiComplexity = 'comprehensive';
      
      engine.initialize(playerProfile);
      
      expect(engine.getCurrentUIComplexity()).toBe('comprehensive');
    });
  });

  describe('performance assessment', () => {
    it('should assess beginner level for new players', () => {
      engine.initialize(playerProfile);
      
      const level = engine.assessPerformanceLevel();
      
      expect(level).toBe('beginner');
    });

    it('should assess intermediate level for moderate performance', () => {
      playerProfile.statistics.combatsWon = 7;
      playerProfile.statistics.combatsLost = 3;
      playerProfile.statistics.averageEfficiency = 0.65;
      
      engine.initialize(playerProfile);
      
      const level = engine.assessPerformanceLevel();
      
      expect(level).toBe('intermediate');
    });

    it('should assess advanced level for high performance', () => {
      playerProfile.statistics.combatsWon = 18;
      playerProfile.statistics.combatsLost = 2;
      playerProfile.statistics.averageEfficiency = 0.85;
      
      engine.initialize(playerProfile);
      
      const level = engine.assessPerformanceLevel();
      
      expect(level).toBe('advanced');
    });

    it('should require minimum combat count for higher levels', () => {
      playerProfile.statistics.combatsWon = 4;
      playerProfile.statistics.combatsLost = 1;
      playerProfile.statistics.averageEfficiency = 0.9;
      
      engine.initialize(playerProfile);
      
      const level = engine.assessPerformanceLevel();
      
      expect(level).toBe('beginner'); // Not enough combats for intermediate
    });
  });

  describe('UI complexity adaptation', () => {
    beforeEach(() => {
      engine.initialize(playerProfile);
    });

    it('should adapt to beginner complexity', () => {
      const complexity = engine.adaptUIComplexity('beginner');
      
      expect(complexity).toBe('minimal');
    });

    it('should adapt to intermediate complexity', () => {
      const complexity = engine.adaptUIComplexity('intermediate');
      
      expect(complexity).toBe('standard');
    });

    it('should adapt to advanced complexity gradually', () => {
      // Start from standard, should go to detailed first
      const complexity1 = engine.adaptUIComplexity('advanced');
      expect(complexity1).toBe('detailed');
      
      // Then should go to comprehensive
      const complexity2 = engine.adaptUIComplexity('advanced');
      expect(complexity2).toBe('comprehensive');
    });

    it('should adapt gradually when increasing complexity', () => {
      // Start at minimal
      engine.adaptUIComplexity('beginner');
      expect(engine.getCurrentUIComplexity()).toBe('minimal');
      
      // Should only go up one level to standard, not jump to comprehensive
      engine.adaptUIComplexity('advanced');
      expect(engine.getCurrentUIComplexity()).toBe('standard');
    });

    it('should update player preferences when adapting', () => {
      engine.adaptUIComplexity('intermediate');
      
      expect(playerProfile.preferences.uiComplexity).toBe('standard');
    });
  });

  describe('color scheme management', () => {
    beforeEach(() => {
      engine.initialize(playerProfile);
    });

    it('should update color scheme', () => {
      engine.updateColorScheme('high_contrast');
      
      expect(engine.getCurrentColorScheme()).toBe('high_contrast');
      expect(playerProfile.preferences.colorScheme).toBe('high_contrast');
    });

    it('should handle all supported color schemes', () => {
      const schemes: ColorScheme[] = ['classic', 'high_contrast', 'colorblind_friendly', 'custom'];
      
      schemes.forEach(scheme => {
        engine.updateColorScheme(scheme);
        expect(engine.getCurrentColorScheme()).toBe(scheme);
      });
    });
  });

  describe('configuration generation', () => {
    beforeEach(() => {
      engine.initialize(playerProfile);
    });

    it('should generate retro style configuration', () => {
      const style = engine.getRetroStyle();
      
      expect(style).toHaveProperty('colorPalette');
      expect(style).toHaveProperty('fontFamily');
      expect(style).toHaveProperty('fontSize');
      expect(style).toHaveProperty('borderStyle');
      expect(style).toHaveProperty('shadowStyle');
      expect(Array.isArray(style.colorPalette)).toBe(true);
    });

    it('should generate render configuration', () => {
      const config = engine.getRenderConfig();
      
      expect(config).toHaveProperty('tileSize');
      expect(config).toHaveProperty('animationSpeed');
      expect(config).toHaveProperty('frameRate');
      expect(config).toHaveProperty('enableAnimations');
      expect(config).toHaveProperty('pixelPerfect');
      expect(typeof config.tileSize).toBe('number');
      expect(config.frameRate).toBe(60);
    });

    it('should generate thought bubble configuration', () => {
      const config = engine.getThoughtBubbleConfig();
      
      expect(config).toHaveProperty('maxWidth');
      expect(config).toHaveProperty('maxHeight');
      expect(config).toHaveProperty('fadeInDuration');
      expect(config).toHaveProperty('fadeOutDuration');
      expect(config).toHaveProperty('displayDuration');
      expect(config).toHaveProperty('position');
    });

    it('should generate analysis panel configuration', () => {
      const config = engine.getAnalysisPanelConfig();
      
      expect(config).toHaveProperty('width');
      expect(config).toHaveProperty('height');
      expect(config).toHaveProperty('position');
      expect(config).toHaveProperty('autoHide');
      expect(config).toHaveProperty('transparency');
    });

    it('should adjust configurations based on UI complexity', () => {
      // Test minimal complexity
      engine.adaptUIComplexity('beginner');
      const minimalConfig = engine.getThoughtBubbleConfig();
      
      // Test comprehensive complexity
      engine.adaptUIComplexity('advanced');
      const comprehensiveConfig = engine.getThoughtBubbleConfig();
      
      expect(comprehensiveConfig.maxWidth).toBeGreaterThan(minimalConfig.maxWidth);
      expect(comprehensiveConfig.displayDuration).toBeGreaterThan(minimalConfig.displayDuration);
    });
  });

  describe('preference persistence', () => {
    it('should indicate preferences should be persisted when profile exists', () => {
      engine.initialize(playerProfile);
      
      expect(engine.shouldPersistPreferences()).toBe(true);
    });

    it('should indicate preferences should not be persisted without profile', () => {
      expect(engine.shouldPersistPreferences()).toBe(false);
    });
  });

  describe('adaptation control', () => {
    beforeEach(() => {
      engine.initialize(playerProfile);
    });

    it('should allow disabling adaptation', () => {
      engine.setAdaptationEnabled(false);
      const initialComplexity = engine.getCurrentUIComplexity();
      
      engine.adaptUIComplexity('advanced');
      
      expect(engine.getCurrentUIComplexity()).toBe(initialComplexity);
    });

    it('should allow updating performance thresholds', () => {
      const newThresholds = {
        beginner: { efficiency: 0.3, winRate: 0.3 },
        intermediate: { efficiency: 0.7, winRate: 0.7 },
        advanced: { efficiency: 0.9, winRate: 0.9 }
      };
      
      engine.updatePerformanceThresholds(newThresholds);
      
      // Set up a profile that would be intermediate with old thresholds but beginner with new ones
      playerProfile.statistics.combatsWon = 6;
      playerProfile.statistics.combatsLost = 4;
      playerProfile.statistics.averageEfficiency = 0.6;
      
      const level = engine.assessPerformanceLevel();
      expect(level).toBe('beginner'); // Should use new, stricter thresholds
    });
  });

  describe('error handling', () => {
    it('should handle missing player profile gracefully', () => {
      expect(() => {
        engine.assessPerformanceLevel();
      }).not.toThrow();
      
      expect(() => {
        engine.adaptUIComplexity();
      }).not.toThrow();
    });

    it('should return default configurations on errors', () => {
      // Test without initialization
      const style = engine.getRetroStyle();
      const renderConfig = engine.getRenderConfig();
      const thoughtBubbleConfig = engine.getThoughtBubbleConfig();
      const analysisPanelConfig = engine.getAnalysisPanelConfig();
      
      expect(style).toBeDefined();
      expect(renderConfig).toBeDefined();
      expect(thoughtBubbleConfig).toBeDefined();
      expect(analysisPanelConfig).toBeDefined();
    });
  });
});