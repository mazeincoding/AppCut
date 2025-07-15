/**
 * Performance Test Utilities
 * Helper functions for performance monitoring and benchmarking
 */

export interface PerformanceMetrics {
  loadTime?: number
  domContentLoaded?: number
  memoryUsage?: MemoryUsage
  resourceCount?: number
  networkRequests?: PerformanceEntry[]
  renderTime?: number
  interactionTime?: number
}

export interface MemoryUsage {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

export interface ExportPerformanceData {
  startTime: number
  endTime?: number
  duration?: number
  memoryStart: MemoryUsage
  memoryPeak: MemoryUsage
  memoryEnd?: MemoryUsage
  progressUpdates: Array<{
    timestamp: number
    progress: number
    memoryUsage: MemoryUsage
  }>
  phases: Array<{
    name: string
    startTime: number
    endTime?: number
    duration?: number
  }>
  errors: string[]
  warnings: string[]
}

/**
 * Performance monitoring utility class
 */
export class PerformanceMonitor {
  private startTime: number = 0
  private metrics: PerformanceMetrics = {}
  private observers: PerformanceObserver[] = []

  constructor() {
    this.startTime = Date.now()
  }

  /**
   * Get current performance metrics
   */
  async getMetrics(): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {}

    // Get timing metrics
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        metrics.loadTime = navigation.loadEventEnd - navigation.loadEventStart
        metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
      }

      // Get resource count
      const resources = performance.getEntriesByType('resource')
      metrics.resourceCount = resources.length
      metrics.networkRequests = resources
    }

    // Get memory usage
    if (typeof window !== 'undefined' && (window.performance as any).memory) {
      const memory = (window.performance as any).memory
      metrics.memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }
    }

    return metrics
  }

  /**
   * Start monitoring export performance
   */
  startExportMonitoring(): ExportPerformanceData {
    const exportData: ExportPerformanceData = {
      startTime: Date.now(),
      memoryStart: this.getCurrentMemoryUsage(),
      memoryPeak: this.getCurrentMemoryUsage(),
      progressUpdates: [],
      phases: [],
      errors: [],
      warnings: []
    }

    return exportData
  }

  /**
   * Update export monitoring data
   */
  updateExportMonitoring(
    exportData: ExportPerformanceData,
    progress: number,
    phase?: string
  ): void {
    const currentTime = Date.now()
    const currentMemory = this.getCurrentMemoryUsage()

    // Update progress
    exportData.progressUpdates.push({
      timestamp: currentTime,
      progress,
      memoryUsage: currentMemory
    })

    // Update peak memory
    if (currentMemory.usedJSHeapSize > exportData.memoryPeak.usedJSHeapSize) {
      exportData.memoryPeak = currentMemory
    }

    // Update phase if provided
    if (phase) {
      const lastPhase = exportData.phases[exportData.phases.length - 1]
      if (lastPhase && !lastPhase.endTime) {
        lastPhase.endTime = currentTime
        lastPhase.duration = lastPhase.endTime - lastPhase.startTime
      }

      exportData.phases.push({
        name: phase,
        startTime: currentTime
      })
    }
  }

  /**
   * Finish export monitoring
   */
  finishExportMonitoring(exportData: ExportPerformanceData): ExportPerformanceData {
    const endTime = Date.now()
    exportData.endTime = endTime
    exportData.duration = endTime - exportData.startTime
    exportData.memoryEnd = this.getCurrentMemoryUsage()

    // Close last phase
    const lastPhase = exportData.phases[exportData.phases.length - 1]
    if (lastPhase && !lastPhase.endTime) {
      lastPhase.endTime = endTime
      lastPhase.duration = lastPhase.endTime - lastPhase.startTime
    }

    return exportData
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): MemoryUsage {
    if (typeof window !== 'undefined' && (window.performance as any).memory) {
      const memory = (window.performance as any).memory
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }
    }

    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    }
  }

  /**
   * Analyze export performance data
   */
  analyzeExportPerformance(exportData: ExportPerformanceData): {
    summary: string
    memoryEfficiency: string
    performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F'
    recommendations: string[]
  } {
    const duration = exportData.duration || 0
    const memoryIncrease = exportData.memoryPeak.usedJSHeapSize - exportData.memoryStart.usedJSHeapSize
    const memoryCleanup = exportData.memoryEnd 
      ? exportData.memoryPeak.usedJSHeapSize - exportData.memoryEnd.usedJSHeapSize
      : 0

    const summary = `Export completed in ${duration}ms with ${(memoryIncrease / 1024 / 1024).toFixed(1)}MB peak memory increase`
    
    const memoryEfficiency = memoryCleanup > 0 
      ? `${((memoryCleanup / memoryIncrease) * 100).toFixed(1)}% memory cleaned up`
      : 'Memory cleanup assessment unavailable'

    // Determine performance grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A'
    const recommendations: string[] = []

    if (duration > 30000) { // > 30 seconds
      grade = 'D'
      recommendations.push('Export duration is very long - consider optimization')
    } else if (duration > 15000) { // > 15 seconds
      grade = 'C'
      recommendations.push('Export duration could be improved')
    } else if (duration > 5000) { // > 5 seconds
      grade = 'B'
    }

    if (memoryIncrease > 200 * 1024 * 1024) { // > 200MB
      grade = grade === 'A' ? 'C' : 'D'
      recommendations.push('High memory usage detected - consider memory optimization')
    } else if (memoryIncrease > 100 * 1024 * 1024) { // > 100MB
      grade = grade === 'A' ? 'B' : grade
      recommendations.push('Moderate memory usage - monitor for larger exports')
    }

    if (exportData.errors.length > 0) {
      grade = 'F'
      recommendations.push('Errors detected during export - needs investigation')
    }

    if (exportData.warnings.length > 2) {
      grade = grade === 'A' ? 'B' : grade
      recommendations.push('Multiple warnings detected - review export process')
    }

    if (recommendations.length === 0) {
      recommendations.push('Export performance is optimal')
    }

    return {
      summary,
      memoryEfficiency,
      performanceGrade: grade,
      recommendations
    }
  }

  /**
   * Cleanup monitoring resources
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

/**
 * Benchmark utility functions
 */
export class BenchmarkUtils {
  /**
   * Measure function execution time
   */
  static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now()
    const result = await fn()
    const duration = Date.now() - start
    return { result, duration }
  }

  /**
   * Run multiple iterations and get average
   */
  static async benchmark<T>(
    fn: () => Promise<T>,
    iterations: number = 3
  ): Promise<{
    averageTime: number
    minTime: number
    maxTime: number
    results: T[]
  }> {
    const times: number[] = []
    const results: T[] = []

    for (let i = 0; i < iterations; i++) {
      const { result, duration } = await this.measureTime(fn)
      times.push(duration)
      results.push(result)
    }

    return {
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      results
    }
  }

  /**
   * Compare two functions performance
   */
  static async compare<T>(
    fn1: () => Promise<T>,
    fn2: () => Promise<T>,
    iterations: number = 3
  ): Promise<{
    fn1Stats: { averageTime: number; minTime: number; maxTime: number }
    fn2Stats: { averageTime: number; minTime: number; maxTime: number }
    winner: 'fn1' | 'fn2' | 'tie'
    improvement: string
  }> {
    const [fn1Benchmark, fn2Benchmark] = await Promise.all([
      this.benchmark(fn1, iterations),
      this.benchmark(fn2, iterations)
    ])

    const fn1Stats = {
      averageTime: fn1Benchmark.averageTime,
      minTime: fn1Benchmark.minTime,
      maxTime: fn1Benchmark.maxTime
    }

    const fn2Stats = {
      averageTime: fn2Benchmark.averageTime,
      minTime: fn2Benchmark.minTime,
      maxTime: fn2Benchmark.maxTime
    }

    let winner: 'fn1' | 'fn2' | 'tie'
    let improvement: string

    if (fn1Stats.averageTime < fn2Stats.averageTime) {
      winner = 'fn1'
      const improvementPercent = ((fn2Stats.averageTime - fn1Stats.averageTime) / fn2Stats.averageTime * 100).toFixed(1)
      improvement = `fn1 is ${improvementPercent}% faster`
    } else if (fn2Stats.averageTime < fn1Stats.averageTime) {
      winner = 'fn2'
      const improvementPercent = ((fn1Stats.averageTime - fn2Stats.averageTime) / fn1Stats.averageTime * 100).toFixed(1)
      improvement = `fn2 is ${improvementPercent}% faster`
    } else {
      winner = 'tie'
      improvement = 'Performance is equivalent'
    }

    return {
      fn1Stats,
      fn2Stats,
      winner,
      improvement
    }
  }
}

/**
 * Memory monitoring utilities
 */
export class MemoryMonitor {
  private baseline: MemoryUsage | null = null
  private samples: Array<{ timestamp: number; usage: MemoryUsage }> = []
  private monitoring = false
  private intervalId: NodeJS.Timeout | null = null

  /**
   * Set memory baseline
   */
  setBaseline(): void {
    if (typeof window !== 'undefined' && (window.performance as any).memory) {
      const memory = (window.performance as any).memory
      this.baseline = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }
    }
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMs: number = 1000): void {
    if (this.monitoring) return

    this.monitoring = true
    this.samples = []

    this.intervalId = setInterval(() => {
      this.takeSample()
    }, intervalMs)
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.monitoring = false
  }

  /**
   * Take a memory sample
   */
  takeSample(): MemoryUsage | null {
    if (typeof window !== 'undefined' && (window.performance as any).memory) {
      const memory = (window.performance as any).memory
      const usage: MemoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }

      this.samples.push({
        timestamp: Date.now(),
        usage
      })

      return usage
    }

    return null
  }

  /**
   * Get memory analysis
   */
  getAnalysis(): {
    baseline: MemoryUsage | null
    current: MemoryUsage | null
    peak: MemoryUsage | null
    increase: number
    samples: Array<{ timestamp: number; usage: MemoryUsage }>
    trend: 'increasing' | 'decreasing' | 'stable'
    efficiency: string
  } {
    const current = this.takeSample()
    const peak = this.samples.reduce((max, sample) => 
      sample.usage.usedJSHeapSize > max.usage.usedJSHeapSize ? sample : max,
      this.samples[0] || { timestamp: 0, usage: { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 } }
    )

    const increase = this.baseline && current 
      ? current.usedJSHeapSize - this.baseline.usedJSHeapSize
      : 0

    // Determine trend from last few samples
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (this.samples.length >= 3) {
      const recent = this.samples.slice(-3)
      const first = recent[0].usage.usedJSHeapSize
      const last = recent[recent.length - 1].usage.usedJSHeapSize
      const diff = last - first
      
      if (diff > 1024 * 1024) { // > 1MB increase
        trend = 'increasing'
      } else if (diff < -1024 * 1024) { // > 1MB decrease
        trend = 'decreasing'
      }
    }

    const efficiency = increase > 0 
      ? `${(increase / 1024 / 1024).toFixed(1)}MB increase from baseline`
      : 'No significant memory increase'

    return {
      baseline: this.baseline,
      current,
      peak: peak?.usage || null,
      increase,
      samples: this.samples,
      trend,
      efficiency
    }
  }

  /**
   * Reset monitoring data
   */
  reset(): void {
    this.baseline = null
    this.samples = []
    this.stopMonitoring()
  }
}