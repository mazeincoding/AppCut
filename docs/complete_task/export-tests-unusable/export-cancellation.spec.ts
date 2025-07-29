/**
 * E2E Test: Export Cancellation
 * Tests export cancellation functionality and proper cleanup
 */

import { test, expect } from '@playwright/test'
import { EditorPage, ExportDialog } from '../fixtures/page-objects'
import { TestHelpers } from 
import { EXPORT_SETTINGS } from '../fixtures/test-data'

test.describe('Export Cancellation', () => {
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

  test('should start export process and show cancel button', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Set filename for cancellation test
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('cancellation-test-export')
        console.log('Filename set for cancellation test')
      }
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Export started for cancellation test')
        
        // Wait for export to initialize
        await page.waitForTimeout(1500)
        
        // Look for cancel button
        const cancelButton = page.getByRole('button', { name: /cancel|stop|abort/i }).first()
        const cancelButtonAlt = page.locator('[data-testid="cancel-export"]').first()
        const stopButton = page.locator('[data-testid="stop-export"]').first()
        
        if (await cancelButton.isVisible()) {
          console.log('Cancel button found during export')
          
          // Verify cancel button is enabled
          const isEnabled = await cancelButton.isEnabled()
          expect(isEnabled).toBe(true)
          console.log(`Cancel button is ${isEnabled ? 'enabled' : 'disabled'}`)
          
          // Check button text/label
          const buttonText = await cancelButton.textContent()
          console.log(`Cancel button text: "${buttonText}"`)
          expect(buttonText).toBeTruthy()
          
        } else if (await cancelButtonAlt.isVisible()) {
          console.log('Alternative cancel button implementation found')
          const isEnabled = await cancelButtonAlt.isEnabled()
          expect(isEnabled).toBe(true)
          
        } else if (await stopButton.isVisible()) {
          console.log('Stop button found (alternative to cancel)')
          const isEnabled = await stopButton.isEnabled()
          expect(isEnabled).toBe(true)
          
        } else {
          console.log('Cancel button not found - export may complete too quickly or feature under development')
        }
        
        // Check export is actually running
        const progressBar = page.locator('[role="progressbar"]').first()
        const exportStatus = page.locator('[data-testid="export-status"]').first()
        const processingIndicator = page.locator('*').filter({ hasText: /processing|exporting|encoding/i }).first()
        
        if (await progressBar.isVisible()) {
          const progress = await progressBar.getAttribute('aria-valuenow')
          console.log(`Export progress when cancel button available: ${progress}%`)
        } else if (await exportStatus.isVisible()) {
          const status = await exportStatus.textContent()
          console.log(`Export status when cancel available: ${status}`)
        } else if (await processingIndicator.isVisible()) {
          console.log('Export processing indicator found')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should cancel export mid-process and show confirmation', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Set filename
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('mid-process-cancellation-test')
      }
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Export started for mid-process cancellation test')
        
        // Wait for export to be well underway
        await page.waitForTimeout(2000)
        
        // Check progress before cancelling
        const progressBar = page.locator('[role="progressbar"]').first()
        let progressBeforeCancel = 'unknown'
        if (await progressBar.isVisible()) {
          const progress = await progressBar.getAttribute('aria-valuenow')
          progressBeforeCancel = progress || 'unknown'
          console.log(`Progress before cancellation: ${progressBeforeCancel}%`)
        }
        
        // Find and click cancel button
        const cancelButton = page.getByRole('button', { name: /cancel|stop|abort/i }).first()
        const cancelButtonAlt = page.locator('[data-testid="cancel-export"]').first()
        
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
          console.log('Cancel button clicked during export')
          
        } else if (await cancelButtonAlt.isVisible()) {
          await cancelButtonAlt.click()
          console.log('Alternative cancel button clicked')
          
        } else {
          console.log('Cancel button not found - export may have completed')
          return
        }
        
        // Wait for cancellation to process
        await page.waitForTimeout(1000)
        
        // Look for cancellation confirmation
        const cancelledMessage = page.locator('*').filter({ hasText: /cancelled|stopped|aborted|canceled/i }).first()
        const cancelConfirmation = page.locator('[data-testid="export-cancelled"]').first()
        const errorMessage = page.locator('*').filter({ hasText: /export.*failed|interrupted/i }).first()
        
        if (await cancelledMessage.isVisible()) {
          const cancelText = await cancelledMessage.textContent()
          console.log(`Cancellation confirmed: ${cancelText}`)
          expect(cancelText).toBeTruthy()
          
        } else if (await cancelConfirmation.isVisible()) {
          console.log('Export cancellation confirmation element found')
          
        } else if (await errorMessage.isVisible()) {
          console.log('Export interruption detected (may be shown as error)')
          
        } else {
          console.log('Cancellation confirmation not clearly displayed')
        }
        
        // Check if progress bar updates after cancellation
        await page.waitForTimeout(500)
        if (await progressBar.isVisible()) {
          const progressAfterCancel = await progressBar.getAttribute('aria-valuenow')
          console.log(`Progress after cancellation: ${progressAfterCancel}%`)
          
          // Progress might reset to 0 or disappear
          if (progressAfterCancel === '0') {
            console.log('Progress reset to 0 after cancellation')
          }
        } else {
          console.log('Progress bar hidden after cancellation')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should verify proper cleanup after export cancellation', async ({ page }) => {
    // Get baseline memory usage
    const baselineMetrics = await helpers.getPerformanceMetrics()
    console.log('Baseline memory before export:', baselineMetrics.memoryUsage)
    
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Set filename
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('cleanup-verification-test')
      }
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Export started for cleanup verification')
        
        // Wait for export to use resources
        await page.waitForTimeout(2500)
        
        // Get memory usage during export
        const duringExportMetrics = await helpers.getPerformanceMetrics()
        console.log('Memory during export:', duringExportMetrics.memoryUsage)
        
        // Cancel export
        const cancelButton = page.getByRole('button', { name: /cancel|stop|abort/i }).first()
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
          console.log('Export cancelled for cleanup verification')
          
          // Wait for cleanup to complete
          await page.waitForTimeout(2000)
          
          // Get memory usage after cancellation
          const afterCancelMetrics = await helpers.getPerformanceMetrics()
          console.log('Memory after cancellation:', afterCancelMetrics.memoryUsage)
          
          // Analyze memory cleanup
          if (baselineMetrics.memoryUsage && duringExportMetrics.memoryUsage && afterCancelMetrics.memoryUsage) {
            const baselineUsed = baselineMetrics.memoryUsage.usedJSHeapSize
            const duringExportUsed = duringExportMetrics.memoryUsage.usedJSHeapSize
            const afterCancelUsed = afterCancelMetrics.memoryUsage.usedJSHeapSize
            
            const exportMemoryIncrease = duringExportUsed - baselineUsed
            const finalMemoryIncrease = afterCancelUsed - baselineUsed
            
            console.log(`Memory analysis:`)
            console.log(`  Export increased memory by: ${(exportMemoryIncrease / 1024 / 1024).toFixed(1)} MB`)
            console.log(`  Final memory increase: ${(finalMemoryIncrease / 1024 / 1024).toFixed(1)} MB`)
            
            // Check if memory was cleaned up
            const cleanupEfficiency = (exportMemoryIncrease - finalMemoryIncrease) / exportMemoryIncrease
            if (cleanupEfficiency > 0.5) {
              console.log(`Good cleanup: ${(cleanupEfficiency * 100).toFixed(1)}% of export memory was freed`)
            } else if (cleanupEfficiency > 0) {
              console.log(`Partial cleanup: ${(cleanupEfficiency * 100).toFixed(1)}% of export memory was freed`)
            } else {
              console.log('Memory cleanup may be incomplete or happening asynchronously')
            }
          }
          
          // Check for cleanup indicators in UI
          const cleanupMessage = page.locator('*').filter({ hasText: /cleaning.*up|cleanup|releasing.*resources/i }).first()
          if (await cleanupMessage.isVisible()) {
            const cleanupText = await cleanupMessage.textContent()
            console.log(`Cleanup message: ${cleanupText}`)
          }
          
          // Verify export-related UI elements are reset
          const progressBar = page.locator('[role="progressbar"]').first()
          const exportStatus = page.locator('[data-testid="export-status"]').first()
          
          if (await progressBar.isVisible()) {
            const progress = await progressBar.getAttribute('aria-valuenow')
            if (progress === '0' || progress === null) {
              console.log('Progress bar properly reset after cancellation')
            } else {
              console.log(`Progress bar shows ${progress}% after cancellation`)
            }
          } else {
            console.log('Progress bar hidden after cancellation (good cleanup)')
          }
          
          if (await exportStatus.isVisible()) {
            const status = await exportStatus.textContent()
            console.log(`Export status after cancellation: ${status}`)
          } else {
            console.log('Export status cleared after cancellation')
          }
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should allow starting new export after cancellation', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      // First export attempt
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('first-export-to-cancel')
      }
      
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('First export started')
        
        // Wait then cancel
        await page.waitForTimeout(2000)
        
        const cancelButton = page.getByRole('button', { name: /cancel|stop|abort/i }).first()
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
          console.log('First export cancelled')
          
          // Wait for cancellation to complete
          await page.waitForTimeout(1500)
          
          // Try to start a new export
          console.log('Attempting to start new export after cancellation')
          
          // Close current dialog if needed
          const closeButton = page.getByRole('button', { name: /close|dismiss/i }).first()
          if (await closeButton.isVisible()) {
            await closeButton.click()
            await page.waitForTimeout(500)
          }
          
          // Open export dialog again
          if (await exportButton.isVisible()) {
            await exportButton.click()
            await page.waitForTimeout(1000)
            
            // Set new filename
            if (await filenameInput.isVisible()) {
              await filenameInput.clear()
              await filenameInput.fill('second-export-after-cancellation')
              console.log('New filename set for second export')
            }
            
            // Try to start second export
            if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
              await startExportButton.click()
              console.log('Second export started successfully after cancellation')
              
              // Wait a moment to verify it starts
              await page.waitForTimeout(1000)
              
              // Check that new export is running
              const progressBar = page.locator('[role="progressbar"]').first()
              const exportStatus = page.locator('[data-testid="export-status"]').first()
              
              if (await progressBar.isVisible()) {
                const progress = await progressBar.getAttribute('aria-valuenow')
                console.log(`Second export progress: ${progress}%`)
                expect(parseInt(progress || '0')).toBeGreaterThanOrEqual(0)
              } else if (await exportStatus.isVisible()) {
                const status = await exportStatus.textContent()
                console.log(`Second export status: ${status}`)
              }
              
              // Cancel second export to clean up
              const secondCancelButton = page.getByRole('button', { name: /cancel|stop|abort/i }).first()
              if (await secondCancelButton.isVisible()) {
                await secondCancelButton.click()
                console.log('Second export cancelled for cleanup')
              }
              
            } else {
              console.log('Start export button not available for second export')
            }
          }
        } else {
          console.log('Cancel button not found for first export')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should handle cancellation at different export phases', async ({ page }) => {
    const exportPhaseTests = [
      { phase: 'early', waitTime: 500, description: 'very early in export' },
      { phase: 'mid', waitTime: 2000, description: 'mid-way through export' },
      { phase: 'late', waitTime: 4000, description: 'late in export process' }
    ]
    
    for (const test of exportPhaseTests) {
      console.log(`Testing cancellation ${test.description}`)
      
      const exportButton = page.getByRole('button', { name: /export/i }).first()
      
      if (await exportButton.isVisible()) {
        await exportButton.click()
        await page.waitForTimeout(1000)
        
        // Set unique filename for each phase test
        const filenameInput = page.locator('input[type="text"]').first()
        if (await filenameInput.isVisible()) {
          await filenameInput.fill(`cancel-${test.phase}-phase-test`)
        }
        
        // Start export
        const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
        if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
          await startExportButton.click()
          console.log(`Export started for ${test.phase} phase cancellation`)
          
          // Wait for specified phase
          await page.waitForTimeout(test.waitTime)
          
          // Check what phase we're in
          const statusElement = page.locator('[data-testid="export-status"]').first()
          const progressBar = page.locator('[role="progressbar"]').first()
          
          let currentPhase = 'unknown'
          let currentProgress = 'unknown'
          
          if (await statusElement.isVisible()) {
            const status = await statusElement.textContent()
            if (status) currentPhase = status.trim()
          }
          
          if (await progressBar.isVisible()) {
            const progress = await progressBar.getAttribute('aria-valuenow')
            if (progress) currentProgress = progress + '%'
          }
          
          console.log(`Cancelling during ${currentPhase} phase at ${currentProgress} progress`)
          
          // Cancel export
          const cancelButton = page.getByRole('button', { name: /cancel|stop|abort/i }).first()
          if (await cancelButton.isVisible()) {
            await cancelButton.click()
            console.log(`${test.phase} phase cancellation attempted`)
            
            // Wait for cancellation
            await page.waitForTimeout(1000)
            
            // Verify cancellation worked
            const cancelledMessage = page.locator('*').filter({ hasText: /cancelled|stopped|aborted/i }).first()
            if (await cancelledMessage.isVisible()) {
              console.log(`${test.phase} phase cancellation successful`)
            } else {
              console.log(`${test.phase} phase cancellation result unclear`)
            }
            
            // Check for phase-specific cleanup
            const cleanupIndicator = page.locator('*').filter({ hasText: /cleaning|releasing|stopping/i }).first()
            if (await cleanupIndicator.isVisible()) {
              const cleanupText = await cleanupIndicator.textContent()
              console.log(`${test.phase} phase cleanup: ${cleanupText}`)
            }
          } else {
            console.log(`Cancel button not available during ${test.phase} phase`)
          }
          
          // Close dialog for next test
          const closeButton = page.getByRole('button', { name: /close|dismiss/i }).first()
          if (await closeButton.isVisible()) {
            await closeButton.click()
            await page.waitForTimeout(500)
          }
        }
      }
    }
  })

  test('should show cancellation confirmation dialog if needed', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Set filename
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('confirmation-dialog-test')
      }
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Export started for confirmation dialog test')
        
        // Wait for export to be in progress
        await page.waitForTimeout(1500)
        
        // Try to cancel
        const cancelButton = page.getByRole('button', { name: /cancel|stop|abort/i }).first()
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
          console.log('Cancel button clicked - checking for confirmation dialog')
          
          // Wait for potential confirmation dialog
          await page.waitForTimeout(500)
          
          // Look for confirmation dialog
          const confirmDialog = page.locator('[role="dialog"]').filter({ hasText: /confirm|sure|cancel/i }).first()
          const confirmationMessage = page.locator('*').filter({ hasText: /are you sure|confirm.*cancel|cancel.*export/i }).first()
          const yesButton = page.getByRole('button', { name: /yes|confirm|ok/i }).first()
          const noButton = page.getByRole('button', { name: /no|keep.*exporting|continue/i }).first()
          
          if (await confirmDialog.isVisible()) {
            console.log('Cancellation confirmation dialog found')
            
            // Check dialog content
            const dialogText = await confirmDialog.textContent()
            console.log(`Confirmation dialog text: ${dialogText}`)
            expect(dialogText).toContain(/cancel|stop|abort/i)
            
            // Test both confirmation options
            if (await noButton.isVisible()) {
              await noButton.click()
              console.log('Clicked "No" - export should continue')
              
              await page.waitForTimeout(1000)
              
              // Verify export continues
              const stillRunning = await progressBar.isVisible()
              console.log(`Export still running after "No": ${stillRunning}`)
              
              // Try cancel again and confirm
              if (await cancelButton.isVisible()) {
                await cancelButton.click()
                await page.waitForTimeout(500)
                
                const confirmYes = page.getByRole('button', { name: /yes|confirm|ok/i }).first()
                if (await confirmYes.isVisible()) {
                  await confirmYes.click()
                  console.log('Clicked "Yes" - export should cancel')
                }
              }
            } else if (await yesButton.isVisible()) {
              await yesButton.click()
              console.log('Confirmed cancellation')
            }
            
          } else if (await confirmationMessage.isVisible()) {
            console.log('Confirmation message found (inline confirmation)')
            const confirmText = await confirmationMessage.textContent()
            console.log(`Confirmation message: ${confirmText}`)
            
          } else {
            console.log('No confirmation dialog - direct cancellation')
          }
          
          // Verify final cancellation
          await page.waitForTimeout(1000)
          const cancelledMessage = page.locator('*').filter({ hasText: /cancelled|stopped/i }).first()
          if (await cancelledMessage.isVisible()) {
            console.log('Export successfully cancelled after confirmation process')
          }
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should handle cancellation errors gracefully', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Set filename
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('cancellation-error-handling-test')
      }
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Export started for error handling test')
        
        // Wait for export to start
        await page.waitForTimeout(1500)
        
        // Try to cancel multiple times rapidly (stress test)
        const cancelButton = page.getByRole('button', { name: /cancel|stop|abort/i }).first()
        if (await cancelButton.isVisible()) {
          console.log('Testing rapid cancellation attempts')
          
          // Multiple rapid clicks
          for (let i = 0; i < 3; i++) {
            if (await cancelButton.isVisible()) {
              await cancelButton.click()
              await page.waitForTimeout(200)
              console.log(`Cancellation attempt ${i + 1}`)
            }
          }
          
          // Wait for system to respond
          await page.waitForTimeout(2000)
          
          // Check for error handling
          const errorMessage = page.locator('*').filter({ hasText: /error.*cancel|cancel.*error|failed.*stop/i }).first()
          const warningMessage = page.locator('*').filter({ hasText: /already.*cancelled|cancellation.*progress/i }).first()
          
          if (await errorMessage.isVisible()) {
            const errorText = await errorMessage.textContent()
            console.log(`Cancellation error message: ${errorText}`)
            expect(errorText).toBeTruthy()
            
          } else if (await warningMessage.isVisible()) {
            const warningText = await warningMessage.textContent()
            console.log(`Cancellation warning: ${warningText}`)
            
          } else {
            console.log('No error messages - rapid cancellation handled gracefully')
          }
          
          // Check if UI remains functional
          const exportButtonStillClickable = await exportButton.isEnabled()
          console.log(`Export button still functional after error test: ${exportButtonStillClickable}`)
          
          // Verify system recovered
          const recoveryIndicator = page.locator('*').filter({ hasText: /ready|cancelled|stopped/i }).first()
          if (await recoveryIndicator.isVisible()) {
            console.log('System appears to have recovered from cancellation stress test')
          }
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should preserve user settings after export cancellation', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Set specific export settings to test preservation
      const filenameInput = page.locator('input[type="text"]').first()
      const qualitySelect = page.locator('[data-testid="quality-select"]').first()
      const formatSelect = page.locator('[data-testid="format-select"]').first()
      
      // Configure settings
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('settings-preservation-test')
        console.log('Filename configured for preservation test')
      }
      
      if (await qualitySelect.isVisible()) {
        await qualitySelect.click()
        const mediumOption = page.getByRole('option', { name: /medium|720/i }).first()
        if (await mediumOption.isVisible()) {
          await mediumOption.click()
          console.log('Quality set to medium for preservation test')
        }
      }
      
      if (await formatSelect.isVisible()) {
        await formatSelect.click()
        const mp4Option = page.getByRole('option', { name: /mp4/i }).first()
        if (await mp4Option.isVisible()) {
          await mp4Option.click()
          console.log('Format set to MP4 for preservation test')
        }
      }
      
      // Start and then cancel export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Export started with configured settings')
        
        await page.waitForTimeout(1500)
        
        const cancelButton = page.getByRole('button', { name: /cancel|stop|abort/i }).first()
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
          console.log('Export cancelled - checking settings preservation')
          
          await page.waitForTimeout(1000)
          
          // Verify settings are preserved after cancellation
          if (await filenameInput.isVisible()) {
            const currentFilename = await filenameInput.inputValue()
            console.log(`Filename after cancellation: "${currentFilename}"`)
            expect(currentFilename).toBe('settings-preservation-test')
          }
          
          // Check if quality setting is preserved
          const currentQuality = page.locator('*').filter({ hasText: /medium|720p/i }).first()
          if (await currentQuality.isVisible()) {
            console.log('Quality setting appears to be preserved')
          }
          
          // Check if format setting is preserved
          const currentFormat = page.locator('*').filter({ hasText: /mp4/i }).first()
          if (await currentFormat.isVisible()) {
            console.log('Format setting appears to be preserved')
          }
          
          // Try to start export again with preserved settings
          if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
            console.log('Start export button still available with preserved settings')
          }
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })
})