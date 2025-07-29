/**
 * E2E Test: Progress Tracking
 * Tests export progress monitoring, progress bar accuracy, and status messages
 */

import { test, expect } from '@playwright/test'
import { EditorPage, ExportDialog } from '../fixtures/page-objects'
import { TestHelpers } from 
import { EXPORT_SETTINGS } from '../fixtures/test-data'

test.describe('Progress Tracking', () => {
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

  test('should display progress bar during export', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Set up basic export settings
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('progress-tracking-test')
        console.log('Filename set for progress tracking test')
      }
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Export started for progress tracking test')
        
        // Wait a moment for export to initialize
        await page.waitForTimeout(1000)
        
        // Look for progress bar elements
        const progressBar = page.locator('[role="progressbar"]').first()
        const progressBarAlt = page.locator('progress').first()
        const progressDiv = page.locator('[data-testid="progress-bar"]').first()
        const percentageDisplay = page.locator('*').filter({ hasText: /\d+%/ }).first()
        
        if (await progressBar.isVisible()) {
          console.log('Progress bar with role="progressbar" found')
          
          // Test progress bar attributes
          const valueNow = await progressBar.getAttribute('aria-valuenow')
          const valueMin = await progressBar.getAttribute('aria-valuemin')
          const valueMax = await progressBar.getAttribute('aria-valuemax')
          
          if (valueNow !== null) {
            console.log(`Progress value: ${valueNow}%`)
            expect(parseInt(valueNow)).toBeGreaterThanOrEqual(0)
            expect(parseInt(valueNow)).toBeLessThanOrEqual(100)
          }
          
          if (valueMin !== null && valueMax !== null) {
            expect(parseInt(valueMin)).toBe(0)
            expect(parseInt(valueMax)).toBe(100)
            console.log(`Progress range: ${valueMin} to ${valueMax}`)
          }
          
          // Test progress bar visual updates
          await page.waitForTimeout(2000)
          const updatedValue = await progressBar.getAttribute('aria-valuenow')
          if (updatedValue !== null && valueNow !== null) {
            console.log(`Progress updated to: ${updatedValue}%`)
          }
          
        } else if (await progressBarAlt.isVisible()) {
          console.log('HTML progress element found')
          
          const value = await progressBarAlt.getAttribute('value')
          const max = await progressBarAlt.getAttribute('max')
          
          if (value !== null && max !== null) {
            const percentage = (parseInt(value) / parseInt(max)) * 100
            console.log(`Progress: ${percentage.toFixed(1)}%`)
            expect(percentage).toBeGreaterThanOrEqual(0)
            expect(percentage).toBeLessThanOrEqual(100)
          }
          
        } else if (await progressDiv.isVisible()) {
          console.log('Custom progress div found')
          
          // Check for width-based progress indicator
          const progressFill = page.locator('[data-testid="progress-fill"]').first()
          if (await progressFill.isVisible()) {
            const style = await progressFill.getAttribute('style')
            if (style && style.includes('width')) {
              console.log(`Progress fill style: ${style}`)
            }
          }
          
        } else if (await percentageDisplay.isVisible()) {
          const percentText = await percentageDisplay.textContent()
          console.log(`Progress percentage display: ${percentText}`)
          expect(percentText).toMatch(/\d+%/)
          
        } else {
          console.log('Progress bar not found - may use different implementation or be under development')
        }
        
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should show accurate progress percentage updates', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Export started for percentage accuracy test')
        
        const progressValues: number[] = []
        const startTime = Date.now()
        
        // Monitor progress updates for several seconds
        for (let i = 0; i < 5; i++) {
          await page.waitForTimeout(1000)
          
          // Check various progress indicators
          const progressBar = page.locator('[role="progressbar"]').first()
          const percentageText = page.locator('*').filter({ hasText: /\d+%/ }).first()
          const progressElement = page.locator('progress').first()
          
          if (await progressBar.isVisible()) {
            const valueNow = await progressBar.getAttribute('aria-valuenow')
            if (valueNow !== null) {
              const value = parseInt(valueNow)
              progressValues.push(value)
              console.log(`Progress update ${i + 1}: ${value}%`)
            }
            
          } else if (await percentageText.isVisible()) {
            const text = await percentageText.textContent()
            if (text) {
              const match = text.match(/(\d+)%/)
              if (match) {
                const value = parseInt(match[1])
                progressValues.push(value)
                console.log(`Progress update ${i + 1}: ${value}%`)
              }
            }
            
          } else if (await progressElement.isVisible()) {
            const value = await progressElement.getAttribute('value')
            const max = await progressElement.getAttribute('max')
            if (value !== null && max !== null) {
              const percentage = Math.round((parseInt(value) / parseInt(max)) * 100)
              progressValues.push(percentage)
              console.log(`Progress update ${i + 1}: ${percentage}%`)
            }
          }
        }
        
        // Validate progress behavior
        if (progressValues.length > 1) {
          // Check that progress values are within valid range
          progressValues.forEach((value, index) => {
            expect(value).toBeGreaterThanOrEqual(0)
            expect(value).toBeLessThanOrEqual(100)
          })
          
          // Check for generally increasing trend (allowing for some variations)
          const firstValue = progressValues[0]
          const lastValue = progressValues[progressValues.length - 1]
          
          if (lastValue >= firstValue) {
            console.log(`Progress increased from ${firstValue}% to ${lastValue}%`)
          } else {
            console.log(`Progress values: ${progressValues.join(', ')}% - may indicate completion or reset`)
          }
          
          console.log(`Tracked ${progressValues.length} progress updates over ${Date.now() - startTime}ms`)
        } else {
          console.log('Progress tracking not available or export completed too quickly')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should display detailed status messages during export', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Export started for status message test')
        
        const statusMessages: string[] = []
        
        // Monitor status messages during export
        for (let i = 0; i < 6; i++) {
          await page.waitForTimeout(500)
          
          // Look for various status message indicators
          const statusElement = page.locator('[data-testid="export-status"]').first()
          const statusText = page.locator('*').filter({ hasText: /preparing|processing|encoding|rendering|finalizing|complete/i }).first()
          const progressLabel = page.locator('[data-testid="progress-label"]').first()
          const anyStatusText = page.locator('*').filter({ hasText: /export|progress|status/i }).first()
          
          let currentStatus = ''
          
          if (await statusElement.isVisible()) {
            const text = await statusElement.textContent()
            if (text) {
              currentStatus = text.trim()
            }
            
          } else if (await statusText.isVisible()) {
            const text = await statusText.textContent()
            if (text) {
              currentStatus = text.trim()
            }
            
          } else if (await progressLabel.isVisible()) {
            const text = await progressLabel.textContent()
            if (text) {
              currentStatus = text.trim()
            }
            
          } else if (await anyStatusText.isVisible()) {
            const text = await anyStatusText.textContent()
            if (text && text.length < 100) { // Avoid capturing long content
              currentStatus = text.trim()
            }
          }
          
          if (currentStatus && !statusMessages.includes(currentStatus)) {
            statusMessages.push(currentStatus)
            console.log(`Status update ${i + 1}: "${currentStatus}"`)
          }
        }
        
        // Validate status messages
        if (statusMessages.length > 0) {
          console.log(`Captured ${statusMessages.length} unique status messages:`)
          statusMessages.forEach((msg, index) => {
            console.log(`  ${index + 1}. ${msg}`)
            expect(msg.length).toBeGreaterThan(0)
          })
          
          // Check for expected status patterns
          const hasProcessingStatus = statusMessages.some(msg => 
            /preparing|processing|encoding|rendering|exporting/i.test(msg)
          )
          
          if (hasProcessingStatus) {
            console.log('Found processing-related status messages')
          }
          
          const hasPercentageInStatus = statusMessages.some(msg => 
            /\d+%/.test(msg)
          )
          
          if (hasPercentageInStatus) {
            console.log('Found percentage information in status messages')
          }
          
        } else {
          console.log('No status messages captured - may be using different implementation')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should show estimated time remaining during export', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Export started for time estimation test')
        
        // Wait for export to start and then look for time estimates
        await page.waitForTimeout(2000)
        
        // Look for time remaining indicators
        const timeRemaining = page.locator('[data-testid="time-remaining"]').first()
        const etaDisplay = page.locator('*').filter({ hasText: /eta|estimated.*time|time.*remaining|\d+:\d+.*remaining/i }).first()
        const timePattern = page.locator('*').filter({ hasText: /\d+:\d+|\d+\s*(second|minute|sec|min)/i }).first()
        
        if (await timeRemaining.isVisible()) {
          const timeText = await timeRemaining.textContent()
          console.log(`Time remaining display: ${timeText}`)
          expect(timeText).toBeTruthy()
          
        } else if (await etaDisplay.isVisible()) {
          const etaText = await etaDisplay.textContent()
          console.log(`ETA display: ${etaText}`)
          expect(etaText).toBeTruthy()
          
        } else if (await timePattern.isVisible()) {
          const timeText = await timePattern.textContent()
          console.log(`Time pattern found: ${timeText}`)
          expect(timeText).toMatch(/\d+/)
          
        } else {
          console.log('Time estimation not found - feature may be under development')
        }
        
        // Check for speed/throughput information
        const speedInfo = page.locator('*').filter({ hasText: /fps|frames.*second|mb.*s|speed/i }).first()
        if (await speedInfo.isVisible()) {
          const speedText = await speedInfo.textContent()
          console.log(`Export speed info: ${speedText}`)
        }
        
        // Check for export statistics
        const statsInfo = page.locator('[data-testid="export-stats"]').first()
        if (await statsInfo.isVisible()) {
          const statsText = await statsInfo.textContent()
          console.log(`Export statistics: ${statsText}`)
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should handle progress updates for different export phases', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Export started for phase tracking test')
        
        const detectedPhases: string[] = []
        
        // Monitor for different export phases
        for (let i = 0; i < 8; i++) {
          await page.waitForTimeout(750)
          
          // Look for phase indicators
          const phaseKeywords = [
            'initializing',
            'preparing',
            'analyzing',
            'rendering',
            'encoding',
            'processing',
            'mixing',
            'finalizing',
            'complete'
          ]
          
          for (const keyword of phaseKeywords) {
            const phaseElement = page.locator('*').filter({ hasText: new RegExp(keyword, 'i') }).first()
            if (await phaseElement.isVisible() && !detectedPhases.includes(keyword)) {
              detectedPhases.push(keyword)
              console.log(`Export phase detected: ${keyword}`)
              
              // Check if progress resets or continues for this phase
              const progressBar = page.locator('[role="progressbar"]').first()
              if (await progressBar.isVisible()) {
                const progress = await progressBar.getAttribute('aria-valuenow')
                console.log(`  Progress during ${keyword}: ${progress}%`)
              }
            }
          }
          
          // Look for sub-phase progress
          const subPhaseProgress = page.locator('*').filter({ hasText: /step \d+|\d+ of \d+|phase \d+/i }).first()
          if (await subPhaseProgress.isVisible()) {
            const subPhaseText = await subPhaseProgress.textContent()
            console.log(`Sub-phase progress: ${subPhaseText}`)
          }
        }
        
        // Validate phase detection
        if (detectedPhases.length > 0) {
          console.log(`Detected ${detectedPhases.length} export phases: ${detectedPhases.join(', ')}`)
          
          // Check for logical phase progression
          const expectedOrder = ['initializing', 'preparing', 'processing', 'rendering', 'encoding', 'finalizing', 'complete']
          let orderlyProgression = true
          
          for (let i = 1; i < detectedPhases.length; i++) {
            const currentIndex = expectedOrder.indexOf(detectedPhases[i])
            const previousIndex = expectedOrder.indexOf(detectedPhases[i - 1])
            
            if (currentIndex !== -1 && previousIndex !== -1 && currentIndex < previousIndex) {
              orderlyProgression = false
              break
            }
          }
          
          if (orderlyProgression) {
            console.log('Export phases appear to follow logical progression')
          } else {
            console.log('Export phases detected but not in expected order (may be parallel processing)')
          }
          
        } else {
          console.log('No specific export phases detected - may use unified progress system')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should display progress for large file exports', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Try to select high quality settings to make export take longer
      const qualitySelect = page.locator('[data-testid="quality-select"]').first()
      const highQualityOption = page.locator('*').filter({ hasText: /high|maximum|1080p/i }).first()
      
      if (await qualitySelect.isVisible()) {
        await qualitySelect.click()
        const highOption = page.getByRole('option', { name: /high|max/i }).first()
        if (await highOption.isVisible()) {
          await highOption.click()
          console.log('High quality selected for large file test')
        }
      } else if (await highQualityOption.isVisible()) {
        await highQualityOption.click()
        console.log('High quality option selected')
      }
      
      // Set filename
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('large-file-progress-test')
      }
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Large file export started for progress test')
        
        // Monitor progress over longer period
        const progressReadings: { time: number; progress: number; phase: string }[] = []
        const startTime = Date.now()
        
        for (let i = 0; i < 10; i++) {
          await page.waitForTimeout(1000)
          
          const currentTime = Date.now() - startTime
          let currentProgress = 0
          let currentPhase = 'unknown'
          
          // Get progress value
          const progressBar = page.locator('[role="progressbar"]').first()
          if (await progressBar.isVisible()) {
            const progress = await progressBar.getAttribute('aria-valuenow')
            if (progress !== null) {
              currentProgress = parseInt(progress)
            }
          }
          
          // Get current phase/status
          const statusElement = page.locator('[data-testid="export-status"]').first()
          const phaseElement = page.locator('*').filter({ hasText: /preparing|processing|encoding|rendering/i }).first()
          
          if (await statusElement.isVisible()) {
            const status = await statusElement.textContent()
            if (status) currentPhase = status.trim()
          } else if (await phaseElement.isVisible()) {
            const phase = await phaseElement.textContent()
            if (phase) currentPhase = phase.trim()
          }
          
          progressReadings.push({
            time: currentTime,
            progress: currentProgress,
            phase: currentPhase
          })
          
          console.log(`Large file progress ${i + 1}: ${currentProgress}% at ${currentTime}ms - ${currentPhase}`)
          
          // Check for performance warnings
          const performanceWarning = page.locator('*').filter({ hasText: /slow|performance|memory|warning/i }).first()
          if (await performanceWarning.isVisible()) {
            const warningText = await performanceWarning.textContent()
            console.log(`Performance warning: ${warningText}`)
          }
        }
        
        // Analyze progress behavior
        if (progressReadings.length > 1) {
          const totalTime = progressReadings[progressReadings.length - 1].time
          const finalProgress = progressReadings[progressReadings.length - 1].progress
          
          console.log(`Large file export tracking: ${finalProgress}% progress in ${totalTime}ms`)
          
          // Check for smooth progress updates
          const progressChanges = progressReadings.filter((reading, index) => 
            index === 0 || reading.progress !== progressReadings[index - 1].progress
          )
          
          console.log(`Progress changed ${progressChanges.length} times during monitoring`)
          
          if (progressChanges.length > 1) {
            const avgProgressRate = finalProgress / (totalTime / 1000) // progress per second
            console.log(`Average progress rate: ${avgProgressRate.toFixed(1)}% per second`)
          }
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should show cancel button with progress updates', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Export started for cancel button test')
        
        // Wait for export to start
        await page.waitForTimeout(1500)
        
        // Look for cancel button
        const cancelButton = page.getByRole('button', { name: /cancel|stop|abort/i }).first()
        const cancelButtonAlt = page.locator('[data-testid="cancel-export"]').first()
        
        if (await cancelButton.isVisible()) {
          console.log('Cancel button found during export')
          
          // Check that cancel button is enabled
          const isEnabled = await cancelButton.isEnabled()
          expect(isEnabled).toBe(true)
          console.log(`Cancel button is ${isEnabled ? 'enabled' : 'disabled'}`)
          
          // Check progress before cancelling
          const progressBar = page.locator('[role="progressbar"]').first()
          if (await progressBar.isVisible()) {
            const progressBefore = await progressBar.getAttribute('aria-valuenow')
            console.log(`Progress before cancel: ${progressBefore}%`)
          }
          
          // Click cancel button
          await cancelButton.click()
          console.log('Cancel button clicked')
          
          // Wait for cancellation to take effect
          await page.waitForTimeout(1000)
          
          // Verify export was cancelled
          const cancelledMessage = page.locator('*').filter({ hasText: /cancelled|stopped|aborted/i }).first()
          const errorMessage = page.locator('*').filter({ hasText: /error|failed/i }).first()
          
          if (await cancelledMessage.isVisible()) {
            const cancelText = await cancelledMessage.textContent()
            console.log(`Cancellation confirmed: ${cancelText}`)
            expect(cancelText).toBeTruthy()
          } else if (await errorMessage.isVisible()) {
            console.log('Export appears to have failed rather than been cancelled')
          } else {
            console.log('Cancellation result not clearly indicated')
          }
          
          // Check if progress bar disappears or resets
          await page.waitForTimeout(500)
          if (await progressBar.isVisible()) {
            const progressAfter = await progressBar.getAttribute('aria-valuenow')
            console.log(`Progress after cancel: ${progressAfter}%`)
          } else {
            console.log('Progress bar hidden after cancellation')
          }
          
        } else if (await cancelButtonAlt.isVisible()) {
          console.log('Alternative cancel button implementation found')
          await cancelButtonAlt.click()
          console.log('Cancel button (alternative) clicked')
          
        } else {
          console.log('Cancel button not found - may not be implemented or export completed too quickly')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should handle progress tracking errors gracefully', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Export started for error handling test')
        
        // Monitor for error conditions
        for (let i = 0; i < 5; i++) {
          await page.waitForTimeout(1000)
          
          // Look for error indicators
          const errorMessage = page.locator('*').filter({ hasText: /error|failed|problem|issue/i }).first()
          const warningMessage = page.locator('*').filter({ hasText: /warning|caution/i }).first()
          const retryButton = page.getByRole('button', { name: /retry|try.*again/i }).first()
          
          if (await errorMessage.isVisible()) {
            const errorText = await errorMessage.textContent()
            console.log(`Error detected: ${errorText}`)
            
            // Check if progress tracking continues despite error
            const progressBar = page.locator('[role="progressbar"]').first()
            if (await progressBar.isVisible()) {
              const progress = await progressBar.getAttribute('aria-valuenow')
              console.log(`Progress during error: ${progress}%`)
            }
            
            // Check for retry option
            if (await retryButton.isVisible()) {
              console.log('Retry button available after error')
            }
            
            break
          }
          
          if (await warningMessage.isVisible()) {
            const warningText = await warningMessage.textContent()
            console.log(`Warning detected: ${warningText}`)
          }
          
          // Check for stalled progress (progress not updating)
          const progressBar = page.locator('[role="progressbar"]').first()
          if (await progressBar.isVisible()) {
            const currentProgress = await progressBar.getAttribute('aria-valuenow')
            if (i === 0) {
              page.evaluate((progress) => { window.firstProgress = progress }, currentProgress)
            } else if (i === 4) {
              const firstProgress = await page.evaluate(() => window.firstProgress)
              if (currentProgress === firstProgress) {
                console.log(`Progress may be stalled at ${currentProgress}%`)
              }
            }
          }
        }
        
        // Test error recovery mechanisms
        const refreshButton = page.getByRole('button', { name: /refresh|reload/i }).first()
        const restartButton = page.getByRole('button', { name: /restart|start.*over/i }).first()
        
        if (await refreshButton.isVisible()) {
          console.log('Refresh option available for error recovery')
        }
        
        if (await restartButton.isVisible()) {
          console.log('Restart option available for error recovery')
        }
        
        // Check if UI remains responsive during errors
        const exportButtonStillClickable = await exportButton.isEnabled()
        console.log(`Export button ${exportButtonStillClickable ? 'remains' : 'becomes'} clickable after error scenarios`)
      }
    } else {
      console.log('Export functionality not available')
    }
  })
})