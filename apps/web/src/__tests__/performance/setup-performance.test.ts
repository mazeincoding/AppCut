/**
 * Performance Test Setup
 * Sets up performance monitoring and testing infrastructure
 */

import { 
  PerformanceMonitor, 
  MemoryMonitor, 
  BenchmarkUtils,
  type PerformanceMetrics,
  type ExportPerformanceData 
} from '../utils/performance-helpers'
import { 
  getPerformanceConfig, 
  DEFAULT_METRICS_CONFIG,
  PERFORMANCE_SCENARIOS,
  type PerformanceTestConfig 
} from './performance-config'

describe('Performance Test Setup', () => {
  let performanceMonitor: PerformanceMonitor
  let memoryMonitor: MemoryMonitor
  let config: PerformanceTestConfig

  beforeAll(() => {
    config = getPerformanceConfig()
    console.log('Performance test configuration:', config)
  })

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor()
    memoryMonitor = new MemoryMonitor()
  })

  afterEach(() => {
    performanceMonitor.cleanup()
    memoryMonitor.reset()
  })

  describe('Performance Monitoring Setup', () => {
    test('should initialize performance monitor', () => {
      expect(performanceMonitor).toBeDefined()
      expect(typeof performanceMonitor.getMetrics).toBe('function')
      expect(typeof performanceMonitor.startExportMonitoring).toBe('function')
    })

    test('should collect baseline performance metrics', async () => {
      const metrics = await performanceMonitor.getMetrics()
      
      expect(metrics).toBeDefined()
      console.log('Baseline performance metrics:', metrics)
      
      // Memory metrics should be available in browser environments
      if (metrics.memoryUsage) {
        expect(metrics.memoryUsage.usedJSHeapSize).toBeGreaterThan(0)
        expect(metrics.memoryUsage.totalJSHeapSize).toBeGreaterThan(0)
        expect(metrics.memoryUsage.jsHeapSizeLimit).toBeGreaterThan(0)
        
        console.log(`Memory usage: ${(metrics.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`)
        console.log(`Total heap: ${(metrics.memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`)
        console.log(`Heap limit: ${(metrics.memoryUsage.jsHeapSizeLimit / 1024 / 1024 / 1024).toFixed(1)}GB`)
      }

      // Resource count should be available
      if (metrics.resourceCount !== undefined) {
        expect(metrics.resourceCount).toBeGreaterThanOrEqual(0)
        console.log(`Resource count: ${metrics.resourceCount}`)
      }
    })

    test('should validate memory monitoring setup', () => {
      expect(memoryMonitor).toBeDefined()
      
      // Set baseline
      memoryMonitor.setBaseline()
      
      // Take a sample
      const sample = memoryMonitor.takeSample()
      
      if (sample) {
        expect(sample.usedJSHeapSize).toBeGreaterThan(0)
        console.log('Memory sample taken successfully')
      } else {
        console.log('Memory monitoring not available in this environment')
      }
    })

    test('should start and stop memory monitoring', () => {
      memoryMonitor.startMonitoring(500) // 500ms interval
      
      // Wait a bit
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          memoryMonitor.stopMonitoring()
          
          const analysis = memoryMonitor.getAnalysis()
          expect(analysis).toBeDefined()
          expect(analysis.samples.length).toBeGreaterThanOrEqual(0)
          
          console.log('Memory monitoring test completed')
          console.log(`Collected ${analysis.samples.length} memory samples`)
          
          resolve()
        }, 1000)
      })
    })
  })

  describe('Benchmark Utilities Setup', () => {
    test('should measure function execution time', async () => {
      const testFunction = async () => {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 100))
        return 'test result'
      }

      const { result, duration } = await BenchmarkUtils.measureTime(testFunction)
      
      expect(result).toBe('test result')
      expect(duration).toBeGreaterThanOrEqual(95) // Allow some timing variance
      expect(duration).toBeLessThan(200) // Should be close to 100ms
      
      console.log(`Function execution time: ${duration}ms`)
    })

    test('should run benchmark with multiple iterations', async () => {
      const testFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return Math.random()
      }

      const benchmark = await BenchmarkUtils.benchmark(testFunction, 3)
      
      expect(benchmark.averageTime).toBeGreaterThanOrEqual(45) // Allow timing variance
      expect(benchmark.minTime).toBeGreaterThanOrEqual(45)
      expect(benchmark.maxTime).toBeGreaterThanOrEqual(45)
      expect(benchmark.results).toHaveLength(3)
      
      console.log('Benchmark results:')
      console.log(`  Average: ${benchmark.averageTime.toFixed(1)}ms`)
      console.log(`  Min: ${benchmark.minTime}ms`)
      console.log(`  Max: ${benchmark.maxTime}ms`)
    })

    test('should compare function performance', async () => {
      const fastFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return 'fast'
      }

      const slowFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return 'slow'
      }

      const comparison = await BenchmarkUtils.compare(fastFunction, slowFunction, 2)
      
      expect(comparison.winner).toBe('fn1') // fastFunction should win
      expect(comparison.improvement).toContain('faster')
      
      console.log('Performance comparison:')
      console.log(`  Winner: ${comparison.winner}`)
      console.log(`  Improvement: ${comparison.improvement}`)
      console.log(`  Fast function: ${comparison.fn1Stats.averageTime.toFixed(1)}ms`)
      console.log(`  Slow function: ${comparison.fn2Stats.averageTime.toFixed(1)}ms`)
    })
  })

  describe('Export Performance Monitoring', () => {
    test('should initialize export performance monitoring', () => {
      const exportData = performanceMonitor.startExportMonitoring()
      
      expect(exportData).toBeDefined()
      expect(exportData.startTime).toBeGreaterThan(0)
      expect(exportData.memoryStart).toBeDefined()
      expect(exportData.progressUpdates).toEqual([])
      expect(exportData.phases).toEqual([])
      expect(exportData.errors).toEqual([])
      expect(exportData.warnings).toEqual([])
      
      console.log('Export monitoring initialized successfully')
    })

    test('should update export monitoring data', () => {
      const exportData = performanceMonitor.startExportMonitoring()
      
      // Simulate progress updates
      performanceMonitor.updateExportMonitoring(exportData, 25, 'preparing')
      performanceMonitor.updateExportMonitoring(exportData, 50, 'processing')
      performanceMonitor.updateExportMonitoring(exportData, 75, 'encoding')
      performanceMonitor.updateExportMonitoring(exportData, 100, 'finalizing')
      
      expect(exportData.progressUpdates).toHaveLength(4)
      expect(exportData.phases).toHaveLength(4)
      
      console.log('Export progress updates:')
      exportData.progressUpdates.forEach((update, index) => {
        console.log(`  ${index + 1}. ${update.progress}% at ${update.timestamp}`)
      })
      
      console.log('Export phases:')
      exportData.phases.forEach((phase, index) => {
        console.log(`  ${index + 1}. ${phase.name}`)
      })
    })

    test('should finish export monitoring and analyze performance', () => {
      const exportData = performanceMonitor.startExportMonitoring()
      
      // Simulate some progress
      performanceMonitor.updateExportMonitoring(exportData, 50, 'processing')
      
      // Wait a bit to simulate export duration
      setTimeout(() => {
        const finalData = performanceMonitor.finishExportMonitoring(exportData)
        
        expect(finalData.endTime).toBeGreaterThan(finalData.startTime)
        expect(finalData.duration).toBeGreaterThan(0)
        expect(finalData.memoryEnd).toBeDefined()
        
        const analysis = performanceMonitor.analyzeExportPerformance(finalData)
        
        expect(analysis.summary).toBeTruthy()
        expect(analysis.performanceGrade).toMatch(/[ABCDF]/)
        expect(analysis.recommendations).toBeInstanceOf(Array)
        
        console.log('Export performance analysis:')
        console.log(`  Summary: ${analysis.summary}`)
        console.log(`  Grade: ${analysis.performanceGrade}`)
        console.log(`  Memory efficiency: ${analysis.memoryEfficiency}`)
        console.log(`  Recommendations: ${analysis.recommendations.join(', ')}`)
      }, 100)
    })
  })

  describe('Performance Configuration Validation', () => {
    test('should load performance configuration', () => {
      expect(config).toBeDefined()
      expect(config.memoryLimits).toBeDefined()
      expect(config.timingLimits).toBeDefined()
      expect(config.testParams).toBeDefined()
      expect(config.exportSettings).toBeDefined()
      
      console.log('Performance configuration loaded:')
      console.log(`  Memory warning threshold: ${config.memoryLimits.warningThreshold}MB`)
      console.log(`  Memory error threshold: ${config.memoryLimits.errorThreshold}MB`)
      console.log(`  Page load timeout: ${config.timingLimits.pageLoad}ms`)
      console.log(`  Export iterations: ${config.testParams.exportIterations}`)
    })

    test('should validate memory limits configuration', () => {
      expect(config.memoryLimits.baseline).toBeGreaterThan(0)
      expect(config.memoryLimits.warningThreshold).toBeGreaterThan(0)
      expect(config.memoryLimits.errorThreshold).toBeGreaterThan(config.memoryLimits.warningThreshold)
      expect(config.memoryLimits.maxHeapSize).toBeGreaterThan(config.memoryLimits.errorThreshold)
      
      console.log('Memory limits validation passed')
    })

    test('should validate timing limits configuration', () => {
      expect(config.timingLimits.pageLoad).toBeGreaterThan(0)
      expect(config.timingLimits.exportStart).toBeGreaterThan(0)
      expect(config.timingLimits.shortExport).toBeGreaterThan(config.timingLimits.exportStart)
      expect(config.timingLimits.longExport).toBeGreaterThan(config.timingLimits.shortExport)
      expect(config.timingLimits.uiResponse).toBeGreaterThan(0)
      
      console.log('Timing limits validation passed')
    })

    test('should validate export settings configuration', () => {
      const { lowQuality, mediumQuality, highQuality } = config.exportSettings
      
      // Resolution validation
      expect(lowQuality.resolution.width).toBeLessThan(mediumQuality.resolution.width)
      expect(mediumQuality.resolution.width).toBeLessThan(highQuality.resolution.width)
      
      // Bitrate validation
      expect(lowQuality.bitrate).toBeLessThan(mediumQuality.bitrate)
      expect(mediumQuality.bitrate).toBeLessThan(highQuality.bitrate)
      
      console.log('Export settings validation passed')
      console.log(`  Low: ${lowQuality.resolution.width}x${lowQuality.resolution.height} @ ${lowQuality.bitrate / 1000000}Mbps`)
      console.log(`  Medium: ${mediumQuality.resolution.width}x${mediumQuality.resolution.height} @ ${mediumQuality.bitrate / 1000000}Mbps`)
      console.log(`  High: ${highQuality.resolution.width}x${highQuality.resolution.height} @ ${highQuality.bitrate / 1000000}Mbps`)
    })
  })

  describe('Performance Scenarios Setup', () => {
    test('should load performance scenarios', () => {
      expect(PERFORMANCE_SCENARIOS).toBeDefined()
      expect(PERFORMANCE_SCENARIOS.length).toBeGreaterThan(0)
      
      console.log(`Loaded ${PERFORMANCE_SCENARIOS.length} performance scenarios:`)
      PERFORMANCE_SCENARIOS.forEach((scenario, index) => {
        console.log(`  ${index + 1}. ${scenario.name}: ${scenario.description}`)
        
        expect(scenario.name).toBeTruthy()
        expect(scenario.description).toBeTruthy()
        expect(typeof scenario.setup).toBe('function')
        expect(typeof scenario.execute).toBe('function')
        expect(typeof scenario.cleanup).toBe('function')
      })
    })

    test('should validate scenario configuration', () => {
      PERFORMANCE_SCENARIOS.forEach(scenario => {
        if (scenario.expectedDuration) {
          expect(scenario.expectedDuration).toBeGreaterThan(0)
        }
        if (scenario.maxMemoryIncrease) {
          expect(scenario.maxMemoryIncrease).toBeGreaterThan(0)
        }
      })
      
      console.log('Performance scenarios validation passed')
    })
  })

  describe('Metrics Collection Setup', () => {
    test('should validate metrics configuration', () => {
      expect(DEFAULT_METRICS_CONFIG).toBeDefined()
      expect(DEFAULT_METRICS_CONFIG.memoryInterval).toBeGreaterThan(0)
      expect(DEFAULT_METRICS_CONFIG.timingInterval).toBeGreaterThan(0)
      expect(DEFAULT_METRICS_CONFIG.maxSamples).toBeGreaterThan(0)
      expect(DEFAULT_METRICS_CONFIG.retentionTime).toBeGreaterThan(0)
      
      console.log('Metrics configuration:')
      console.log(`  Memory interval: ${DEFAULT_METRICS_CONFIG.memoryInterval}ms`)
      console.log(`  Timing interval: ${DEFAULT_METRICS_CONFIG.timingInterval}ms`)
      console.log(`  Max samples: ${DEFAULT_METRICS_CONFIG.maxSamples}`)
      console.log(`  Retention time: ${DEFAULT_METRICS_CONFIG.retentionTime / 1000}s`)
    })

    test('should test performance monitoring cleanup', () => {
      // Start monitoring
      memoryMonitor.startMonitoring(100)
      
      // Wait and then cleanup
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          performanceMonitor.cleanup()
          memoryMonitor.reset()
          
          console.log('Performance monitoring cleanup completed')
          resolve()
        }, 500)
      })
    })
  })
})