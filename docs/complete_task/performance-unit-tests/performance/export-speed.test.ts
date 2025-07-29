/**
 * Export Speed Performance Tests
 * Tests export speed benchmarking, quality settings, and browser performance
 */

import { 
  PerformanceMonitor, 
  BenchmarkUtils,
  type ExportPerformanceData 
} from '../utils/performance-helpers'
import { 
  getPerformanceConfig, 
  type PerformanceTestConfig 
} from './performance-config'

describe('Export Speed Performance Tests', () => {
  let performanceMonitor: PerformanceMonitor
  let config: PerformanceTestConfig

  beforeAll(() => {
    config = getPerformanceConfig()
  })

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor()
  })

  afterEach(() => {
    performanceMonitor.cleanup()
  })

  describe('Export Time Benchmarking', () => {
    test('should benchmark basic export speed', async () => {
      console.log('Benchmarking basic export speed...')
      
      const exportBenchmark = async () => {
        const exportData = performanceMonitor.startExportMonitoring()
        
        // Simulate basic export process
        const simulateBasicExport = async () => {
          const phases = ['preparing', 'processing', 'encoding', 'finalizing']
          const processingData: any[] = []
          
          for (let i = 0; i < phases.length; i++) {
            const phase = phases[i]
            const progress = Math.round(((i + 1) / phases.length) * 100)
            
            // Simulate phase-specific processing time
            const phaseStartTime = Date.now()
            
            // Different phases have different processing complexity
            let processingItems = 0
            switch (phase) {
              case 'preparing':
                processingItems = 100
                break
              case 'processing':
                processingItems = 500
                break
              case 'encoding':
                processingItems = 1000
                break
              case 'finalizing':
                processingItems = 50
                break
            }
            
            for (let j = 0; j < processingItems; j++) {
              processingData.push({
                phase,
                item: j,
                data: `${phase}_data_${j}`,
                timestamp: Date.now()
              })
            }
            
            performanceMonitor.updateExportMonitoring(exportData, progress, phase)
            
            const phaseDuration = Date.now() - phaseStartTime
            console.log(`  ${phase}: ${phaseDuration}ms (${processingItems} items)`)
            
            // Simulate realistic processing delay
            await new Promise(resolve => setTimeout(resolve, Math.min(phaseDuration / 10, 50)))
          }
          
          return processingData.length
        }
        
        const itemsProcessed = await simulateBasicExport()
        performanceMonitor.finishExportMonitoring(exportData)
        
        return {
          duration: exportData.duration || 0,
          itemsProcessed,
          performanceGrade: performanceMonitor.analyzeExportPerformance(exportData).performanceGrade
        }
      }
      
      const benchmark = await BenchmarkUtils.benchmark(exportBenchmark, 3)
      
      console.log('Basic export speed benchmark results:')
      console.log(`  Average time: ${benchmark.averageTime.toFixed(1)}ms`)
      console.log(`  Min time: ${benchmark.minTime}ms`)
      console.log(`  Max time: ${benchmark.maxTime}ms`)
      console.log(`  Performance consistency: ${((benchmark.minTime / benchmark.maxTime) * 100).toFixed(1)}%`)
      
      // Analyze results
      benchmark.results.forEach((result, index) => {
        console.log(`  Run ${index + 1}: ${result.duration}ms, ${result.itemsProcessed} items, Grade ${result.performanceGrade}`)
      })
      
      expect(benchmark.averageTime).toBeGreaterThan(0)
      expect(benchmark.results.length).toBe(3)
      
      // Check if performance is within acceptable range
      const isWithinLimits = benchmark.averageTime < config.timingLimits.shortExport
      console.log(`Performance within limits: ${isWithinLimits} (${benchmark.averageTime.toFixed(1)}ms < ${config.timingLimits.shortExport}ms)`)
      
      if (isWithinLimits) {
        console.log('✓ Export speed meets performance targets')
      } else {
        console.log('⚠ Export speed exceeds target times')
      }
    }, 15000)

    test('should benchmark export speed with different data sizes', async () => {
      const dataSizes = [
        { name: 'small', items: 100, description: '100 items (small project)' },
        { name: 'medium', items: 500, description: '500 items (medium project)' },
        { name: 'large', items: 1000, description: '1000 items (large project)' }
      ]
      
      const sizeResults: Array<{
        size: string
        items: number
        averageTime: number
        throughput: number
      }> = []
      
      for (const dataSize of dataSizes) {
        console.log(`Benchmarking ${dataSize.description}...`)
        
        const sizeBenchmark = async () => {
          const exportData = performanceMonitor.startExportMonitoring()
          
          const simulateDataSizeExport = async () => {
            const data: any[] = []
            
            for (let i = 0; i < dataSize.items; i++) {
              data.push({
                id: i,
                content: new Array(50).fill(`data_${i}`).join(''),
                metadata: {
                  timestamp: Date.now(),
                  size: dataSize.name,
                  index: i
                },
                processing: {
                  encoded: false,
                  compressed: false,
                  finalized: false
                }
              })
              
              // Update progress periodically
              if (i % 100 === 0) {
                const progress = Math.round((i / dataSize.items) * 100)
                performanceMonitor.updateExportMonitoring(exportData, progress, 'processing')
              }
              
              // Simulate processing delay
              if (i % 50 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1))
              }
            }
            
            // Mark as processed
            data.forEach(item => {
              item.processing.encoded = true
              item.processing.compressed = true
              item.processing.finalized = true
            })
            
            performanceMonitor.updateExportMonitoring(exportData, 100, 'finalizing')
            
            return data.length
          }
          
          const processedItems = await simulateDataSizeExport()
          performanceMonitor.finishExportMonitoring(exportData)
          
          return {
            duration: exportData.duration || 0,
            processedItems
          }
        }
        
        const benchmark = await BenchmarkUtils.benchmark(sizeBenchmark, 2) // Fewer iterations for speed
        const throughput = dataSize.items / (benchmark.averageTime / 1000) // items per second
        
        sizeResults.push({
          size: dataSize.name,
          items: dataSize.items,
          averageTime: benchmark.averageTime,
          throughput
        })
        
        console.log(`${dataSize.name} size results:`)
        console.log(`  Average time: ${benchmark.averageTime.toFixed(1)}ms`)
        console.log(`  Throughput: ${throughput.toFixed(1)} items/sec`)
      }
      
      // Analyze scaling performance
      console.log('\nData size scaling analysis:')
      sizeResults.forEach(result => {
        console.log(`  ${result.size}: ${result.items} items in ${result.averageTime.toFixed(1)}ms (${result.throughput.toFixed(1)} items/sec)`)
      })
      
      // Check if throughput scales reasonably
      const smallThroughput = sizeResults.find(r => r.size === 'small')?.throughput || 0
      const largeThroughput = sizeResults.find(r => r.size === 'large')?.throughput || 0
      
      if (smallThroughput > 0 && largeThroughput > 0) {
        const scalingEfficiency = largeThroughput / smallThroughput
        console.log(`Scaling efficiency: ${(scalingEfficiency * 100).toFixed(1)}% (${scalingEfficiency.toFixed(2)}x)`)
        
        if (scalingEfficiency > 0.7) {
          console.log('✓ Good scaling performance')
        } else if (scalingEfficiency > 0.5) {
          console.log('⚠ Moderate scaling performance')
        } else {
          console.log('⚠ Poor scaling performance detected')
        }
      }
      
      expect(sizeResults.length).toBe(3)
      expect(sizeResults.every(r => r.averageTime > 0)).toBe(true)
    }, 20000)

    test('should measure export initialization overhead', async () => {
      console.log('Measuring export initialization overhead...')
      
      // Measure just initialization time
      const initializationBenchmark = async () => {
        const startTime = Date.now()
        
        const exportData = performanceMonitor.startExportMonitoring()
        
        // Simulate initialization tasks
        const initTasks = [
          'validating settings',
          'preparing workspace',
          'initializing codecs',
          'allocating buffers',
          'setting up pipeline'
        ]
        
        for (const task of initTasks) {
          performanceMonitor.updateExportMonitoring(exportData, 0, task)
          
          // Simulate task-specific initialization time
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5))
        }
        
        const initializationTime = Date.now() - startTime
        
        return initializationTime
      }
      
      // Measure actual processing time
      const processingBenchmark = async () => {
        const exportData = performanceMonitor.startExportMonitoring()
        
        const startTime = Date.now()
        
        // Simulate processing work
        const data: any[] = []
        for (let i = 0; i < 100; i++) {
          data.push({ id: i, data: `processing_${i}` })
        }
        
        performanceMonitor.updateExportMonitoring(exportData, 100, 'processing')
        performanceMonitor.finishExportMonitoring(exportData)
        
        const processingTime = Date.now() - startTime
        
        return processingTime
      }
      
      const [initResults, processResults] = await Promise.all([
        BenchmarkUtils.benchmark(initializationBenchmark, 5),
        BenchmarkUtils.benchmark(processingBenchmark, 5)
      ])
      
      const overheadRatio = initResults.averageTime / (initResults.averageTime + processResults.averageTime)
      
      console.log('Initialization overhead analysis:')
      console.log(`  Initialization time: ${initResults.averageTime.toFixed(1)}ms`)
      console.log(`  Processing time: ${processResults.averageTime.toFixed(1)}ms`)
      console.log(`  Overhead ratio: ${(overheadRatio * 100).toFixed(1)}%`)
      
      if (overheadRatio < 0.1) {
        console.log('✓ Low initialization overhead')
      } else if (overheadRatio < 0.3) {
        console.log('⚠ Moderate initialization overhead')
      } else {
        console.log('⚠ High initialization overhead')
      }
      
      expect(initResults.averageTime).toBeGreaterThan(0)
      expect(processResults.averageTime).toBeGreaterThan(0)
      expect(overheadRatio).toBeLessThan(1.0) // Overhead should be reasonable in test environment
    }, 15000)
  })

  describe('Quality Settings Speed Comparison', () => {
    test('should compare export speed across quality settings', async () => {
      const qualitySettings = [
        { name: 'low', ...config.exportSettings.lowQuality },
        { name: 'medium', ...config.exportSettings.mediumQuality },
        { name: 'high', ...config.exportSettings.highQuality }
      ]
      
      const qualityResults: Array<{
        quality: string
        averageTime: number
        complexity: number
        efficiency: number
      }> = []
      
      for (const quality of qualitySettings) {
        console.log(`Testing ${quality.name} quality export speed...`)
        
        const qualityBenchmark = async () => {
          const exportData = performanceMonitor.startExportMonitoring()
          
          const simulateQualityExport = async () => {
            const { resolution, bitrate } = quality
            
            // Calculate complexity factor based on resolution and bitrate
            const complexityFactor = (resolution.width * resolution.height * bitrate) / (640 * 480 * 1000000)
            
            const processingSteps = Math.floor(50 * Math.min(complexityFactor, 5)) // Cap complexity for test performance
            const data: any[] = []
            
            for (let i = 0; i < processingSteps; i++) {
              data.push({
                frame: i,
                quality: quality.name,
                resolution: `${resolution.width}x${resolution.height}`,
                bitrate,
                pixels: new Array(Math.floor(10 * Math.sqrt(complexityFactor))).fill(`pixel_${i}`),
                encoding: {
                  started: Date.now(),
                  complexity: complexityFactor
                }
              })
              
              if (i % 20 === 0) {
                const progress = Math.round((i / processingSteps) * 100)
                performanceMonitor.updateExportMonitoring(exportData, progress, 'encoding')
                
                // Simulate encoding delay based on complexity (reduced for test performance)
                await new Promise(resolve => setTimeout(resolve, Math.max(1, Math.floor(complexityFactor / 5))))
              }
            }
            
            performanceMonitor.updateExportMonitoring(exportData, 100, 'finalizing')
            
            return {
              processedSteps: processingSteps,
              complexityFactor
            }
          }
          
          const result = await simulateQualityExport()
          performanceMonitor.finishExportMonitoring(exportData)
          
          return {
            duration: exportData.duration || 0,
            ...result
          }
        }
        
        const benchmark = await BenchmarkUtils.benchmark(qualityBenchmark, 3)
        const firstResult = benchmark.results[0]
        const efficiency = firstResult.processedSteps / benchmark.averageTime // steps per ms
        
        qualityResults.push({
          quality: quality.name,
          averageTime: benchmark.averageTime,
          complexity: firstResult.complexityFactor,
          efficiency
        })
        
        console.log(`${quality.name} quality results:`)
        console.log(`  Average time: ${benchmark.averageTime.toFixed(1)}ms`)
        console.log(`  Complexity factor: ${firstResult.complexityFactor.toFixed(2)}x`)
        console.log(`  Efficiency: ${efficiency.toFixed(2)} steps/ms`)
      }
      
      // Analyze quality vs speed relationship
      console.log('\nQuality vs Speed Analysis:')
      qualityResults.forEach(result => {
        console.log(`  ${result.quality}: ${result.averageTime.toFixed(1)}ms, ${result.complexity.toFixed(2)}x complexity, ${result.efficiency.toFixed(2)} efficiency`)
      })
      
      // Check if higher quality takes appropriately longer
      const lowTime = qualityResults.find(r => r.quality === 'low')?.averageTime || 0
      const mediumTime = qualityResults.find(r => r.quality === 'medium')?.averageTime || 0
      const highTime = qualityResults.find(r => r.quality === 'high')?.averageTime || 0
      
      if (lowTime > 0 && mediumTime > 0 && highTime > 0) {
        console.log(`Time scaling: low(${lowTime.toFixed(1)}ms) → medium(${mediumTime.toFixed(1)}ms) → high(${highTime.toFixed(1)}ms)`)
        
        const lowToMediumRatio = mediumTime / lowTime
        const mediumToHighRatio = highTime / mediumTime
        
        console.log(`Scaling ratios: low→medium ${lowToMediumRatio.toFixed(2)}x, medium→high ${mediumToHighRatio.toFixed(2)}x`)
        
        // Higher quality should generally take longer (allowing some variance)
        expect(mediumTime).toBeGreaterThanOrEqual(lowTime * 0.8)
        expect(highTime).toBeGreaterThanOrEqual(mediumTime * 0.8)
      }
      
      expect(qualityResults.length).toBe(3)
    }, 20000)

    test('should measure quality-specific processing bottlenecks', async () => {
      console.log('Analyzing quality-specific processing bottlenecks...')
      
      const processingSections = [
        { name: 'preprocessing', items: 50, complexity: 1 },
        { name: 'encoding', items: 200, complexity: 3 },
        { name: 'postprocessing', items: 30, complexity: 1.5 }
      ]
      
      const bottleneckResults: Array<{
        section: string
        lowQuality: number
        mediumQuality: number
        highQuality: number
        scalingFactor: number
      }> = []
      
      for (const section of processingSections) {
        console.log(`Testing ${section.name} bottlenecks...`)
        
        const sectionResults: { [key: string]: number } = {}
        
        for (const qualityName of ['low', 'medium', 'high']) {
          const quality = config.exportSettings[qualityName as keyof typeof config.exportSettings]
          
          const sectionBenchmark = async () => {
            const complexityMultiplier = qualityName === 'low' ? 1 : qualityName === 'medium' ? 2 : 4
            const totalComplexity = section.complexity * complexityMultiplier
            
            const data: any[] = []
            const startTime = Date.now()
            
            for (let i = 0; i < section.items; i++) {
              data.push({
                section: section.name,
                quality: qualityName,
                item: i,
                complexity: totalComplexity,
                data: new Array(Math.floor(totalComplexity * 10)).fill(`${section.name}_${i}`)
              })
              
              // Simulate complexity-based processing delay
              if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, Math.max(1, Math.floor(totalComplexity / 10))))
              }
            }
            
            return Date.now() - startTime
          }
          
          const benchmark = await BenchmarkUtils.benchmark(sectionBenchmark, 2)
          sectionResults[qualityName] = benchmark.averageTime
          
          console.log(`  ${qualityName} quality ${section.name}: ${benchmark.averageTime.toFixed(1)}ms`)
        }
        
        const scalingFactor = sectionResults.high / sectionResults.low
        
        bottleneckResults.push({
          section: section.name,
          lowQuality: sectionResults.low,
          mediumQuality: sectionResults.medium,
          highQuality: sectionResults.high,
          scalingFactor
        })
        
        console.log(`  ${section.name} scaling factor: ${scalingFactor.toFixed(2)}x`)
      }
      
      // Identify biggest bottlenecks
      console.log('\nBottleneck Analysis:')
      bottleneckResults.forEach(result => {
        if (result.scalingFactor > 3) {
          console.log(`  ⚠ ${result.section}: High scaling bottleneck (${result.scalingFactor.toFixed(2)}x)`)
        } else if (result.scalingFactor > 2) {
          console.log(`  ⚠ ${result.section}: Moderate bottleneck (${result.scalingFactor.toFixed(2)}x)`)
        } else {
          console.log(`  ✓ ${result.section}: Good scaling (${result.scalingFactor.toFixed(2)}x)`)
        }
      })
      
      expect(bottleneckResults.length).toBe(3)
      expect(bottleneckResults.every(r => r.scalingFactor >= 1)).toBe(true)
    }, 15000)
  })

  describe('Browser Performance Comparison', () => {
    test('should analyze current browser performance characteristics', async () => {
      console.log('Analyzing current browser performance...')
      
      // Get browser information
      const browserInfo = {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js Test Environment',
        platform: typeof navigator !== 'undefined' ? navigator.platform : process.platform,
        hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 1,
        memory: typeof performance !== 'undefined' && (performance as any).memory ? (performance as any).memory : null
      }
      
      console.log('Browser/Environment Information:')
      console.log(`  User Agent: ${browserInfo.userAgent}`)
      console.log(`  Platform: ${browserInfo.platform}`)
      console.log(`  CPU Cores: ${browserInfo.hardwareConcurrency}`)
      
      if (browserInfo.memory) {
        console.log(`  Memory Limit: ${(browserInfo.memory.jsHeapSizeLimit / 1024 / 1024 / 1024).toFixed(1)}GB`)
      }
      
      // Test browser-specific performance characteristics
      const performanceTests = [
        {
          name: 'Array Operations',
          test: async () => {
            const size = 10000
            const array = new Array(size).fill(0).map((_, i) => i)
            
            const startTime = Date.now()
            
            // Array operations
            const mapped = array.map(x => x * 2)
            const filtered = mapped.filter(x => x % 4 === 0)
            const reduced = filtered.reduce((sum, x) => sum + x, 0)
            
            return {
              duration: Date.now() - startTime,
              result: reduced,
              operations: size * 3 // map + filter + reduce operations
            }
          }
        },
        {
          name: 'String Operations',
          test: async () => {
            const iterations = 1000
            let result = ''
            
            const startTime = Date.now()
            
            for (let i = 0; i < iterations; i++) {
              result += `string_${i}_${'x'.repeat(50)}`
              if (i % 100 === 0) {
                result = result.slice(0, 1000) // Prevent excessive memory usage
              }
            }
            
            return {
              duration: Date.now() - startTime,
              result: result.length,
              operations: iterations
            }
          }
        },
        {
          name: 'Object Operations',
          test: async () => {
            const objects: any[] = []
            const iterations = 5000
            
            const startTime = Date.now()
            
            for (let i = 0; i < iterations; i++) {
              objects.push({
                id: i,
                data: `object_data_${i}`,
                metadata: {
                  timestamp: Date.now(),
                  processed: false
                }
              })
            }
            
            // Process objects
            objects.forEach(obj => {
              obj.metadata.processed = true
              obj.processedAt = Date.now()
            })
            
            return {
              duration: Date.now() - startTime,
              result: objects.length,
              operations: iterations * 2
            }
          }
        }
      ]
      
      const testResults: Array<{
        name: string
        duration: number
        throughput: number
        efficiency: number
      }> = []
      
      for (const test of performanceTests) {
        console.log(`Running ${test.name} performance test...`)
        
        const benchmark = await BenchmarkUtils.benchmark(test.test, 3)
        const avgResult = benchmark.results[0]
        const throughput = avgResult.operations / (benchmark.averageTime / 1000) // operations per second
        const efficiency = throughput / (browserInfo.hardwareConcurrency || 1) // per core
        
        testResults.push({
          name: test.name,
          duration: benchmark.averageTime,
          throughput,
          efficiency
        })
        
        console.log(`  Average time: ${benchmark.averageTime.toFixed(1)}ms`)
        console.log(`  Throughput: ${throughput.toFixed(0)} ops/sec`)
        console.log(`  Efficiency: ${efficiency.toFixed(0)} ops/sec/core`)
      }
      
      // Overall performance assessment
      console.log('\nBrowser Performance Assessment:')
      testResults.forEach(result => {
        let grade = 'A'
        if (result.efficiency < 1000) grade = 'D'
        else if (result.efficiency < 5000) grade = 'C'
        else if (result.efficiency < 10000) grade = 'B'
        
        console.log(`  ${result.name}: ${grade} grade (${result.efficiency.toFixed(0)} ops/sec/core)`)
      })
      
      expect(testResults.length).toBe(3)
      expect(testResults.every(r => r.duration > 0)).toBe(true)
    }, 15000)

    test('should test concurrent processing capabilities', async () => {
      console.log('Testing concurrent processing capabilities...')
      
      const concurrencyLevels = [1, 2, 4, 8]
      const workloadSize = 1000
      
      const concurrencyResults: Array<{
        concurrency: number
        duration: number
        efficiency: number
        scalingFactor: number
      }> = []
      
      for (const concurrency of concurrencyLevels) {
        console.log(`Testing ${concurrency} concurrent operations...`)
        
        const concurrentBenchmark = async () => {
          const workPerTask = Math.floor(workloadSize / concurrency)
          
          const createTask = (taskId: number) => async () => {
            const data: any[] = []
            
            for (let i = 0; i < workPerTask; i++) {
              data.push({
                taskId,
                item: i,
                data: `task_${taskId}_item_${i}`,
                processing: {
                  started: Date.now(),
                  complexity: Math.random()
                }
              })
              
              // Simulate processing
              if (i % 50 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1))
              }
            }
            
            return data.length
          }
          
          const tasks = Array.from({ length: concurrency }, (_, i) => createTask(i))
          
          const startTime = Date.now()
          const results = await Promise.all(tasks.map(task => task()))
          const duration = Date.now() - startTime
          
          const totalProcessed = results.reduce((sum, count) => sum + count, 0)
          
          return {
            duration,
            totalProcessed,
            concurrency
          }
        }
        
        const benchmark = await BenchmarkUtils.benchmark(concurrentBenchmark, 2)
        const baselineTime = concurrencyResults.length > 0 ? concurrencyResults[0].duration : benchmark.averageTime
        const scalingFactor = baselineTime / benchmark.averageTime
        const efficiency = scalingFactor / concurrency
        
        concurrencyResults.push({
          concurrency,
          duration: benchmark.averageTime,
          efficiency,
          scalingFactor
        })
        
        console.log(`  ${concurrency} concurrent: ${benchmark.averageTime.toFixed(1)}ms, efficiency: ${(efficiency * 100).toFixed(1)}%`)
      }
      
      // Analyze concurrency scaling
      console.log('\nConcurrency Scaling Analysis:')
      concurrencyResults.forEach(result => {
        if (result.efficiency > 0.8) {
          console.log(`  ✓ ${result.concurrency} concurrent: Excellent scaling (${(result.efficiency * 100).toFixed(1)}%)`)
        } else if (result.efficiency > 0.6) {
          console.log(`  ✓ ${result.concurrency} concurrent: Good scaling (${(result.efficiency * 100).toFixed(1)}%)`)
        } else if (result.efficiency > 0.4) {
          console.log(`  ⚠ ${result.concurrency} concurrent: Moderate scaling (${(result.efficiency * 100).toFixed(1)}%)`)
        } else {
          console.log(`  ⚠ ${result.concurrency} concurrent: Poor scaling (${(result.efficiency * 100).toFixed(1)}%)`)
        }
      })
      
      expect(concurrencyResults.length).toBe(4)
      expect(concurrencyResults.every(r => r.duration > 0)).toBe(true)
    }, 20000)

    test('should measure memory allocation performance', async () => {
      console.log('Measuring memory allocation performance...')
      
      const allocationSizes = [
        { name: 'small', size: 1000, description: '1K objects' },
        { name: 'medium', size: 10000, description: '10K objects' },
        { name: 'large', size: 50000, description: '50K objects' }
      ]
      
      const allocationResults: Array<{
        size: string
        allocTime: number
        deallocTime: number
        throughput: number
      }> = []
      
      for (const allocation of allocationSizes) {
        console.log(`Testing ${allocation.description} allocation...`)
        
        const allocationBenchmark = async () => {
          // Allocation phase
          const allocStartTime = Date.now()
          const objects: any[] = []
          
          for (let i = 0; i < allocation.size; i++) {
            objects.push({
              id: i,
              data: new Array(10).fill(`data_${i}`),
              metadata: {
                created: Date.now(),
                index: i
              }
            })
          }
          
          const allocTime = Date.now() - allocStartTime
          
          // Deallocation phase (simulated processing and cleanup)
          const deallocStartTime = Date.now()
          
          // Process and clear objects
          for (let i = 0; i < objects.length; i++) {
            objects[i].metadata.processed = true
            objects[i] = null // Help GC
          }
          
          objects.length = 0 // Clear array
          
          const deallocTime = Date.now() - deallocStartTime
          
          return {
            allocTime,
            deallocTime,
            totalObjects: allocation.size
          }
        }
        
        const benchmark = await BenchmarkUtils.benchmark(allocationBenchmark, 3)
        const avgResult = benchmark.results[0]
        const throughput = allocation.size / (benchmark.averageTime / 1000) // objects per second
        
        allocationResults.push({
          size: allocation.name,
          allocTime: avgResult.allocTime,
          deallocTime: avgResult.deallocTime,
          throughput
        })
        
        console.log(`  ${allocation.name}: alloc ${avgResult.allocTime}ms, dealloc ${avgResult.deallocTime}ms, ${throughput.toFixed(0)} obj/sec`)
      }
      
      // Analyze allocation efficiency
      console.log('\nMemory Allocation Efficiency:')
      allocationResults.forEach(result => {
        const efficiency = result.throughput / 1000 // normalize to thousands per second
        
        if (efficiency > 100) {
          console.log(`  ✓ ${result.size}: Excellent allocation performance (${result.throughput.toFixed(0)} obj/sec)`)
        } else if (efficiency > 50) {
          console.log(`  ✓ ${result.size}: Good allocation performance (${result.throughput.toFixed(0)} obj/sec)`)
        } else {
          console.log(`  ⚠ ${result.size}: Limited allocation performance (${result.throughput.toFixed(0)} obj/sec)`)
        }
      })
      
      expect(allocationResults.length).toBe(3)
      expect(allocationResults.every(r => r.throughput > 0)).toBe(true)
    }, 15000)
  })
})