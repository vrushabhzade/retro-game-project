import { PerformanceMonitor } from './Performance';
import { 
  MAX_FRAME_RATE, 
  TARGET_FRAME_TIME, 
  MAX_INPUT_RESPONSE_TIME,
  AI_PROCESSING_THROTTLE_TIME 
} from './Constants';
import { handleError } from './ErrorHandling';

/**
 * Performance Manager for system prioritization and load balancing
 * Implements requirements 6.3, 6.4: Prioritize gameplay responsiveness over AI processing
 */
export class PerformanceManager {
  private static instance: PerformanceManager;
  private monitor: PerformanceMonitor;
  private systemPriorities: Map<string, SystemPriority> = new Map();
  private loadBalancer: LoadBalancer;
  private frameTimeHistory: number[] = [];
  private maxHistorySize: number = 60; // Track last 60 frames (1 second at 60fps)
  private performanceThresholds: PerformanceThresholds;
  private adaptiveSettings: AdaptiveSettings;

  private constructor() {
    this.monitor = PerformanceMonitor.getInstance();
    this.loadBalancer = new LoadBalancer();
    this.performanceThresholds = {
      criticalFrameTime: TARGET_FRAME_TIME * 1.5, // 25ms
      warningFrameTime: TARGET_FRAME_TIME * 1.2,  // 20ms
      maxInputDelay: MAX_INPUT_RESPONSE_TIME,
      aiThrottleThreshold: TARGET_FRAME_TIME * 0.8 // 13ms
    };
    this.adaptiveSettings = {
      aiProcessingEnabled: true,
      visualEffectsEnabled: true,
      animationQuality: 'high',
      renderOptimizations: false
    };
    this.initializeSystemPriorities();
  }

  static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  /**
   * Initialize system priorities for load balancing
   */
  private initializeSystemPriorities(): void {
    // Critical systems (highest priority)
    this.systemPriorities.set('input', {
      level: 'critical',
      maxExecutionTime: 5, // 5ms max
      canThrottle: false,
      enabled: true
    });

    this.systemPriorities.set('gameLogic', {
      level: 'critical',
      maxExecutionTime: 8, // 8ms max
      canThrottle: false,
      enabled: true
    });

    // High priority systems
    this.systemPriorities.set('rendering', {
      level: 'high',
      maxExecutionTime: 10, // 10ms max
      canThrottle: true,
      enabled: true
    });

    this.systemPriorities.set('combat', {
      level: 'high',
      maxExecutionTime: 6, // 6ms max
      canThrottle: false,
      enabled: true
    });

    // Medium priority systems
    this.systemPriorities.set('aiMentor', {
      level: 'medium',
      maxExecutionTime: AI_PROCESSING_THROTTLE_TIME,
      canThrottle: true,
      enabled: true
    });

    this.systemPriorities.set('visualAdaptation', {
      level: 'medium',
      maxExecutionTime: 20, // 20ms max
      canThrottle: true,
      enabled: true
    });

    // Low priority systems
    this.systemPriorities.set('combatAnalysis', {
      level: 'low',
      maxExecutionTime: 30, // 30ms max
      canThrottle: true,
      enabled: true
    });

    this.systemPriorities.set('saveSystem', {
      level: 'low',
      maxExecutionTime: 50, // 50ms max
      canThrottle: true,
      enabled: true
    });
  }

  /**
   * Start performance monitoring for a system
   */
  startSystemTimer(systemName: string): void {
    this.monitor.startTimer(systemName);
  }

  /**
   * End performance monitoring and check if system should be throttled
   */
  endSystemTimer(systemName: string): SystemExecutionResult {
    try {
      const executionTime = this.monitor.endTimer(systemName);
      const priority = this.systemPriorities.get(systemName);

      if (!priority) {
        return { 
          executionTime, 
          shouldThrottle: false, 
          shouldSkip: false,
          performanceImpact: 'none'
        };
      }

      const shouldThrottle = this.shouldThrottleSystem(systemName, executionTime);
      const shouldSkip = this.shouldSkipSystem(systemName);
      const performanceImpact = this.calculatePerformanceImpact(executionTime, priority);

      // Update load balancer with execution data
      this.loadBalancer.recordExecution(systemName, executionTime, priority.level);

      return {
        executionTime,
        shouldThrottle,
        shouldSkip,
        performanceImpact
      };

    } catch (error) {
      handleError(error, 'Failed to end system timer', { 
        context: 'PerformanceManager.endSystemTimer',
        systemName 
      });
      return { 
        executionTime: 0, 
        shouldThrottle: false, 
        shouldSkip: false,
        performanceImpact: 'none'
      };
    }
  }

  /**
   * Record frame time and update performance metrics
   */
  recordFrameTime(frameTime: number): void {
    this.frameTimeHistory.push(frameTime);
    
    // Trim history to max size
    if (this.frameTimeHistory.length > this.maxHistorySize) {
      this.frameTimeHistory = this.frameTimeHistory.slice(-this.maxHistorySize);
    }

    // Update adaptive settings based on performance
    this.updateAdaptiveSettings(frameTime);
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const avgFrameTime = this.getAverageFrameTime();
    const currentFPS = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
    
    return {
      averageFrameTime: avgFrameTime,
      currentFPS: currentFPS,
      targetFPS: MAX_FRAME_RATE,
      frameTimeVariance: this.getFrameTimeVariance(),
      systemLoad: this.loadBalancer.getCurrentLoad(),
      adaptiveSettings: { ...this.adaptiveSettings },
      performanceLevel: this.getPerformanceLevel()
    };
  }

  /**
   * Check if a system should be throttled based on current performance
   */
  shouldThrottleSystem(systemName: string, executionTime?: number): boolean {
    const priority = this.systemPriorities.get(systemName);
    if (!priority || !priority.canThrottle) {
      return false;
    }

    // Check if system execution time exceeds limits
    if (executionTime && executionTime > priority.maxExecutionTime) {
      return true;
    }

    // Check overall system load
    const currentLoad = this.loadBalancer.getCurrentLoad();
    if (currentLoad > 0.8 && priority.level !== 'critical') {
      return true;
    }

    // Check frame time performance
    const avgFrameTime = this.getAverageFrameTime();
    if (avgFrameTime > this.performanceThresholds.criticalFrameTime) {
      return priority.level === 'low' || priority.level === 'medium';
    }

    return false;
  }

  /**
   * Check if a system should be skipped entirely
   */
  shouldSkipSystem(systemName: string): boolean {
    const priority = this.systemPriorities.get(systemName);
    if (!priority || !priority.enabled) {
      return true;
    }

    // Skip low priority systems under high load
    const currentLoad = this.loadBalancer.getCurrentLoad();
    if (currentLoad > 0.9 && priority.level === 'low') {
      return true;
    }

    // Skip based on adaptive settings
    if (!this.adaptiveSettings.aiProcessingEnabled && 
        (systemName === 'aiMentor' || systemName === 'visualAdaptation' || systemName === 'combatAnalysis')) {
      return true;
    }

    return false;
  }

  /**
   * Get recommended execution budget for a system
   */
  getSystemBudget(systemName: string): number {
    const priority = this.systemPriorities.get(systemName);
    if (!priority) {
      return 0;
    }

    const currentLoad = this.loadBalancer.getCurrentLoad();
    const baseBudget = priority.maxExecutionTime;

    // Reduce budget under high load
    if (currentLoad > 0.8) {
      return baseBudget * 0.5;
    } else if (currentLoad > 0.6) {
      return baseBudget * 0.75;
    }

    return baseBudget;
  }

  /**
   * Enable or disable a system
   */
  setSystemEnabled(systemName: string, enabled: boolean): void {
    const priority = this.systemPriorities.get(systemName);
    if (priority) {
      priority.enabled = enabled;
    }
  }

  /**
   * Update system priority
   */
  updateSystemPriority(systemName: string, updates: Partial<SystemPriority>): void {
    const priority = this.systemPriorities.get(systemName);
    if (priority) {
      Object.assign(priority, updates);
    }
  }

  /**
   * Get adaptive settings for systems to use
   */
  getAdaptiveSettings(): AdaptiveSettings {
    return { ...this.adaptiveSettings };
  }

  /**
   * Force performance optimization mode
   */
  enablePerformanceMode(enabled: boolean): void {
    if (enabled) {
      this.adaptiveSettings.aiProcessingEnabled = false;
      this.adaptiveSettings.visualEffectsEnabled = false;
      this.adaptiveSettings.animationQuality = 'low';
      this.adaptiveSettings.renderOptimizations = true;
    } else {
      this.adaptiveSettings.aiProcessingEnabled = true;
      this.adaptiveSettings.visualEffectsEnabled = true;
      this.adaptiveSettings.animationQuality = 'high';
      this.adaptiveSettings.renderOptimizations = false;
    }
  }

  // Private helper methods

  private getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) {
      return 0;
    }
    const sum = this.frameTimeHistory.reduce((acc, time) => acc + time, 0);
    return sum / this.frameTimeHistory.length;
  }

  private getFrameTimeVariance(): number {
    if (this.frameTimeHistory.length < 2) {
      return 0;
    }
    
    const avg = this.getAverageFrameTime();
    const squaredDiffs = this.frameTimeHistory.map(time => Math.pow(time - avg, 2));
    const variance = squaredDiffs.reduce((acc, diff) => acc + diff, 0) / this.frameTimeHistory.length;
    
    return Math.sqrt(variance); // Return standard deviation
  }

  private updateAdaptiveSettings(frameTime: number): void {
    // Disable AI processing if frame time is consistently high
    if (frameTime > this.performanceThresholds.criticalFrameTime) {
      this.adaptiveSettings.aiProcessingEnabled = false;
      this.adaptiveSettings.renderOptimizations = true;
    } else if (frameTime > this.performanceThresholds.warningFrameTime) {
      this.adaptiveSettings.animationQuality = 'medium';
      this.adaptiveSettings.visualEffectsEnabled = false;
    } else if (frameTime < this.performanceThresholds.aiThrottleThreshold) {
      // Re-enable features if performance is good
      this.adaptiveSettings.aiProcessingEnabled = true;
      this.adaptiveSettings.visualEffectsEnabled = true;
      this.adaptiveSettings.animationQuality = 'high';
      this.adaptiveSettings.renderOptimizations = false;
    }
  }

  private calculatePerformanceImpact(executionTime: number, priority: SystemPriority): PerformanceImpact {
    const ratio = executionTime / priority.maxExecutionTime;
    
    if (ratio > 2.0) {
      return 'severe';
    } else if (ratio > 1.5) {
      return 'high';
    } else if (ratio > 1.0) {
      return 'medium';
    } else if (ratio > 0.5) {
      return 'low';
    } else {
      return 'none';
    }
  }

  private getPerformanceLevel(): PerformanceLevel {
    const avgFrameTime = this.getAverageFrameTime();
    const targetFrameTime = TARGET_FRAME_TIME;
    
    if (avgFrameTime <= targetFrameTime) {
      return 'excellent';
    } else if (avgFrameTime <= targetFrameTime * 1.2) {
      return 'good';
    } else if (avgFrameTime <= targetFrameTime * 1.5) {
      return 'fair';
    } else {
      return 'poor';
    }
  }
}

/**
 * Load Balancer for managing system execution
 */
class LoadBalancer {
  private systemLoads: Map<string, SystemLoad> = new Map();
  private totalBudget: number = TARGET_FRAME_TIME * 0.9; // Use 90% of frame time budget

  recordExecution(systemName: string, executionTime: number, priority: PriorityLevel): void {
    const load = this.systemLoads.get(systemName) || {
      averageTime: 0,
      peakTime: 0,
      executionCount: 0,
      priority: priority
    };

    // Update running average
    load.executionCount++;
    load.averageTime = ((load.averageTime * (load.executionCount - 1)) + executionTime) / load.executionCount;
    load.peakTime = Math.max(load.peakTime, executionTime);

    this.systemLoads.set(systemName, load);
  }

  getCurrentLoad(): number {
    let totalLoad = 0;
    
    for (const load of this.systemLoads.values()) {
      totalLoad += load.averageTime;
    }

    return Math.min(1.0, totalLoad / this.totalBudget);
  }

  getSystemLoad(systemName: string): SystemLoad | null {
    return this.systemLoads.get(systemName) || null;
  }

  resetMetrics(): void {
    this.systemLoads.clear();
  }
}

// Type definitions

export interface SystemPriority {
  level: PriorityLevel;
  maxExecutionTime: number; // milliseconds
  canThrottle: boolean;
  enabled: boolean;
}

export interface SystemExecutionResult {
  executionTime: number;
  shouldThrottle: boolean;
  shouldSkip: boolean;
  performanceImpact: PerformanceImpact;
}

export interface PerformanceMetrics {
  averageFrameTime: number;
  currentFPS: number;
  targetFPS: number;
  frameTimeVariance: number;
  systemLoad: number;
  adaptiveSettings: AdaptiveSettings;
  performanceLevel: PerformanceLevel;
}

export interface PerformanceThresholds {
  criticalFrameTime: number;
  warningFrameTime: number;
  maxInputDelay: number;
  aiThrottleThreshold: number;
}

export interface AdaptiveSettings {
  aiProcessingEnabled: boolean;
  visualEffectsEnabled: boolean;
  animationQuality: 'low' | 'medium' | 'high';
  renderOptimizations: boolean;
}

interface SystemLoad {
  averageTime: number;
  peakTime: number;
  executionCount: number;
  priority: PriorityLevel;
}

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
export type PerformanceImpact = 'none' | 'low' | 'medium' | 'high' | 'severe';
export type PerformanceLevel = 'excellent' | 'good' | 'fair' | 'poor';