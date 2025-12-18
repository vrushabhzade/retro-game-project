/**
 * CSS styles for thought bubble UI components
 * Provides retro-themed styling that can be injected into the document
 */

export const THOUGHT_BUBBLE_CSS = `
  .thought-bubble {
    font-family: 'Courier New', monospace;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }

  .thought-bubble.retro-classic {
    background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
    border: 2px solid #000000;
    box-shadow: 4px 4px 0px #808080;
  }

  .thought-bubble.retro-green {
    background: linear-gradient(135deg, #00ff00 0%, #00cc00 100%);
    border: 2px solid #004400;
    color: #004400;
    box-shadow: 2px 2px 0px #008800;
  }

  .thought-bubble.retro-amber {
    background: linear-gradient(135deg, #ffaa00 0%, #ff8800 100%);
    border: 2px solid #442200;
    color: #442200;
    box-shadow: 2px 2px 0px #664400;
  }

  .thought-bubble.high-contrast {
    background: #ffffff;
    border: 3px solid #000000;
    color: #000000;
    box-shadow: 6px 6px 0px #000000;
  }

  .thought-bubble .urgency-high {
    animation: pulse-urgent 1s infinite;
  }

  .thought-bubble .urgency-medium {
    animation: pulse-medium 2s infinite;
  }

  @keyframes pulse-urgent {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  @keyframes pulse-medium {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.9; }
  }

  .thought-bubble .type-tactical::before {
    content: "⚔️ ";
  }

  .thought-bubble .type-strategic::before {
    content: "🧠 ";
  }

  .thought-bubble .type-warning::before {
    content: "⚠️ ";
  }

  .thought-bubble .type-tip::before {
    content: "💡 ";
  }
`;

/**
 * Inject the thought bubble CSS into the document head
 */
export function injectThoughtBubbleStyles(): void {
  // Check if we're in a browser environment
  if (typeof document === 'undefined' || !document.head) {
    return; // Skip in non-browser environments (like tests)
  }

  // Check if styles are already injected
  if (document.getElementById('thought-bubble-styles')) {
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.id = 'thought-bubble-styles';
  styleElement.textContent = THOUGHT_BUBBLE_CSS;
  document.head.appendChild(styleElement);
}

/**
 * Remove the thought bubble CSS from the document
 */
export function removeThoughtBubbleStyles(): void {
  const styleElement = document.getElementById('thought-bubble-styles');
  if (styleElement) {
    styleElement.remove();
  }
}

/**
 * Get CSS class names for different retro themes
 */
export function getRetroThemeClass(theme: 'classic' | 'green' | 'amber' | 'high-contrast'): string {
  return `retro-${theme}`;
}

/**
 * Get CSS class names for urgency levels
 */
export function getUrgencyClass(urgency: 'low' | 'medium' | 'high'): string {
  return `urgency-${urgency}`;
}

/**
 * Get CSS class names for hint types
 */
export function getTypeClass(type: 'tactical' | 'strategic' | 'warning' | 'tip'): string {
  return `type-${type}`;
}