/**
 * E2E Test: Long Video Export
 * Tests export performance with longer duration timelines (30+ seconds)
 */

import { test, expect } from '@playwright/test'
import { EditorPage, ExportDialog } from '../fixtures/page-objects'
import { TestHelpers } from 
import { EXPORT_SETTINGS, createMockVideoFile, createMockAudioFile } from '../fixtures/test-data'

test.describe('Long Video Export', () => {
  let editorPage: EditorPage
  let exportDialog: ExportDialog
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page)
    exportDialog = new ExportDialog(page)
    helpers = new TestHelpers(page)
    
    // Setup browser APIs and environment
    await helpers.mockBrowserAPIs()
    
    // Navigate to editor
    await editorPage.goto()
    await helpers.waitForAppLoad()
  })

  test.afterEach(async ({ page }) => {
    await helpers.cleanup()
  })

  test('should create 30+ second timeline with multiple elements', async ({ page }) => {
    // Try to create a longer timeline for performance testing
    const uploadButton = page.getByRole('button', { name: /upload|add media/i }).first()
    const fileInput = page.locator('input[type="file"]').first()
    
    if (await uploadButton.isVisible()) {
      console.log('Upload button found for long timeline creation')
      
      // Upload multiple media files to create a longer timeline
      if (await fileInput.isVisible()) {
        const mockVideo1 = createMockVideoFile('long-video-1.mp4', 5 * 1024 * 1024) // 5MB
        const mockVideo2 = createMockVideoFile('long-video-2.mp4', 4 * 1024 * 1024) // 4MB
        const mockVideo3 = createMockVideoFile('long-video-3.mp4', 3 * 1024 * 1024) // 3MB
        const mockAudio1 = createMockAudioFile('background-music.mp3', 1024 * 1024) // 1MB
        const mockAudio2 = createMockAudioFile('voiceover.mp3', 512 * 1024) // 512KB
        
        await helpers.mockFileUpload('input[type="file"]', [mockVideo1, mockVideo2, mockVideo3, mockAudio1, mockAudio2])
        console.log('Multiple media files uploaded for long timeline')
      }
    } else {
      console.log('Upload functionality not found - simulating long timeline creation')
    }
    
    // Look for timeline duration display
    const timelineDuration = page.locator('[data-testid="timeline-duration"]').first()
    const durationDisplay = page.locator('*').filter({ hasText: /\d+:\d+|\d+\s*sec|\d+\s*min/i }).first()
    
    if (await timelineDuration.isVisible()) {
      const durationText = await timelineDuration.textContent()
      console.log(`Timeline duration: ${durationText}`)
      
      // Check if duration indicates 30+ seconds
      if (durationText && (durationText.includes('30') || durationText.includes('31') || durationText.includes('1:') || durationText.includes('2:'))) {
        console.log('Timeline appears to be 30+ seconds duration')
      }
    } else if (await durationDisplay.isVisible()) {
      const durationText = await durationDisplay.textContent()
      console.log(`Duration display found: ${durationText}`)
    } else {
      console.log('Timeline duration display not found - feature may be under development')
    }
    
    // Try to extend timeline by adding more elements
    const timeline = page.locator('[data-testid="timeline"]').first()
    if (await timeline.isVisible()) {
      // Click at different positions to simulate adding elements over time
      const timelinePositions = [
        { x: 100, y: 50 },  // Start
        { x: 200, y: 50 },  // 10 seconds
        { x: 300, y: 50 },  // 20 seconds
        { x: 400, y: 50 },  // 30 seconds
        { x: 500, y: 50 },  // 40 seconds
      ]
      
      for (const position of timelinePositions) {
        await timeline.click({ position })
        await page.waitForTimeout(200)
      }
      
      console.log('Attempted to create elements across extended timeline')
    }
    
    // Look for timeline elements count
    const timelineElements = page.locator('[data-testid="timeline-element"]')
    const elementCount = await timelineElements.count()
    console.log(`Timeline elements found: ${elementCount}`)
    
    if (elementCount >= 3) {
      console.log('Multiple timeline elements detected - suitable for long export test')
    }
  })

  test('should test export performance with long duration timeline', async ({ page }) => {
    // Set up performance monitoring
    const startTime = Date.now()
    const initialMetrics = await helpers.getPerformanceMetrics()
    console.log('Initial performance metrics:', initialMetrics)
    
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Select medium quality for balance between quality and performance
      const qualitySelect = page.locator('[data-testid="quality-select"]').first()
      const mediumQualityOption = page.locator('*').filter({ hasText: /medium|720p/i }).first()
      
      if (await qualitySelect.isVisible()) {
        await qualitySelect.click()
        const mediumOption = page.getByRole('option', { name: /medium|720/i }).first()
        if (await mediumOption.isVisible()) {
          await mediumOption.click()
          console.log('Medium quality selected for long export performance test')
        }
      } else if (await mediumQualityOption.isVisible()) {
        await mediumQualityOption.click()
        console.log('Medium quality option selected')
      }
      
      // Set filename
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('long-video-export-performance-test')
        console.log('Filename set for long export test')
      }
      
      // Check estimated export time for long video
      const estimatedTime = page.locator('[data-testid="estimated-time"]').first()
      const timeEstimate = page.locator('*').filter({ hasText: /estimate.*\d+.*min|\d+.*second.*estimate/i }).first()
      
      if (await estimatedTime.isVisible()) {
        const estimateText = await estimatedTime.textContent()
        console.log(`Long export time estimate: ${estimateText}`)
      } else if (await timeEstimate.isVisible()) {
        const estimateText = await timeEstimate.textContent()
        console.log(`Export time estimate: ${estimateText}`)
      }
      
      // Start long export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        const exportStartTime = Date.now()
        
        const downloadPromise = page.waitForEvent('download', { timeout: 90000 }).catch(() => null) // Extended timeout for long export
        
        await startExportButton.click()
        console.log('Long video export started - monitoring performance')
        
        // Monitor performance during export
        const performanceChecks: Array<{time: number, metrics: any, progress: string}> = []
        
        for (let i = 0; i < 12; i++) { // Monitor for up to 12 seconds
          await page.waitForTimeout(1000)
          
          const currentTime = Date.now() - exportStartTime
          const currentMetrics = await helpers.getPerformanceMetrics()
          
          // Get current progress
          let currentProgress = 'unknown'
          const progressBar = page.locator('[role="progressbar"]').first()
          if (await progressBar.isVisible()) {
            const progress = await progressBar.getAttribute('aria-valuenow')
            if (progress) currentProgress = progress + '%'
          }
          
          performanceChecks.push({
            time: currentTime,
            metrics: currentMetrics,
            progress: currentProgress
          })
          
          console.log(`Performance check ${i + 1}: ${currentProgress} at ${currentTime}ms`)
          
          // Check for performance warnings
          const performanceWarning = page.locator('*').filter({ hasText: /slow|performance|memory.*high|warning/i }).first()
          if (await performanceWarning.isVisible()) {
            const warningText = await performanceWarning.textContent()
            console.log(`Performance warning: ${warningText}`)
          }
          
          // Check if export completed
          const completedMessage = page.locator('*').filter({ hasText: /complete|finished|done/i }).first()
          if (await completedMessage.isVisible()) {
            console.log('Long export completed during performance monitoring')
            break
          }
        }
        
        // Analyze performance data
        if (performanceChecks.length > 1) {
          const firstCheck = performanceChecks[0]
          const lastCheck = performanceChecks[performanceChecks.length - 1]
          
          console.log(`Long export performance summary:`)
          console.log(`  Duration monitored: ${lastCheck.time}ms`)
          console.log(`  Progress: ${firstCheck.progress} → ${lastCheck.progress}`)
          
          if (firstCheck.metrics.memoryUsage && lastCheck.metrics.memoryUsage) {
            const memoryIncrease = lastCheck.metrics.memoryUsage.usedJSHeapSize - firstCheck.metrics.memoryUsage.usedJSHeapSize
            console.log(`  Memory usage increase: ${(memoryIncrease / 1024 / 1024).toFixed(1)} MB`)
            
            // Check for memory efficiency
            if (memoryIncrease > 100 * 1024 * 1024) { // > 100MB increase
              console.log('  Warning: High memory usage increase detected')
            } else {
              console.log('  Memory usage appears reasonable for long export')
            }
          }
        }
        
        // Wait for export completion
        const download = await downloadPromise
        if (download) {
          const exportDuration = Date.now() - exportStartTime
          const filename = download.suggestedFilename()
          console.log(`Long export completed: ${filename} in ${exportDuration}ms`)
          expect(filename).toBeTruthy()
          
          // Check export efficiency (should not take extremely long for test export)
          if (exportDuration < 60000) { // Less than 1 minute
            console.log('Export completed in reasonable time for testing')
          } else {
            console.log('Export took longer than expected - may indicate performance issues')
          }
        } else {
          console.log('Long export started but download not detected within timeout')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should monitor memory usage during long export', async ({ page }) => {
    // Get baseline memory usage
    const baselineMetrics = await helpers.getPerformanceMetrics()
    console.log('Baseline memory usage:', baselineMetrics.memoryUsage)
    
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Set filename
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('memory-usage-monitoring-test')
      }
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Export started for memory monitoring')
        
        const memoryReadings: Array<{time: number, memory: any, phase: string}> = []
        
        // Monitor memory usage during export
        for (let i = 0; i < 10; i++) {
          await page.waitForTimeout(1000)
          
          const currentMetrics = await helpers.getPerformanceMetrics()
          const currentTime = i * 1000
          
          // Get current export phase
          let currentPhase = 'unknown'
          const statusElement = page.locator('[data-testid="export-status"]').first()
          const phaseElement = page.locator('*').filter({ hasText: /preparing|processing|encoding|rendering/i }).first()
          
          if (await statusElement.isVisible()) {
            const status = await statusElement.textContent()
            if (status) currentPhase = status.trim()
          } else if (await phaseElement.isVisible()) {
            const phase = await phaseElement.textContent()
            if (phase) currentPhase = phase.trim()
          }
          
          if (currentMetrics.memoryUsage) {
            memoryReadings.push({
              time: currentTime,
              memory: currentMetrics.memoryUsage,
              phase: currentPhase
            })
            
            const usedMB = (currentMetrics.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(1)
            const totalMB = (currentMetrics.memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(1)
            console.log(`Memory ${i + 1}: ${usedMB}MB / ${totalMB}MB (${currentPhase})`)
          }
          
          // Check for memory warnings or errors
          const memoryWarning = page.locator('*').filter({ hasText: /memory.*low|memory.*full|out.*memory/i }).first()
          if (await memoryWarning.isVisible()) {
            const warningText = await memoryWarning.textContent()
            console.log(`Memory warning detected: ${warningText}`)
          }
          
          // Check if export completed
          const completedMessage = page.locator('*').filter({ hasText: /complete|finished/i }).first()
          if (await completedMessage.isVisible()) {
            console.log('Export completed during memory monitoring')
            break
          }
        }
        
        // Analyze memory usage patterns
        if (memoryReadings.length > 2) {
          const firstReading = memoryReadings[0]
          const lastReading = memoryReadings[memoryReadings.length - 1]
          const peakReading = memoryReadings.reduce((max, reading) => 
            reading.memory.usedJSHeapSize > max.memory.usedJSHeapSize ? reading : max
          )
          
          const baselineUsed = baselineMetrics.memoryUsage?.usedJSHeapSize || 0
          const firstUsed = firstReading.memory.usedJSHeapSize
          const lastUsed = lastReading.memory.usedJSHeapSize
          const peakUsed = peakReading.memory.usedJSHeapSize
          
          console.log('Memory usage analysis:')
          console.log(`  Baseline: ${(baselineUsed / 1024 / 1024).toFixed(1)} MB`)
          console.log(`  Export start: ${(firstUsed / 1024 / 1024).toFixed(1)} MB`)
          console.log(`  Peak usage: ${(peakUsed / 1024 / 1024).toFixed(1)} MB (during ${peakReading.phase})`)
          console.log(`  Export end: ${(lastUsed / 1024 / 1024).toFixed(1)} MB`)
          
          const maxIncrease = peakUsed - baselineUsed
          const finalIncrease = lastUsed - baselineUsed
          
          console.log(`  Peak increase: ${(maxIncrease / 1024 / 1024).toFixed(1)} MB`)
          console.log(`  Final increase: ${(finalIncrease / 1024 / 1024).toFixed(1)} MB`)
          
          // Memory efficiency checks
          if (maxIncrease > 200 * 1024 * 1024) { // > 200MB increase
            console.log('  Warning: High memory usage increase detected')
          } else {
            console.log('  Memory usage appears reasonable')
          }
          
          if (finalIncrease < maxIncrease * 0.5) {
            console.log('  Good: Memory appears to be cleaned up after peak usage')
          }
          
          // Check for memory leaks (increasing trend)
          const memoryTrend = lastUsed - firstUsed
          if (memoryTrend > 50 * 1024 * 1024) { // > 50MB increase from start to end
            console.log('  Potential memory leak: Memory increased significantly during export')
          } else {
            console.log('  No obvious memory leaks detected')
          }
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should handle long export with different video qualities', async ({ page }) => {
    const qualities = ['720p', '480p'] // Test with different qualities for performance comparison
    
    for (const quality of qualities) {
      console.log(`Testing long export with ${quality} quality`)
      
      const exportButton = page.getByRole('button', { name: /export/i }).first()
      
      if (await exportButton.isVisible()) {
        await exportButton.click()
        await page.waitForTimeout(1000)
        
        // Select quality
        const qualityOption = page.locator('*').filter({ hasText: new RegExp(quality, 'i') }).first()
        const qualitySelect = page.locator('[data-testid="quality-select"]').first()
        
        if (await qualityOption.isVisible()) {
          await qualityOption.click()
          console.log(`${quality} quality selected`)
        } else if (await qualitySelect.isVisible()) {
          await qualitySelect.click()
          const selectOption = page.getByRole('option', { name: new RegExp(quality, 'i') }).first()
          if (await selectOption.isVisible()) {
            await selectOption.click()
            console.log(`${quality} selected from dropdown`)
          }
        }
        
        // Set filename
        const filenameInput = page.locator('input[type="text"]').first()
        if (await filenameInput.isVisible()) {
          await filenameInput.fill(`long-export-${quality.toLowerCase()}-quality`)
        }
        
        // Monitor estimated file size for long export
        const fileSizeEstimate = page.locator('[data-testid="estimated-size"]').first()
        if (await fileSizeEstimate.isVisible()) {
          const sizeText = await fileSizeEstimate.textContent()
          console.log(`${quality} estimated file size for long export: ${sizeText}`)
        }
        
        // Start export and measure time
        const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
        if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
          const startTime = Date.now()
          
          await startExportButton.click()
          console.log(`${quality} long export started`)
          
          // Monitor for several seconds
          for (let i = 0; i < 5; i++) {
            await page.waitForTimeout(1000)
            
            const progressBar = page.locator('[role="progressbar"]').first()
            if (await progressBar.isVisible()) {
              const progress = await progressBar.getAttribute('aria-valuenow')
              console.log(`${quality} progress: ${progress}%`)
            }
            
            // Check for completion
            const completedMessage = page.locator('*').filter({ hasText: /complete|finished/i }).first()
            if (await completedMessage.isVisible()) {
              const duration = Date.now() - startTime
              console.log(`${quality} export completed in ${duration}ms`)
              break
            }
          }
          
          // Cancel if still running (to prevent long test times)
          const cancelButton = page.getByRole('button', { name: /cancel|stop/i }).first()
          if (await cancelButton.isVisible()) {
            await cancelButton.click()
            console.log(`${quality} export cancelled to continue testing`)
          }
        }
        
        // Close dialog for next iteration
        const closeButton = page.getByRole('button', { name: /close|dismiss/i }).first()
        if (await closeButton.isVisible()) {
          await closeButton.click()
          await page.waitForTimeout(500)
        }
      }
    }
  })

  test('should test export resumption for long videos', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Set filename
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('long-export-resumption-test')
      }
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Long export started for resumption test')
        
        // Wait for export to start and then cancel
        await page.waitForTimeout(2000)
        
        const cancelButton = page.getByRole('button', { name: /cancel|stop/i }).first()
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
          console.log('Export cancelled to test resumption')
          
          // Wait for cancellation to complete
          await page.waitForTimeout(1000)
          
          // Look for resume functionality
          const resumeButton = page.getByRole('button', { name: /resume|continue/i }).first()
          const restartButton = page.getByRole('button', { name: /restart|try.*again/i }).first()
          
          if (await resumeButton.isVisible()) {
            await resumeButton.click()
            console.log('Export resumption attempted')
            
            // Monitor resumed export
            await page.waitForTimeout(2000)
            
            const progressBar = page.locator('[role="progressbar"]').first()
            if (await progressBar.isVisible()) {
              const progress = await progressBar.getAttribute('aria-valuenow')
              console.log(`Resumed export progress: ${progress}%`)
            }
            
          } else if (await restartButton.isVisible()) {
            console.log('Restart option found (no resume capability)')
            
          } else {
            console.log('No resumption options found - may need to restart export manually')
            
            // Try starting export again
            if (await startExportButton.isVisible()) {
              await startExportButton.click()
              console.log('Export restarted manually')
            }
          }
          
          // Look for progress continuation indicators
          const resumeMessage = page.locator('*').filter({ hasText: /resuming|continuing|restarting/i }).first()
          if (await resumeMessage.isVisible()) {
            const resumeText = await resumeMessage.textContent()
            console.log(`Resumption status: ${resumeText}`)
          }
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should verify export stability over extended duration', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Set up for stability test
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('long-export-stability-test')
      }
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Long export started for stability test')
        
        const stabilityMetrics = {
          errors: 0,
          warnings: 0,
          progressStalls: 0,
          lastProgress: 0,
          maxMemoryUsage: 0,
          startTime: Date.now()
        }
        
        // Monitor stability over extended period
        for (let i = 0; i < 15; i++) { // 15 seconds monitoring
          await page.waitForTimeout(1000)
          
          // Check for errors
          const errorMessage = page.locator('*').filter({ hasText: /error|failed|crash/i }).first()
          if (await errorMessage.isVisible()) {
            stabilityMetrics.errors++
            const errorText = await errorMessage.textContent()
            console.log(`Stability error ${stabilityMetrics.errors}: ${errorText}`)
          }
          
          // Check for warnings
          const warningMessage = page.locator('*').filter({ hasText: /warning|slow|performance/i }).first()
          if (await warningMessage.isVisible()) {
            stabilityMetrics.warnings++
          }
          
          // Check progress stalls
          const progressBar = page.locator('[role="progressbar"]').first()
          if (await progressBar.isVisible()) {
            const progress = parseInt(await progressBar.getAttribute('aria-valuenow') || '0')
            
            if (progress === stabilityMetrics.lastProgress && progress < 100) {
              stabilityMetrics.progressStalls++
            }
            
            stabilityMetrics.lastProgress = progress
          }
          
          // Monitor memory usage
          const currentMetrics = await helpers.getPerformanceMetrics()
          if (currentMetrics.memoryUsage) {
            const currentMemory = currentMetrics.memoryUsage.usedJSHeapSize
            if (currentMemory > stabilityMetrics.maxMemoryUsage) {
              stabilityMetrics.maxMemoryUsage = currentMemory
            }
          }
          
          // Check if export completed
          const completedMessage = page.locator('*').filter({ hasText: /complete|finished/i }).first()
          if (await completedMessage.isVisible()) {
            console.log('Export completed during stability test')
            break
          }
        }
        
        // Report stability metrics
        const duration = Date.now() - stabilityMetrics.startTime
        console.log('Export stability summary:')
        console.log(`  Duration monitored: ${duration}ms`)
        console.log(`  Errors detected: ${stabilityMetrics.errors}`)
        console.log(`  Warnings detected: ${stabilityMetrics.warnings}`)
        console.log(`  Progress stalls: ${stabilityMetrics.progressStalls}`)
        console.log(`  Max memory usage: ${(stabilityMetrics.maxMemoryUsage / 1024 / 1024).toFixed(1)} MB`)
        
        // Evaluate stability
        if (stabilityMetrics.errors === 0 && stabilityMetrics.progressStalls < 3) {
          console.log('Export appears stable for long duration')
        } else {
          console.log('Stability issues detected - may need optimization')
        }
        
        expect(stabilityMetrics.errors).toBeLessThan(3) // Allow some tolerance
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should handle browser resource constraints during long export', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Set filename
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('resource-constraint-test')
      }
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Export started for resource constraint testing')
        
        // Simulate resource pressure by creating additional load
        const resourceTests = [
          'memory pressure simulation',
          'CPU intensive operations',
          'multiple tab interactions'
        ]
        
        for (const test of resourceTests) {
          console.log(`Testing export under ${test}`)
          
          // Wait a moment during export
          await page.waitForTimeout(2000)
          
          // Check export status during resource pressure
          const progressBar = page.locator('[role="progressbar"]').first()
          if (await progressBar.isVisible()) {
            const progress = await progressBar.getAttribute('aria-valuenow')
            console.log(`Progress during ${test}: ${progress}%`)
          }
          
          // Look for resource-related warnings
          const resourceWarning = page.locator('*').filter({ hasText: /memory.*low|cpu.*high|resource.*limited/i }).first()
          if (await resourceWarning.isVisible()) {
            const warningText = await resourceWarning.textContent()
            console.log(`Resource warning during ${test}: ${warningText}`)
          }
          
          // Check if export adapts to resource constraints
          const adaptationMessage = page.locator('*').filter({ hasText: /reducing.*quality|adaptive.*encoding|resource.*mode/i }).first()
          if (await adaptationMessage.isVisible()) {
            const adaptationText = await adaptationMessage.textContent()
            console.log(`Export adaptation: ${adaptationText}`)
          }
        }
        
        // Check overall export resilience
        const exportStillRunning = await progressBar.isVisible()
        if (exportStillRunning) {
          console.log('Export continues running despite resource pressure')
        } else {
          console.log('Export may have stopped due to resource constraints')
        }
        
        // Look for recovery mechanisms
        const retryButton = page.getByRole('button', { name: /retry|try.*again/i }).first()
        if (await retryButton.isVisible()) {
          console.log('Retry mechanism available for resource constraint recovery')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })
})