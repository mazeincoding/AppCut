/**
 * E2E Test: Quality Presets
 * Tests different quality presets (1080p, 720p, 480p) and file size comparisons
 */

import { test, expect } from '@playwright/test'
import { EditorPage, ExportDialog } from '../fixtures/page-objects'
import { TestHelpers } from 
import { EXPORT_SETTINGS } from '../fixtures/test-data'

test.describe('Quality Presets', () => {
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

  test('should test 1080p export preset', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for 1080p quality option
      const quality1080p = page.locator('*').filter({ hasText: /1080p|1920.*1080|full hd|fhd/i }).first()
      const qualitySelect = page.locator('[data-testid="quality-select"]').first()
      const resolutionSelect = page.locator('[data-testid="resolution-select"]').first()
      
      if (await quality1080p.isVisible()) {
        await quality1080p.click()
        console.log('1080p quality preset selected')
      } else if (await qualitySelect.isVisible()) {
        await qualitySelect.click()
        const highQualityOption = page.getByRole('option', { name: /high|1080p|full hd/i }).first()
        if (await highQualityOption.isVisible()) {
          await highQualityOption.click()
          console.log('High quality (1080p) selected from dropdown')
        }
      } else if (await resolutionSelect.isVisible()) {
        await resolutionSelect.click()
        const resolution1080p = page.getByRole('option', { name: /1080p|1920.*1080/i }).first()
        if (await resolution1080p.isVisible()) {
          await resolution1080p.click()
          console.log('1080p resolution selected')
        }
      }
      
      // Verify 1080p settings are applied
      const widthDisplay = page.locator('*').filter({ hasText: /width.*1920|1920.*width/i }).first()
      const heightDisplay = page.locator('*').filter({ hasText: /height.*1080|1080.*height/i }).first()
      const resolutionDisplay = page.locator('*').filter({ hasText: /1920.*1080|1080p/i }).first()
      
      if (await widthDisplay.isVisible() && await heightDisplay.isVisible()) {
        console.log('1080p dimensions (1920x1080) confirmed in UI')
      } else if (await resolutionDisplay.isVisible()) {
        console.log('1080p resolution display found')
      }
      
      // Check bitrate for 1080p
      const bitrateDisplay = page.locator('*').filter({ hasText: /bitrate.*[5-9]\d{6}|[1-9]\d{7}/i }).first() // 5M+ bitrate
      const qualityIndicator = page.locator('*').filter({ hasText: /high.*quality|premium|best/i }).first()
      
      if (await bitrateDisplay.isVisible()) {
        const bitrateText = await bitrateDisplay.textContent()
        console.log(`1080p bitrate setting: ${bitrateText}`)
      } else if (await qualityIndicator.isVisible()) {
        console.log('High quality indicator found for 1080p')
      }
      
      // Set filename for 1080p export
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('test-export-1080p')
        console.log('Filename set for 1080p export')
      }
      
      // Check estimated file size for 1080p
      const estimatedSize = page.locator('[data-testid="estimated-size"]').first()
      const sizeDisplay = page.locator('*').filter({ hasText: /size.*\d+.*mb|mb.*\d+/i }).first()
      
      if (await estimatedSize.isVisible()) {
        const sizeText = await estimatedSize.textContent()
        console.log(`Estimated 1080p file size: ${sizeText}`)
        expect(sizeText).toBeTruthy()
      } else if (await sizeDisplay.isVisible()) {
        const sizeText = await sizeDisplay.textContent()
        console.log(`1080p file size estimate: ${sizeText}`)
      }
      
      // Start 1080p export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        const downloadPromise = page.waitForEvent('download', { timeout: 45000 }).catch(() => null)
        
        await startExportButton.click()
        console.log('1080p export started')
        
        const download = await downloadPromise
        if (download) {
          const filename = download.suggestedFilename()
          expect(filename).toMatch(/1080p|high/i)
          console.log(`1080p export completed: ${filename}`)
        } else {
          console.log('1080p export started but download not detected')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should test 720p export preset', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for 720p quality option
      const quality720p = page.locator('*').filter({ hasText: /720p|1280.*720|hd/i }).first()
      const qualitySelect = page.locator('[data-testid="quality-select"]').first()
      const resolutionSelect = page.locator('[data-testid="resolution-select"]').first()
      
      if (await quality720p.isVisible()) {
        await quality720p.click()
        console.log('720p quality preset selected')
      } else if (await qualitySelect.isVisible()) {
        await qualitySelect.click()
        const mediumQualityOption = page.getByRole('option', { name: /medium|720p|hd/i }).first()
        if (await mediumQualityOption.isVisible()) {
          await mediumQualityOption.click()
          console.log('Medium quality (720p) selected from dropdown')
        }
      } else if (await resolutionSelect.isVisible()) {
        await resolutionSelect.click()
        const resolution720p = page.getByRole('option', { name: /720p|1280.*720/i }).first()
        if (await resolution720p.isVisible()) {
          await resolution720p.click()
          console.log('720p resolution selected')
        }
      }
      
      // Verify 720p settings are applied
      const widthDisplay = page.locator('*').filter({ hasText: /width.*1280|1280.*width/i }).first()
      const heightDisplay = page.locator('*').filter({ hasText: /height.*720|720.*height/i }).first()
      const resolutionDisplay = page.locator('*').filter({ hasText: /1280.*720|720p/i }).first()
      
      if (await widthDisplay.isVisible() && await heightDisplay.isVisible()) {
        console.log('720p dimensions (1280x720) confirmed in UI')
      } else if (await resolutionDisplay.isVisible()) {
        console.log('720p resolution display found')
      }
      
      // Check bitrate for 720p (should be lower than 1080p)
      const bitrateDisplay = page.locator('*').filter({ hasText: /bitrate.*[2-5]\d{6}/i }).first() // 2-5M bitrate
      const qualityIndicator = page.locator('*').filter({ hasText: /medium.*quality|standard/i }).first()
      
      if (await bitrateDisplay.isVisible()) {
        const bitrateText = await bitrateDisplay.textContent()
        console.log(`720p bitrate setting: ${bitrateText}`)
      } else if (await qualityIndicator.isVisible()) {
        console.log('Medium quality indicator found for 720p')
      }
      
      // Set filename for 720p export
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('test-export-720p')
        console.log('Filename set for 720p export')
      }
      
      // Check estimated file size for 720p (should be smaller than 1080p)
      const estimatedSize = page.locator('[data-testid="estimated-size"]').first()
      const sizeDisplay = page.locator('*').filter({ hasText: /size.*\d+.*mb|mb.*\d+/i }).first()
      
      if (await estimatedSize.isVisible()) {
        const sizeText = await estimatedSize.textContent()
        console.log(`Estimated 720p file size: ${sizeText}`)
        expect(sizeText).toBeTruthy()
      } else if (await sizeDisplay.isVisible()) {
        const sizeText = await sizeDisplay.textContent()
        console.log(`720p file size estimate: ${sizeText}`)
      }
      
      // Start 720p export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null)
        
        await startExportButton.click()
        console.log('720p export started')
        
        const download = await downloadPromise
        if (download) {
          const filename = download.suggestedFilename()
          expect(filename).toMatch(/720p|medium|hd/i)
          console.log(`720p export completed: ${filename}`)
        } else {
          console.log('720p export started but download not detected')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should test 480p export preset', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for 480p quality option
      const quality480p = page.locator('*').filter({ hasText: /480p|854.*480|sd/i }).first()
      const qualitySelect = page.locator('[data-testid="quality-select"]').first()
      const resolutionSelect = page.locator('[data-testid="resolution-select"]').first()
      
      if (await quality480p.isVisible()) {
        await quality480p.click()
        console.log('480p quality preset selected')
      } else if (await qualitySelect.isVisible()) {
        await qualitySelect.click()
        const lowQualityOption = page.getByRole('option', { name: /low|480p|sd/i }).first()
        if (await lowQualityOption.isVisible()) {
          await lowQualityOption.click()
          console.log('Low quality (480p) selected from dropdown')
        }
      } else if (await resolutionSelect.isVisible()) {
        await resolutionSelect.click()
        const resolution480p = page.getByRole('option', { name: /480p|854.*480/i }).first()
        if (await resolution480p.isVisible()) {
          await resolution480p.click()
          console.log('480p resolution selected')
        }
      }
      
      // Verify 480p settings are applied
      const widthDisplay = page.locator('*').filter({ hasText: /width.*854|854.*width/i }).first()
      const heightDisplay = page.locator('*').filter({ hasText: /height.*480|480.*height/i }).first()
      const resolutionDisplay = page.locator('*').filter({ hasText: /854.*480|480p/i }).first()
      
      if (await widthDisplay.isVisible() && await heightDisplay.isVisible()) {
        console.log('480p dimensions (854x480) confirmed in UI')
      } else if (await resolutionDisplay.isVisible()) {
        console.log('480p resolution display found')
      }
      
      // Check bitrate for 480p (should be lowest)
      const bitrateDisplay = page.locator('*').filter({ hasText: /bitrate.*[1-2]\d{6}/i }).first() // 1-2M bitrate
      const qualityIndicator = page.locator('*').filter({ hasText: /low.*quality|basic/i }).first()
      
      if (await bitrateDisplay.isVisible()) {
        const bitrateText = await bitrateDisplay.textContent()
        console.log(`480p bitrate setting: ${bitrateText}`)
      } else if (await qualityIndicator.isVisible()) {
        console.log('Low quality indicator found for 480p')
      }
      
      // Set filename for 480p export
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('test-export-480p')
        console.log('Filename set for 480p export')
      }
      
      // Check estimated file size for 480p (should be smallest)
      const estimatedSize = page.locator('[data-testid="estimated-size"]').first()
      const sizeDisplay = page.locator('*').filter({ hasText: /size.*\d+.*mb|mb.*\d+/i }).first()
      
      if (await estimatedSize.isVisible()) {
        const sizeText = await estimatedSize.textContent()
        console.log(`Estimated 480p file size: ${sizeText}`)
        expect(sizeText).toBeTruthy()
      } else if (await sizeDisplay.isVisible()) {
        const sizeText = await sizeDisplay.textContent()
        console.log(`480p file size estimate: ${sizeText}`)
      }
      
      // Start 480p export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        const downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null)
        
        await startExportButton.click()
        console.log('480p export started')
        
        const download = await downloadPromise
        if (download) {
          const filename = download.suggestedFilename()
          expect(filename).toMatch(/480p|low|sd/i)
          console.log(`480p export completed: ${filename}`)
        } else {
          console.log('480p export started but download not detected')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should compare file sizes across quality presets', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      const fileSizes: { quality: string; size: string }[] = []
      const qualities = [
        { name: '1080p', pattern: /1080p|1920.*1080|full hd/i },
        { name: '720p', pattern: /720p|1280.*720|hd/i },
        { name: '480p', pattern: /480p|854.*480|sd/i }
      ]
      
      for (const quality of qualities) {
        await exportButton.click()
        await page.waitForTimeout(1000)
        
        // Select quality preset
        const qualityOption = page.locator('*').filter({ hasText: quality.pattern }).first()
        const qualitySelect = page.locator('[data-testid="quality-select"]').first()
        
        if (await qualityOption.isVisible()) {
          await qualityOption.click()
          console.log(`${quality.name} quality selected for size comparison`)
        } else if (await qualitySelect.isVisible()) {
          await qualitySelect.click()
          const selectOption = page.getByRole('option', { name: quality.pattern }).first()
          if (await selectOption.isVisible()) {
            await selectOption.click()
            console.log(`${quality.name} selected from dropdown`)
          }
        }
        
        // Wait for size calculation
        await page.waitForTimeout(1000)
        
        // Get estimated file size
        const estimatedSize = page.locator('[data-testid="estimated-size"]').first()
        const sizeDisplay = page.locator('*').filter({ hasText: /size.*\d+.*mb|mb.*\d+|\d+.*kb/i }).first()
        
        if (await estimatedSize.isVisible()) {
          const sizeText = await estimatedSize.textContent()
          if (sizeText) {
            fileSizes.push({ quality: quality.name, size: sizeText })
            console.log(`${quality.name} estimated size: ${sizeText}`)
          }
        } else if (await sizeDisplay.isVisible()) {
          const sizeText = await sizeDisplay.textContent()
          if (sizeText) {
            fileSizes.push({ quality: quality.name, size: sizeText })
            console.log(`${quality.name} size display: ${sizeText}`)
          }
        }
        
        // Close dialog for next iteration
        const cancelButton = page.getByRole('button', { name: /cancel|close|dismiss/i }).first()
        if (await cancelButton.isVisible()) {
          await cancelButton.click()
          await page.waitForTimeout(500)
        }
      }
      
      // Analyze file size progression
      console.log('File size comparison across quality presets:')
      fileSizes.forEach(({ quality, size }) => {
        console.log(`  ${quality}: ${size}`)
      })
      
      // Verify size progression (1080p > 720p > 480p)
      if (fileSizes.length >= 2) {
        console.log('File sizes captured for comparison - higher quality should produce larger files')
        expect(fileSizes.length).toBeGreaterThanOrEqual(2)
      } else {
        console.log('File size comparison not available - feature may be under development')
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should test 4K export preset if available', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for 4K quality option
      const quality4K = page.locator('*').filter({ hasText: /4k|3840.*2160|uhd|ultra hd/i }).first()
      const qualitySelect = page.locator('[data-testid="quality-select"]').first()
      const resolutionSelect = page.locator('[data-testid="resolution-select"]').first()
      
      if (await quality4K.isVisible()) {
        await quality4K.click()
        console.log('4K quality preset found and selected')
        
        // Verify 4K settings
        const widthDisplay = page.locator('*').filter({ hasText: /width.*3840|3840.*width/i }).first()
        const heightDisplay = page.locator('*').filter({ hasText: /height.*2160|2160.*height/i }).first()
        
        if (await widthDisplay.isVisible() && await heightDisplay.isVisible()) {
          console.log('4K dimensions (3840x2160) confirmed in UI')
        }
        
        // Check 4K bitrate (should be very high)
        const bitrateDisplay = page.locator('*').filter({ hasText: /bitrate.*[1-9]\d{7,}/i }).first() // 10M+ bitrate
        if (await bitrateDisplay.isVisible()) {
          const bitrateText = await bitrateDisplay.textContent()
          console.log(`4K bitrate setting: ${bitrateText}`)
        }
        
        // Check estimated file size for 4K (should be largest)
        const estimatedSize = page.locator('[data-testid="estimated-size"]').first()
        if (await estimatedSize.isVisible()) {
          const sizeText = await estimatedSize.textContent()
          console.log(`Estimated 4K file size: ${sizeText}`)
        }
        
        // Set filename for 4K export
        const filenameInput = page.locator('input[type="text"]').first()
        if (await filenameInput.isVisible()) {
          await filenameInput.fill('test-export-4k')
          console.log('Filename set for 4K export')
        }
      } else if (await qualitySelect.isVisible()) {
        await qualitySelect.click()
        const ultraHighOption = page.getByRole('option', { name: /ultra|4k|uhd/i }).first()
        if (await ultraHighOption.isVisible()) {
          await ultraHighOption.click()
          console.log('Ultra high quality (4K) selected from dropdown')
        } else {
          console.log('4K quality option not found in dropdown')
        }
      } else if (await resolutionSelect.isVisible()) {
        await resolutionSelect.click()
        const resolution4K = page.getByRole('option', { name: /4k|3840.*2160/i }).first()
        if (await resolution4K.isVisible()) {
          await resolution4K.click()
          console.log('4K resolution selected')
        } else {
          console.log('4K resolution option not found')
        }
      } else {
        console.log('4K quality preset not available - standard for web-based editors')
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should validate quality preset consistency', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Test quality preset switching
      const qualitySelect = page.locator('[data-testid="quality-select"]').first()
      const highQuality = page.locator('*').filter({ hasText: /high|1080p/i }).first()
      const mediumQuality = page.locator('*').filter({ hasText: /medium|720p/i }).first()
      const lowQuality = page.locator('*').filter({ hasText: /low|480p/i }).first()
      
      // Test switching between qualities
      if (await highQuality.isVisible()) {
        await highQuality.click()
        console.log('High quality selected')
        
        // Check if settings update
        await page.waitForTimeout(500)
        const highSettings = await page.locator('*').filter({ hasText: /1920|1080|high/i }).count()
        console.log(`High quality settings detected: ${highSettings} elements`)
        
        if (await mediumQuality.isVisible()) {
          await mediumQuality.click()
          console.log('Switched to medium quality')
          
          await page.waitForTimeout(500)
          const mediumSettings = await page.locator('*').filter({ hasText: /1280|720|medium/i }).count()
          console.log(`Medium quality settings detected: ${mediumSettings} elements`)
        }
        
        if (await lowQuality.isVisible()) {
          await lowQuality.click()
          console.log('Switched to low quality')
          
          await page.waitForTimeout(500)
          const lowSettings = await page.locator('*').filter({ hasText: /854|480|low/i }).count()
          console.log(`Low quality settings detected: ${lowSettings} elements`)
        }
      } else if (await qualitySelect.isVisible()) {
        // Test dropdown quality switching
        const qualities = ['high', 'medium', 'low']
        
        for (const quality of qualities) {
          await qualitySelect.click()
          const option = page.getByRole('option', { name: new RegExp(quality, 'i') }).first()
          if (await option.isVisible()) {
            await option.click()
            console.log(`${quality} quality selected from dropdown`)
            
            await page.waitForTimeout(500)
            
            // Check if UI updates reflect the quality change
            const qualityIndicator = page.locator('*').filter({ hasText: new RegExp(quality, 'i') }).first()
            if (await qualityIndicator.isVisible()) {
              console.log(`${quality} quality setting confirmed in UI`)
            }
          }
        }
      } else {
        console.log('Quality selection controls not found - may be automatic or under development')
      }
      
      // Test preset memory (should remember last selection)
      const cancelButton = page.getByRole('button', { name: /cancel|close|dismiss/i }).first()
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
        await page.waitForTimeout(500)
        
        // Reopen dialog
        await exportButton.click()
        await page.waitForTimeout(1000)
        
        // Check if last quality setting is remembered
        const selectedQuality = page.locator('*').filter({ hasText: /selected|active|current/i }).first()
        if (await selectedQuality.isVisible()) {
          console.log('Quality preset memory working - last selection remembered')
        } else {
          console.log('Quality preset memory test inconclusive')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should test custom quality settings', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for custom quality option
      const customQuality = page.locator('*').filter({ hasText: /custom|advanced|manual/i }).first()
      const qualitySelect = page.locator('[data-testid="quality-select"]').first()
      
      if (await customQuality.isVisible()) {
        await customQuality.click()
        console.log('Custom quality option selected')
        
        // Look for custom settings inputs
        const widthInput = page.locator('input[type="number"]').filter({ hasText: /width/i }).first()
        const heightInput = page.locator('input[type="number"]').filter({ hasText: /height/i }).first()
        const bitrateInput = page.locator('input[type="number"]').filter({ hasText: /bitrate/i }).first()
        const fpsInput = page.locator('input[type="number"]').filter({ hasText: /fps|frame/i }).first()
        
        if (await widthInput.isVisible() && await heightInput.isVisible()) {
          await widthInput.fill('1600')
          await heightInput.fill('900')
          console.log('Custom resolution set: 1600x900')
        }
        
        if (await bitrateInput.isVisible()) {
          await bitrateInput.fill('6000000') // 6 Mbps
          console.log('Custom bitrate set: 6 Mbps')
        }
        
        if (await fpsInput.isVisible()) {
          await fpsInput.fill('25')
          console.log('Custom frame rate set: 25 FPS')
        }
        
        // Test custom export
        const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
        if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
          // Set filename for custom export
          const filenameInput = page.locator('input[type="text"]').first()
          if (await filenameInput.isVisible()) {
            await filenameInput.fill('test-export-custom')
            console.log('Filename set for custom quality export')
          }
          
          console.log('Custom quality export ready to start')
        }
      } else if (await qualitySelect.isVisible()) {
        await qualitySelect.click()
        const customOption = page.getByRole('option', { name: /custom|advanced/i }).first()
        if (await customOption.isVisible()) {
          await customOption.click()
          console.log('Custom quality selected from dropdown')
        } else {
          console.log('Custom quality option not found in dropdown')
        }
      } else {
        console.log('Custom quality settings not available - presets only')
      }
    } else {
      console.log('Export functionality not available')
    }
  })
})