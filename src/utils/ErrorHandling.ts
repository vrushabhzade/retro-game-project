// Error handling utilities

export class GameError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export class SaveError extends GameError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'SAVE_ERROR', context);
    this.name = 'SaveError';
  }
}

export class AIError extends GameError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'AI_ERROR', context);
    this.name = 'AIError';
  }
}

export class RenderError extends GameError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'RENDER_ERROR', context);
    this.name = 'RenderError';
  }
}

// Global flag to suppress error logging during tests
let suppressErrorLogging = false;

export function setSuppressErrorLogging(suppress: boolean): void {
  suppressErrorLogging = suppress;
}

export function handleError(error: Error | unknown, message?: string, context?: Record<string, any>): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  // Only log if not suppressed (useful for testing expected errors)
  if (!suppressErrorLogging) {
    console.error('Game Error:', {
      name: errorObj.name,
      message: message || errorObj.message,
      originalMessage: errorObj.message,
      stack: errorObj.stack,
      context
    });
  }

  // In a real implementation, this might send errors to a logging service
  // For now, we'll just log to console
}

export class ErrorHandler {
  static handleError(error: Error | unknown, message?: string, context?: Record<string, any>): void {
    handleError(error, message, context);
  }
}

export function createErrorHandler(context: string) {
  return (error: Error) => {
    handleError(error, undefined, { context });
  };
}

// Simple logger for development
export const logger = {
  info: (message: string, data?: any) => {
    if (!suppressErrorLogging) {
      console.log(`[INFO] ${message}`, data || '');
    }
  },
  warn: (message: string, data?: any) => {
    if (!suppressErrorLogging) {
      console.warn(`[WARN] ${message}`, data || '');
    }
  },
  error: (message: string, error?: any) => {
    if (!suppressErrorLogging) {
      console.error(`[ERROR] ${message}`, error || '');
    }
  },
  debug: (message: string, data?: any) => {
    if (!suppressErrorLogging && process.env['NODE_ENV'] === 'development') {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  }
};