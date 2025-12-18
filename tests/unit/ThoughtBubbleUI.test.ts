import { ThoughtBubbleManager } from '../../src/ui/ThoughtBubbleManager';
import { AIMentorSystem } from '../../src/ai/AIMentorSystem';
import { AIHint } from '../../src/types/AITypes';
import { GameState } from '../../src/types/GameTypes';
import { PlayerProfile } from '../../src/player/PlayerProfile';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Mock DOM elements for testing
const mockContainer = {
  appendChild: jest.fn(),
  style: { position: 'relative' },
  getBoundingClientRect: () => ({ width: 800, height: 600 })
} as any;

const mockElement = {
  style: {},
  classList: { add: jest.fn() },
  appendChild: jest.fn(),
  innerHTML: '',
  parentNode: { removeChild: jest.fn() },
  offsetHeight: 100
} as any;

// Mock document and window
global.document = {
  createElement: jest.fn().mockReturnValue(mockElement),
  head: { appendChild: jest.fn() },
  getElementById: jest.fn().mockReturnValue(null)
} as any;

global.window = {
  setTimeout: jest.fn().mockImplementation((fn) => {
    return setTimeout(fn, 0); // Execute immediately for tests
  }),
  clearTimeout: jest.fn(),
  setInterval: jest.fn(),
  clearInterval: jest.fn()
} as any;

// Mock getComputedStyle
global.getComputedStyle = jest.fn().mockReturnValue({
  position: 'static'
});

describe('ThoughtBubbleUI System', () => {
  let aiMentor: AIMentorSystem;
  let thoughtBubbleManager: ThoughtBubbleManager;
  let mockHint: AIHint;
  let mockGameState: GameState;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Initialize AI mentor system
    aiMentor = new AIMentorSystem();
    const profile = new PlayerProfile('test-player');
    aiMentor.initialize(profile);

    // Initialize thought bubble manager
    try {
      thoughtBubbleManager = new ThoughtBubbleManager(mockContainer, aiMentor);
    } catch (error) {
      // Handle initialization errors in test environment
      console.warn('ThoughtBubbleManager initialization failed in test:', error);
    }
    
    mockHint = {
      id: 'test-hint-1',
      message: 'Consider using a healing potion - your health is low!',
      type: 'tactical',
      urgency: 'high',
      context: 'Player health is below 30%',
      showDuration: 5000
    };

    mockGameState = {
      player: {
        id: 'player1',
        position: { x: 5, y: 5 },
        health: 25,
        maxHealth: 100,
        level: 3,
        experience: 150,
        inventory: [],
        equipment: {},
        stats: { strength: 10, defense: 8, agility: 12, intelligence: 6 }
      },
      dungeon: {
        width: 20,
        height: 20,
        rooms: [],
        corridors: []
      },
      enemies: [],
      items: [],
      currentRoom: 'room1',
      gameTime: 12000,
      isInCombat: true,
      difficulty: 'medium',
      turnNumber: 1
    };
  });

  afterEach(() => {
    if (thoughtBubbleManager && thoughtBubbleManager.destroy) {
      thoughtBubbleManager.destroy();
    }
  });

  describe('initialization', () => {
    it('should create thought bubble manager with AI mentor system', () => {
      expect(thoughtBubbleManager).toBeDefined();
      expect(thoughtBubbleManager.isVisible()).toBe(false);
    });

    it('should start and stop real-time updates', () => {
      thoughtBubbleManager.startRealTimeUpdates();
      // Should not throw
      expect(() => {
        thoughtBubbleManager.stopRealTimeUpdates();
      }).not.toThrow();
    });
  });

  describe('hint display', () => {
    it('should display a hint correctly', () => {
      thoughtBubbleManager.displayHint(mockHint);
      
      expect(thoughtBubbleManager.isVisible()).toBe(true);
      expect(thoughtBubbleManager.getCurrentHint()).toEqual(mockHint);
    });

    it('should hide bubble correctly', () => {
      thoughtBubbleManager.displayHint(mockHint);
      expect(thoughtBubbleManager.isVisible()).toBe(true);

      thoughtBubbleManager.hideBubble();
      expect(thoughtBubbleManager.isVisible()).toBe(false);
    });

    it('should update game state for hint generation', () => {
      thoughtBubbleManager.startRealTimeUpdates();
      
      expect(() => {
        thoughtBubbleManager.updateGameState(mockGameState);
      }).not.toThrow();
      
      thoughtBubbleManager.stopRealTimeUpdates();
    });
  });

  describe('configuration updates', () => {
    it('should update configuration correctly', () => {
      expect(() => {
        thoughtBubbleManager.updateConfig({
          position: 'bottom-right',
          maxWidth: 350
        });
      }).not.toThrow();
    });

    it('should update styling correctly', () => {
      expect(() => {
        thoughtBubbleManager.updateStyle({
          colorPalette: ['#FF0000', '#00FF00'],
          fontSize: 14
        });
      }).not.toThrow();
    });

    it('should update frequency correctly', () => {
      expect(() => {
        thoughtBubbleManager.setUpdateFrequency(2000);
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle display errors gracefully', () => {
      // Should not throw even with invalid hint data
      const invalidHint = { ...mockHint, showDuration: -1 };
      
      expect(() => {
        thoughtBubbleManager.displayHint(invalidHint);
      }).not.toThrow();
    });

    it('should handle multiple hide calls gracefully', () => {
      thoughtBubbleManager.displayHint(mockHint);
      
      expect(() => {
        thoughtBubbleManager.hideBubble();
        thoughtBubbleManager.hideBubble();
      }).not.toThrow();
    });
  });

  describe('hint types and urgency', () => {
    it('should handle different hint types', () => {
      const types: AIHint['type'][] = ['tactical', 'strategic', 'warning', 'tip'];
      
      types.forEach(type => {
        const hint = { ...mockHint, type, id: `hint-${type}` };
        thoughtBubbleManager.displayHint(hint);
        expect(thoughtBubbleManager.getCurrentHint()?.type).toBe(type);
      });
    });

    it('should handle different urgency levels', () => {
      const urgencies: AIHint['urgency'][] = ['low', 'medium', 'high'];
      
      urgencies.forEach(urgency => {
        const hint = { ...mockHint, urgency, id: `hint-${urgency}` };
        thoughtBubbleManager.displayHint(hint);
        expect(thoughtBubbleManager.getCurrentHint()?.urgency).toBe(urgency);
      });
    });
  });

  describe('AI integration', () => {
    it('should integrate with AI mentor system for hint generation', () => {
      // Mock the AI mentor to return a hint
      const mockGenerateHint = jest.spyOn(aiMentor, 'generateHint').mockReturnValue(mockHint);
      
      thoughtBubbleManager.startRealTimeUpdates();
      thoughtBubbleManager.updateGameState(mockGameState);
      
      // Verify AI mentor was called
      expect(mockGenerateHint).toHaveBeenCalledWith(mockGameState);
      
      thoughtBubbleManager.stopRealTimeUpdates();
      mockGenerateHint.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      thoughtBubbleManager.displayHint(mockHint);
      thoughtBubbleManager.destroy();
      
      expect(thoughtBubbleManager.isVisible()).toBe(false);
      expect(thoughtBubbleManager.getCurrentHint()).toBeNull();
    });
  });
});