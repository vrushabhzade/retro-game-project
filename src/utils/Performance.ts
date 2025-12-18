// Performance monitoring utilities

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(label: string): void {
    const start = performance.now();
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(start);
  }

  endTimer(label: string): number {
    const end = performance.now();
    const times = this.metrics.get(label);
    if (!times || times.length === 0) {
      throw new Error(`No timer started for label: ${label}`);
    }
    const start = times.pop()!;
    const duration = end - start;
    return duration;
  }

  getAverageTime(label: string): number {
    const times = this.metrics.get(label);
    if (!times || times.length === 0) {
      return 0;
    }
    const sum = times.reduce((acc, time) => acc + time, 0);
    return sum / times.length;
  }

  clearMetrics(label?: string): void {
    if (label) {
      this.metrics.delete(label);
    } else {
      this.metrics.clear();
    }
  }
}