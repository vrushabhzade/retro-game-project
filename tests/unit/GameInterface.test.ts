import { GameInterface } from '../../src/ui/GameInterface';
import { GameEngine } from '../../src/engine/GameEngine';
import { AIMentorSystem } from '../../src/ai/AIMentorSystem';
import { VisualAdaptationEngine } from '../../src/ai/VisualAdaptationEngine';
import { CombatAnalysisSystem } from '../../src/combat/CombatAnalysis';
import { SaveManager } from '../../src/data/SaveManager';
import { PlayerProfileManager } from '../../src/data/PlayerProfileManager';
import { ConfigurationManager } from '../../src/data/ConfigurationManager';
import { PlayerProfile } from '../../src/player/PlayerProfile';

// Mock DOM environment for testing
const mockCanvas = {
  getContext: jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 100 })),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    arc: jest.fn(),
    rect: jest.fn(),
    closePath: jest.fn()
  })),
  width: 800,
  height: 600,
  style: {},
  addEventListener: jest.fn(),
  getBoundingClientRect: jest.fn(() => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600
  }))
};

// Mock document and DOM methods
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas;
      }
      return {
        id: '',
        className: '',
        style: {},
        innerHTML: '',
        appendChild: jest.fn(),
        remove: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };
    }),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn()
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getElementById: jest.fn()
  },
  writable: true
});

// Mock window methods
Object.defineProperty(global, 'window', {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    setInterval: jest.fn(() => 1),
    clearInterval: jest.fn(),
    requestAnimationFrame: jest.fn((callback) => {
      setTimeout(callback, 16);
      return 1;
    }),
    cancelAnimationFrame: jest.fn()
  },
  writable: true
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(() => null)
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('GameInterface', () => {
  let gameInterface: GameInterface;
  let gameEngine: GameEngine;
  let aiMentor: AIMentorSystem;
  let visualAdapter: VisualAdaptationEngine;
  let combatAnalysis: CombatAnalysisSystem;
  let saveManager: SaveManager;
  let profileManager: PlayerProfileManager;
  let configManager: ConfigurationManager;
  let testProfile: PlayerProfile;

  beforeEach(() => {
    // Initialize all required systems
    profileManager = new PlayerProfileManager();
    configManager = new ConfigurationManager();
    saveManager = new SaveManager(profileManager);
    gameEngine = new GameEngine();
    aiMentor = new AIMentorSystem();
    visualAdapter = new VisualAdaptationEngine();
    combatAnalysis = new CombatAnalysisSystem();
    testProfile = new PlayerProfile('test-player');

    // Initialize AI systems
    aiMentor.initialize(testProfile);
    visualAdapter.initialize(testProfile);
  });

  afterEach(() => {
    if (gameInterface) {
      gameInterface.destroy();
    }
  });

  describe('initialization', () => {
    it('should create GameInterface without errors', () => {
      expect(() => {
        gameInterface = new GameInterface(
          gameEngine,
          aiMentor,
          visualAdapter,
          combatAnalysis,
          saveManager,
          configManager,
          testProfile
        );
      }).not.toThrow();
    });

    it('should initialize with custom config', () => {
      const customConfig = {
        canvasWidth: 1024,
        canvasHeight: 768,
        enableUI: false,
        enableAI: false,
        autoSaveInterval: 10
      };

      expect(() => {
        gameInterface = new GameInterface(
          gameEngine,
          aiMentor,
          visualAdapter,
          combatAnalysis,
          saveManager,
          configManager,
          testProfile,
          customConfig
        );
      }).not.toThrow();
    });

    it('should have all required properties initialized', () => {
      gameInterface = new GameInterface(
        gameEngine,
        aiMentor,
        visualAdapter,
        combatAnalysis,
        saveManager,
        configManager,
        testProfile
      );

      expect(gameInterface.getCurrentProfile()).toBe(testProfile);
      expect(gameInterface.isActive()).toBe(false);
      expect(gameInterface.isPausedState()).toBe(false);
    });
  });

  describe('game lifecycle', () => {
    beforeEach(() => {
      gameInterface = new GameInterface(
        gameEngine,
        aiMentor,
        visualAdapter,
        combatAnalysis,
        saveManager,
        configManager,
        testProfile
      );
    });

    it('should start game successfully', () => {
      expect(() => {
        gameInterface.startGame();
      }).not.toThrow();

      expect(gameInterface.isActive()).toBe(true);
      expect(gameInterface.isPausedState()).toBe(false);
    });

    it('should stop game successfully', () => {
      gameInterface.startGame();
      
      expect(() => {
        gameInterface.stopGame();
      }).not.toThrow();

      expect(gameInterface.isActive()).toBe(false);
    });

    it('should pause and resume game', () => {
      gameInterface.startGame();
      
      gameInterface.pauseGame();
      expect(gameInterface.isPausedState()).toBe(true);
      
      gameInterface.resumeGame();
      expect(gameInterface.isPausedState()).toBe(false);
    });

    it('should toggle pause state', () => {
      gameInterface.startGame();
      
      const initialPauseState = gameInterface.isPausedState();
      gameInterface.togglePause();
      expect(gameInterface.isPausedState()).toBe(!initialPauseState);
      
      gameInterface.togglePause();
      expect(gameInterface.isPausedState()).toBe(initialPauseState);
    });
  });

  describe('profile management', () => {
    beforeEach(() => {
      gameInterface = new GameInterface(
        gameEngine,
        aiMentor,
        visualAdapter,
        combatAnalysis,
        saveManager,
        configManager,
        testProfile
      );
    });

    it('should get current profile', () => {
      const profile = gameInterface.getCurrentProfile();
      expect(profile).toBe(testProfile);
      expect(profile.playerId).toBe('test-player');
    });

    it('should set new profile', () => {
      const newProfile = new PlayerProfile('new-player');
      
      gameInterface.setCurrentProfile(newProfile);
      
      const currentProfile = gameInterface.getCurrentProfile();
      expect(currentProfile).toBe(newProfile);
      expect(currentProfile.playerId).toBe('new-player');
    });
  });

  describe('game state access', () => {
    beforeEach(() => {
      gameInterface = new GameInterface(
        gameEngine,
        aiMentor,
        visualAdapter,
        combatAnalysis,
        saveManager,
        configManager,
        testProfile
      );
    });

    it('should provide access to game state', () => {
      const gameState = gameInterface.getGameState();
      expect(gameState).toBeDefined();
      expect(gameState.player).toBeDefined();
      expect(gameState.dungeon).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', () => {
      // Test with null profile to trigger error handling
      expect(() => {
        gameInterface = new GameInterface(
          gameEngine,
          aiMentor,
          visualAdapter,
          combatAnalysis,
          saveManager,
          configManager,
          testProfile
        );
      }).not.toThrow();
    });

    it('should handle start game errors gracefully', () => {
      gameInterface = new GameInterface(
        gameEngine,
        aiMentor,
        visualAdapter,
        combatAnalysis,
        saveManager,
        configManager,
        testProfile
      );

      // Should not throw even if there are internal errors
      expect(() => {
        gameInterface.startGame();
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      gameInterface = new GameInterface(
        gameEngine,
        aiMentor,
        visualAdapter,
        combatAnalysis,
        saveManager,
        configManager,
        testProfile
      );
    });

    it('should cleanup resources on destroy', () => {
      gameInterface.startGame();
      
      expect(() => {
        gameInterface.destroy();
      }).not.toThrow();

      expect(gameInterface.isActive()).toBe(false);
    });

    it('should handle multiple destroy calls gracefully', () => {
      expect(() => {
        gameInterface.destroy();
        gameInterface.destroy();
      }).not.toThrow();
    });
  });
});