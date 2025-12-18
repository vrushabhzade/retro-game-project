import * as fc from 'fast-check';
import { ThoughtBubbleManager } from '../../src/ui/ThoughtBubbleManager';
import { AIMentorSystem } from '../../src/ai/AIMentorSystem';
import { PlayerProfile } from '../../src/player/PlayerProfile';
import { AIHint } from '../../src/types/AITypes';

/**
 * Feature: ai-dungeon-master, Property 6: Thought Bubble UI Responsiveness
 * Validates: Requirements 2.3
 */

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

// Generators
const hintTypeArb = fc.constantFrom('tactical' as const, 'strategic' as const, 'warning' as const, 'tip' as const);
const urgencyArb = fc.constantFrom('low' as const, 'medium' as const, 'high' as const);
const positionArb = fc.constantFrom('top-left' as const, 'top-right' as const, 'bottom-left' as const, 'bottom-right' as const);

const hintArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  message: fc.string({ minLength: 5, maxLength: 100 }),
  type: hintTypeArb,
  urgency: urgencyArb,
  context: fc.string({ maxLength: 50 }),
  showDuration: fc.integer({ min: 1000, max: 10000 })
});

describe('Property 6: Thought Bubble UI Responsiveness', () => {
  let aiMentor: AIMentorSystem;
  let thoughtBubbleManager: ThoughtBubbleManager;

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
  });

  afterEach(() => {
    if (thoughtBubbleManager && thoughtBubbleManager.destroy) {
      thoughtBubbleManager.destroy();
    }
  });

  it('should display AI tactical suggestions in real-time', async () => {
    await fc.assert(
      fc.asyncProperty(hintArb, async (hint) => {
        // When the AI mentor has tactical suggestions
        thoughtBubbleManager.displayHint(hint);
        
        // Then the thought bubble UI should display the mentor's reasoning process in real-time
        expect(thoughtBubbleManager.isVisible()).toBe(true);
        expect(thoughtBubbleManager.getCurrentHint()).toEqual(hint);
        
        // The display should be responsive - hint should be immediately available
        const currentHint = thoughtBubbleManager.getCurrentHint();
        expect(currentHint).not.toBeNull();
        expect(currentHint?.id).toBe(hint.id);
        expect(currentHint?.message).toBe(hint.message);
        expect(currentHint?.type).toBe(hint.type);
        expect(currentHint?.urgency).toBe(hint.urgency);
      }),
      { numRuns: 100 }
    );
  });

  it('should update display responsively when new hints are generated', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(hintArb, { minLength: 2, maxLength: 5 }),
        async (hints) => {
          // Display multiple hints in sequence
          for (const hint of hints) {
            thoughtBubbleManager.displayHint(hint);
            
            // Each hint should be immediately displayed
            expect(thoughtBubbleManager.isVisible()).toBe(true);
            expect(thoughtBubbleManager.getCurrentHint()?.id).toBe(hint.id);
          }
          
          // The last hint should be the currently displayed one
          const lastHint = hints[hints.length - 1];
          if (lastHint) {
            expect(thoughtBubbleManager.getCurrentHint()?.id).toBe(lastHint.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle rapid hint updates without losing responsiveness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(hintArb, { minLength: 3, maxLength: 10 }),
        async (hints) => {
          // Rapidly display multiple hints
          hints.forEach(hint => {
            thoughtBubbleManager.displayHint(hint);
          });
          
          // System should remain responsive and show the latest hint
          expect(thoughtBubbleManager.isVisible()).toBe(true);
          
          const currentHint = thoughtBubbleManager.getCurrentHint();
          expect(currentHint).not.toBeNull();
          
          // The displayed hint should be one of the provided hints
          const hintIds = hints.map(h => h.id);
          expect(hintIds).toContain(currentHint?.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain responsiveness across different hint types and urgencies', async () => {
    await fc.assert(
      fc.asyncProperty(
        hintTypeArb,
        urgencyArb,
        fc.string({ minLength: 5, maxLength: 50 }),
        async (type, urgency, message) => {
          const hint: AIHint = {
            id: `test-${Date.now()}-${Math.random()}`,
            message,
            type,
            urgency,
            context: 'Property test context',
            showDuration: 3000
          };
          
          // Display hint and verify immediate responsiveness
          thoughtBubbleManager.displayHint(hint);
          
          expect(thoughtBubbleManager.isVisible()).toBe(true);
          
          const displayedHint = thoughtBubbleManager.getCurrentHint();
          expect(displayedHint).not.toBeNull();
          expect(displayedHint?.type).toBe(type);
          expect(displayedHint?.urgency).toBe(urgency);
          expect(displayedHint?.message).toBe(message);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should respond immediately to hide requests', async () => {
    await fc.assert(
      fc.asyncProperty(hintArb, async (hint) => {
        // Display a hint first
        thoughtBubbleManager.displayHint(hint);
        expect(thoughtBubbleManager.isVisible()).toBe(true);
        
        // Hide the hint
        thoughtBubbleManager.hideBubble();
        
        // Should respond immediately to hide request
        expect(thoughtBubbleManager.isVisible()).toBe(false);
        expect(thoughtBubbleManager.getCurrentHint()).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain responsiveness when updating configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        hintArb,
        positionArb,
        fc.integer({ min: 200, max: 500 }),
        async (hint, position, maxWidth) => {
          // Display a hint
          thoughtBubbleManager.displayHint(hint);
          expect(thoughtBubbleManager.isVisible()).toBe(true);
          
          // Update configuration while hint is displayed
          thoughtBubbleManager.updateConfig({ position, maxWidth });
          
          // Should remain responsive and maintain display
          expect(thoughtBubbleManager.isVisible()).toBe(true);
          expect(thoughtBubbleManager.getCurrentHint()?.id).toBe(hint.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain responsiveness when updating styling', async () => {
    await fc.assert(
      fc.asyncProperty(
        hintArb,
        fc.array(fc.string({ minLength: 6, maxLength: 7 }).filter(s => s.startsWith('#')), { minLength: 2, maxLength: 4 }),
        fc.integer({ min: 10, max: 16 }),
        async (hint, colorPalette, fontSize) => {
          // Display a hint
          thoughtBubbleManager.displayHint(hint);
          expect(thoughtBubbleManager.isVisible()).toBe(true);
          
          // Update styling while hint is displayed
          thoughtBubbleManager.updateStyle({ colorPalette, fontSize });
          
          // Should remain responsive and maintain display
          expect(thoughtBubbleManager.isVisible()).toBe(true);
          expect(thoughtBubbleManager.getCurrentHint()?.id).toBe(hint.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases responsively', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 1 }), // Very short ID
          message: fc.string({ minLength: 1, maxLength: 5 }), // Very short message
          type: hintTypeArb,
          urgency: urgencyArb,
          context: fc.constant(''), // Empty context
          showDuration: fc.integer({ min: 100, max: 500 }) // Very short duration
        }),
        async (hint) => {
          // Even with edge case data, system should remain responsive
          thoughtBubbleManager.displayHint(hint);
          
          expect(thoughtBubbleManager.isVisible()).toBe(true);
          
          const displayedHint = thoughtBubbleManager.getCurrentHint();
          expect(displayedHint).not.toBeNull();
          expect(displayedHint?.id).toBe(hint.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});