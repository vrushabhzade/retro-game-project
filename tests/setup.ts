// Jest setup file for global test configuration

import * as fc from 'fast-check';

// Configure fast-check for property-based testing
fc.configureGlobal({
  numRuns: 100, // Minimum 100 iterations as specified in design
  timeout: 5000, // 5 second timeout per property test
  verbose: true,
  seed: 42, // Fixed seed for reproducible tests during development
});

// Mock browser APIs for Node.js test environment
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(callback, 16); // ~60fps
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
};

// Mock document for input handling tests
global.document = {
  ...global.document,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
} as any;

// Mock window for input handling tests
global.window = {
  ...global.window,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
} as any;

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log during tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Setup performance monitoring for tests
beforeEach(() => {
  // Reset performance metrics before each test
  if (typeof performance !== 'undefined') {
    performance.mark = jest.fn();
    performance.measure = jest.fn();
  }
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
});