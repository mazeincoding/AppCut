/**
 * Performance Test Configuration
 * Configuration settings for performance testing
 */

export interface PerformanceTestConfig {
  // Memory thresholds
  memoryLimits: {
    baseline: number // MB
    warningThreshold: number // MB increase
    errorThreshold: number // MB increase
    maxHeapSize: number // MB
  }

  // Timing thresholds
  timingLimits: {
    pageLoad: number // ms
    exportStart: number // ms
    shortExport: number // ms (< 10 seconds video)
    longExport: number // ms (> 30 seconds video)
    uiResponse: number // ms
  }

  // Test parameters
  testParams: {
    exportIterations: number
    memoryMonitoringInterval: number // ms
    performanceTestTimeout: number // ms
    benchmarkIterations: number
  }

  // Quality settings for performance tests
  exportSettings: {
    lowQuality: {
      resolution: { width: 640, height: 480 }
      bitrate: 1000000 // 1 Mbps
      format: 'mp4'
    }
    mediumQuality: {
      resolution: { width: 1280, height: 720 }
      bitrate: 5000000 // 5 Mbps
      format: 'mp4'
    }
    highQuality: {
      resolution: { width: 1920, height: 1080 }
      bitrate: 10000000 // 10 Mbps
      format: 'mp4'
    }
  }
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceTestConfig = {
  memoryLimits: {
    baseline: 100, // 100MB baseline
    warningThreshold: 200, // Warn if memory increases by 200MB
    errorThreshold: 500, // Error if memory increases by 500MB
    maxHeapSize: 2000 // 2GB max heap
  },

  timingLimits: {
    pageLoad: 5000, // 5 seconds max page load
    exportStart: 2000, // 2 seconds max to start export
    shortExport: 10000, // 10 seconds max for short export
    longExport: 60000, // 60 seconds max for long export
    uiResponse: 1000 // 1 second max UI response
  },

  testParams: {
    exportIterations: 3,
    memoryMonitoringInterval: 500, // Check memory every 500ms
    performanceTestTimeout: 120000, // 2 minutes timeout
    benchmarkIterations: 5
  },

  exportSettings: {
    lowQuality: {
      resolution: { width: 640, height: 480 },
      bitrate: 1000000,
      format: 'mp4'
    },
    mediumQuality: {
      resolution: { width: 1280, height: 720 },
      bitrate: 5000000,
      format: 'mp4'
    },
    highQuality: {
      resolution: { width: 1920, height: 1080 },
      bitrate: 10000000,
      format: 'mp4'
    }
  }
}

/**
 * Performance test scenarios
 */
export interface PerformanceScenario {
  name: string
  description: string
  setup: () => Promise<void>
  execute: () => Promise<any>
  cleanup: () => Promise<void>
  expectedDuration?: number // ms
  maxMemoryIncrease?: number // MB
}

export const PERFORMANCE_SCENARIOS: PerformanceScenario[] = [
  {
    name: 'baseline-memory',
    description: 'Measure baseline memory usage without any operations',
    setup: async () => {
      // Wait for page to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000))
    },
    execute: async () => {
      // Just wait and measure
      await new Promise(resolve => setTimeout(resolve, 1000))
    },
    cleanup: async () => {
      // No cleanup needed
    },
    expectedDuration: 1000,
    maxMemoryIncrease: 10
  },

  {
    name: 'timeline-creation',
    description: 'Measure performance of creating timeline with multiple elements',
    setup: async () => {
      // Setup for timeline creation
    },
    execute: async () => {
      // Create timeline with multiple elements
      // This would be implemented based on actual timeline API
    },
    cleanup: async () => {
      // Clear timeline
    },
    expectedDuration: 3000,
    maxMemoryIncrease: 50
  },

  {
    name: 'video-processing',
    description: 'Measure performance of video processing operations',
    setup: async () => {
      // Setup video processing
    },
    execute: async () => {
      // Process video
    },
    cleanup: async () => {
      // Cleanup video processing
    },
    expectedDuration: 5000,
    maxMemoryIncrease: 100
  },

  {
    name: 'export-low-quality',
    description: 'Measure performance of low quality export',
    setup: async () => {
      // Setup export with low quality settings
    },
    execute: async () => {
      // Execute low quality export
    },
    cleanup: async () => {
      // Cleanup export
    },
    expectedDuration: 10000,
    maxMemoryIncrease: 150
  },

  {
    name: 'export-high-quality',
    description: 'Measure performance of high quality export',
    setup: async () => {
      // Setup export with high quality settings
    },
    execute: async () => {
      // Execute high quality export
    },
    cleanup: async () => {
      // Cleanup export
    },
    expectedDuration: 30000,
    maxMemoryIncrease: 300
  },

  {
    name: 'memory-stress',
    description: 'Stress test memory usage with multiple operations',
    setup: async () => {
      // Setup stress test
    },
    execute: async () => {
      // Perform multiple memory-intensive operations
    },
    cleanup: async () => {
      // Cleanup stress test
    },
    expectedDuration: 15000,
    maxMemoryIncrease: 400
  }
]

/**
 * Performance metrics collection configuration
 */
export interface MetricsConfig {
  // Which metrics to collect
  collectMemory: boolean
  collectTiming: boolean
  collectNetwork: boolean
  collectFrameRate: boolean
  collectCPU: boolean

  // Collection intervals
  memoryInterval: number // ms
  timingInterval: number // ms
  networkInterval: number // ms

  // Retention settings
  maxSamples: number
  retentionTime: number // ms
}

export const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  collectMemory: true,
  collectTiming: true,
  collectNetwork: true,
  collectFrameRate: false, // Requires additional setup
  collectCPU: false, // Not available in browser

  memoryInterval: 1000,
  timingInterval: 100,
  networkInterval: 5000,

  maxSamples: 1000,
  retentionTime: 300000 // 5 minutes
}

/**
 * Performance alert configuration
 */
export interface AlertConfig {
  memoryAlerts: {
    enabled: boolean
    warningThreshold: number // MB
    criticalThreshold: number // MB
  }
  timingAlerts: {
    enabled: boolean
    slowOperationThreshold: number // ms
    timeoutThreshold: number // ms
  }
  errorAlerts: {
    enabled: boolean
    maxErrors: number
    timeWindow: number // ms
  }
}

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  memoryAlerts: {
    enabled: true,
    warningThreshold: 200, // 200MB
    criticalThreshold: 500 // 500MB
  },
  timingAlerts: {
    enabled: true,
    slowOperationThreshold: 5000, // 5 seconds
    timeoutThreshold: 30000 // 30 seconds
  },
  errorAlerts: {
    enabled: true,
    maxErrors: 5,
    timeWindow: 60000 // 1 minute
  }
}

/**
 * Environment-specific performance configurations
 */
export const ENVIRONMENT_CONFIGS = {
  development: {
    ...DEFAULT_PERFORMANCE_CONFIG,
    timingLimits: {
      ...DEFAULT_PERFORMANCE_CONFIG.timingLimits,
      // More lenient timing in development
      pageLoad: 10000,
      exportStart: 5000,
      shortExport: 20000,
      longExport: 120000
    }
  },

  ci: {
    ...DEFAULT_PERFORMANCE_CONFIG,
    timingLimits: {
      ...DEFAULT_PERFORMANCE_CONFIG.timingLimits,
      // Stricter timing in CI
      pageLoad: 3000,
      exportStart: 1000,
      shortExport: 8000,
      longExport: 45000
    },
    testParams: {
      ...DEFAULT_PERFORMANCE_CONFIG.testParams,
      // Fewer iterations in CI for speed
      exportIterations: 2,
      benchmarkIterations: 3
    }
  },

  production: {
    ...DEFAULT_PERFORMANCE_CONFIG,
    timingLimits: {
      ...DEFAULT_PERFORMANCE_CONFIG.timingLimits,
      // Production targets
      pageLoad: 2000,
      exportStart: 500,
      shortExport: 5000,
      longExport: 30000
    }
  }
}

/**
 * Get configuration for current environment
 */
export function getPerformanceConfig(): PerformanceTestConfig {
  const env = process.env.NODE_ENV || 'development'
  
  if (env === 'test' || process.env.CI) {
    return ENVIRONMENT_CONFIGS.ci
  }
  
  if (env === 'production') {
    return ENVIRONMENT_CONFIGS.production
  }
  
  return ENVIRONMENT_CONFIGS.development
}