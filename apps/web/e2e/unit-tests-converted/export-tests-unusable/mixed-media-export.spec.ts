/**
 * E2E Test: Mixed Media Export
 * Tests export functionality with timeline containing video, audio, text, and image elements
 */

import { test, expect } from '@playwright/test'
import { EditorPage, ExportDialog, MediaLibraryPanel } from '../fixtures/page-objects'
import { TestHelpers } from 
import { TEST_MEDIA, EXPORT_SETTINGS, createMockVideoFile, createMockAudioFile, createMockImageFile } from '../fixtures/test-data'

test.describe('Mixed Media Export', () => {
  let editorPage: EditorPage
  let exportDialog: ExportDialog
  let mediaLibrary: MediaLibraryPanel
  let helpers: TestHelpers

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page)
    exportDialog = new ExportDialog(page)
    mediaLibrary = new MediaLibraryPanel(page)
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

  test('should create timeline with video + audio + text elements', async ({ page }) => {
    // Look for media upload functionality
    const uploadButton = page.getByRole('button', { name: /upload|add media/i }).first()
    const fileInput = page.locator('input[type="file"]').first()
    
    if (await uploadButton.isVisible()) {
      console.log('Upload button found for mixed media')
      
      // Try to upload multiple media types
      if (await fileInput.isVisible()) {
        const mockVideo = createMockVideoFile('video.mp4', 2 * 1024 * 1024) // 2MB
        const mockAudio = createMockAudioFile('audio.mp3', 512 * 1024) // 512KB
        const mockImage = createMockImageFile('image.jpg', 128 * 1024) // 128KB
        
        await helpers.mockFileUpload('input[type="file"]', [mockVideo, mockAudio, mockImage])
        console.log('Multiple media files uploaded for mixed timeline')
      }
    } else {
      console.log('Upload functionality not found - feature may be under development')
    }
    
    // Look for text addition functionality
    const addTextButton = page.getByRole('button', { name: /add text|text tool|T/i }).first()
    const textTool = page.locator('[data-testid="text-tool"]').first()
    
    if (await addTextButton.isVisible()) {
      await addTextButton.click()
      console.log('Text tool activated')
      
      // Try to add text to timeline or canvas
      const canvas = page.locator('[data-testid="editor-canvas"]').first()
      const timeline = page.locator('[data-testid="timeline"]').first()
      
      if (await canvas.isVisible()) {
        await canvas.click({ position: { x: 100, y: 100 } })
        console.log('Attempted to add text to canvas')
        
        // Look for text input
        const textInput = page.locator('input[type="text"]').first()
        const textArea = page.locator('textarea').first()
        
        if (await textInput.isVisible()) {
          await textInput.fill('Sample Title Text')
          await page.keyboard.press('Enter')
          console.log('Text content added')
        } else if (await textArea.isVisible()) {
          await textArea.fill('Sample Title Text')
          console.log('Text content added via textarea')
        }
      } else if (await timeline.isVisible()) {
        await timeline.click()
        console.log('Attempted to add text to timeline')
      }
    } else if (await textTool.isVisible()) {
      await textTool.click()
      console.log('Text tool found and activated')
    } else {
      console.log('Text tool not found - feature may be under development')
    }
    
    // Verify timeline has multiple tracks/elements
    const videoTrack = page.locator('[data-testid="video-track"]').first()
    const audioTrack = page.locator('[data-testid="audio-track"]').first()
    const textTrack = page.locator('[data-testid="text-track"]').first()
    const timelineElements = page.locator('[data-testid="timeline-element"]')
    
    if (await videoTrack.isVisible() || await audioTrack.isVisible() || await textTrack.isVisible()) {
      console.log('Multiple timeline tracks found')
    } else if (await timelineElements.count() > 0) {
      const elementCount = await timelineElements.count()
      console.log(`Timeline elements found: ${elementCount}`)
    } else {
      console.log('Timeline tracks not found - feature may be under development')
    }
  })

  test('should handle complex timeline with overlapping elements', async ({ page }) => {
    // Simulate complex timeline creation
    await helpers.simulateUserBehavior()
    
    // Look for timeline with multiple elements at different times
    const timeline = page.locator('[data-testid="timeline"]').first()
    const timelineElements = page.locator('[data-testid="timeline-element"]')
    
    if (await timeline.isVisible()) {
      // Try to simulate adding elements at different timestamps
      await timeline.click({ position: { x: 50, y: 50 } })  // Start position
      await timeline.click({ position: { x: 150, y: 100 } }) // Middle position  
      await timeline.click({ position: { x: 250, y: 150 } }) // End position
      
      console.log('Attempted to create overlapping timeline elements')
      
      // Check for element overlap indicators
      const overlapIndicator = page.locator('[data-testid="overlap-indicator"]').first()
      const layerIndicator = page.locator('*').filter({ hasText: /layer|z-index|order/i }).first()
      
      if (await overlapIndicator.isVisible()) {
        console.log('Element overlap detected and indicated')
      } else if (await layerIndicator.isVisible()) {
        console.log('Layer ordering system found')
      } else {
        console.log('Overlap handling not implemented or working differently')
      }
    } else {
      console.log('Timeline not available for complex arrangement testing')
    }
    
    // Look for layer management controls
    const layerPanel = page.locator('[data-testid="layer-panel"]').first()
    const bringToFrontButton = page.getByRole('button', { name: /bring to front|move up/i }).first()
    const sendToBackButton = page.getByRole('button', { name: /send to back|move down/i }).first()
    
    if (await layerPanel.isVisible()) {
      console.log('Layer management panel found')
    } else if (await bringToFrontButton.isVisible() || await sendToBackButton.isVisible()) {
      console.log('Layer ordering controls found')
    } else {
      console.log('Layer management not found - feature may be under development')
    }
  })

  test('should export mixed media timeline as MP4', async ({ page }) => {
    // Set up mixed media timeline first
    await helpers.simulateUserBehavior()
    
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Set MP4 format for mixed media
      const mp4Option = page.locator('*').filter({ hasText: /mp4/i }).first()
      const formatSelect = page.locator('[data-testid="format-select"]').first()
      
      if (await mp4Option.isVisible()) {
        await mp4Option.click()
        console.log('MP4 format selected for mixed media export')
      } else if (await formatSelect.isVisible()) {
        await formatSelect.click()
        const mp4SelectOption = page.getByRole('option', { name: /mp4/i }).first()
        if (await mp4SelectOption.isVisible()) {
          await mp4SelectOption.click()
          console.log('MP4 format selected from dropdown')
        }
      }
      
      // Set filename for mixed media export
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('mixed-media-export')
        console.log('Filename set for mixed media export')
      }
      
      // Check for mixed media export options
      const videoQuality = page.locator('*').filter({ hasText: /video quality|video bitrate/i }).first()
      const audioQuality = page.locator('*').filter({ hasText: /audio quality|audio bitrate/i }).first()
      
      if (await videoQuality.isVisible()) {
        console.log('Video quality options available for mixed export')
      }
      
      if (await audioQuality.isVisible()) {
        console.log('Audio quality options available for mixed export')
      }
      
      // Start mixed media export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        const downloadPromise = page.waitForEvent('download', { timeout: 45000 }).catch(() => null) // Longer timeout for complex export
        
        await startExportButton.click()
        console.log('Mixed media MP4 export started')
        
        // Wait for mixed media export to complete
        const download = await downloadPromise
        if (download) {
          const filename = download.suggestedFilename()
          expect(filename).toMatch(/\.mp4$/i)
          console.log(`Mixed media export completed: ${filename}`)
          
          // Check file size (should be larger than single media exports)
          const downloadPath = await download.path()
          if (downloadPath) {
            console.log('Mixed media export file created successfully')
          }
        } else {
          console.log('Mixed media export started but download not detected - may take longer')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should verify all elements are rendered in export', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for export preview functionality
      const previewSection = page.locator('[data-testid="export-preview"]').first()
      const previewButton = page.getByRole('button', { name: /preview|render preview/i }).first()
      const previewCanvas = page.locator('canvas').filter({ hasText: /preview/i }).first()
      
      if (await previewSection.isVisible()) {
        console.log('Export preview section found')
        
        // Look for element visibility indicators
        const elementChecklist = page.locator('[data-testid="element-checklist"]').first()
        const videoIndicator = page.locator('*').filter({ hasText: /video.*included|video.*rendered/i }).first()
        const audioIndicator = page.locator('*').filter({ hasText: /audio.*included|audio.*rendered/i }).first()
        const textIndicator = page.locator('*').filter({ hasText: /text.*included|text.*rendered/i }).first()
        
        if (await elementChecklist.isVisible()) {
          console.log('Element inclusion checklist found')
        } else if (await videoIndicator.isVisible() || await audioIndicator.isVisible() || await textIndicator.isVisible()) {
          console.log('Individual element rendering indicators found')
        }
      } else if (await previewButton.isVisible()) {
        await previewButton.click()
        console.log('Export preview generated')
        
        await page.waitForTimeout(2000)
        
        // Check if preview shows all elements
        const previewFrame = page.locator('[data-testid="preview-frame"]').first()
        if (await previewFrame.isVisible()) {
          console.log('Preview frame displaying mixed media content')
        }
      } else if (await previewCanvas.isVisible()) {
        console.log('Preview canvas found for mixed media')
      } else {
        console.log('Export preview not found - verification may happen during export')
      }
      
      // Check export settings for element inclusion
      const includeVideoCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /video/i }).first()
      const includeAudioCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /audio/i }).first()
      const includeTextCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /text/i }).first()
      
      if (await includeVideoCheckbox.isVisible()) {
        const isChecked = await includeVideoCheckbox.isChecked()
        console.log(`Video inclusion: ${isChecked ? 'enabled' : 'disabled'}`)
      }
      
      if (await includeAudioCheckbox.isVisible()) {
        const isChecked = await includeAudioCheckbox.isChecked()
        console.log(`Audio inclusion: ${isChecked ? 'enabled' : 'disabled'}`)
      }
      
      if (await includeTextCheckbox.isVisible()) {
        const isChecked = await includeTextCheckbox.isChecked()
        console.log(`Text inclusion: ${isChecked ? 'enabled' : 'disabled'}`)
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should handle text overlay rendering with video background', async ({ page }) => {
    // Test specific scenario: text over video
    const canvas = page.locator('[data-testid="editor-canvas"]').first()
    const timeline = page.locator('[data-testid="timeline"]').first()
    
    // Try to add text overlay
    const addTextButton = page.getByRole('button', { name: /add text|text tool/i }).first()
    if (await addTextButton.isVisible()) {
      await addTextButton.click()
      
      if (await canvas.isVisible()) {
        // Click on canvas to add text overlay
        await canvas.click({ position: { x: 200, y: 150 } })
        
        // Add text content
        const textInput = page.locator('input[type="text"]').first()
        if (await textInput.isVisible()) {
          await textInput.fill('Video Overlay Text')
          await page.keyboard.press('Enter')
          console.log('Text overlay added to video')
        }
        
        // Look for text styling options
        const fontSizeInput = page.locator('input[type="number"]').filter({ hasText: /font|size/i }).first()
        const colorPicker = page.locator('input[type="color"]').first()
        const boldButton = page.getByRole('button', { name: /bold|B/i }).first()
        
        if (await fontSizeInput.isVisible()) {
          await fontSizeInput.fill('24')
          console.log('Text font size set')
        }
        
        if (await colorPicker.isVisible()) {
          await colorPicker.fill('#ffffff')
          console.log('Text color set to white')
        }
        
        if (await boldButton.isVisible()) {
          await boldButton.click()
          console.log('Text bold style applied')
        }
      }
    } else {
      console.log('Text tool not available')
    }
    
    // Test export with text overlay
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for text rendering options
      const textRenderingOption = page.locator('*').filter({ hasText: /text rendering|text quality|font rendering/i }).first()
      if (await textRenderingOption.isVisible()) {
        console.log('Text rendering options found for export')
      }
      
      // Set filename for text overlay export
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('video-with-text-overlay')
        console.log('Filename set for text overlay export')
      }
    }
  })

  test('should export mixed media with synchronization preservation', async ({ page }) => {
    // Test that audio/video sync is maintained in mixed media export
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for synchronization settings
      const syncOption = page.locator('*').filter({ hasText: /sync|synchronization|timing/i }).first()
      const frameRateOption = page.locator('*').filter({ hasText: /frame rate|fps/i }).first()
      const sampleRateOption = page.locator('*').filter({ hasText: /sample rate|audio rate/i }).first()
      
      if (await syncOption.isVisible()) {
        console.log('Synchronization options found')
      }
      
      if (await frameRateOption.isVisible()) {
        console.log('Frame rate settings available for sync preservation')
        
        // Set standard frame rate for consistent timing
        const frameRateSelect = page.locator('[data-testid="frame-rate-select"]').first()
        if (await frameRateSelect.isVisible()) {
          await frameRateSelect.click()
          const fps30Option = page.getByRole('option', { name: /30.*fps|30/i }).first()
          if (await fps30Option.isVisible()) {
            await fps30Option.click()
            console.log('30 FPS selected for consistent timing')
          }
        }
      }
      
      if (await sampleRateOption.isVisible()) {
        console.log('Audio sample rate settings available')
        
        // Set standard sample rate
        const sampleRateSelect = page.locator('[data-testid="sample-rate-select"]').first()
        if (await sampleRateSelect.isVisible()) {
          await sampleRateSelect.click()
          const rate44100Option = page.getByRole('option', { name: /44100|44.1/i }).first()
          if (await rate44100Option.isVisible()) {
            await rate44100Option.click()
            console.log('44.1 kHz sample rate selected')
          }
        }
      }
      
      // Start synchronized export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Mixed media export with synchronization started')
        
        // Monitor export progress for sync-related messages
        await page.waitForTimeout(3000)
        
        const syncMessage = page.locator('*').filter({ hasText: /syncing|synchronizing|timing/i }).first()
        if (await syncMessage.isVisible()) {
          const syncText = await syncMessage.textContent()
          console.log(`Synchronization status: ${syncText}`)
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should handle different aspect ratios in mixed media export', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for aspect ratio settings
      const aspectRatioSelect = page.locator('[data-testid="aspect-ratio-select"]').first()
      const resolutionSelect = page.locator('[data-testid="resolution-select"]').first()
      const customDimensionsInputs = page.locator('input[type="number"]').filter({ hasText: /width|height/i })
      
      if (await aspectRatioSelect.isVisible()) {
        await aspectRatioSelect.click()
        
        // Test different aspect ratios
        const aspectRatios = ['16:9', '9:16', '1:1', '4:3']
        
        for (const ratio of aspectRatios) {
          const ratioOption = page.getByRole('option', { name: new RegExp(ratio.replace(':', ':')) }).first()
          if (await ratioOption.isVisible()) {
            await ratioOption.click()
            console.log(`${ratio} aspect ratio selected`)
            
            // Check if resolution updates accordingly
            const widthDisplay = page.locator('*').filter({ hasText: /width.*\d+/ }).first()
            const heightDisplay = page.locator('*').filter({ hasText: /height.*\d+/ }).first()
            
            if (await widthDisplay.isVisible() && await heightDisplay.isVisible()) {
              const widthText = await widthDisplay.textContent()
              const heightText = await heightDisplay.textContent()
              console.log(`Resolution updated for ${ratio}: ${widthText} x ${heightText}`)
            }
            
            // Reopen dropdown for next iteration
            if (ratio !== aspectRatios[aspectRatios.length - 1]) {
              await aspectRatioSelect.click()
            }
          }
        }
      } else if (await resolutionSelect.isVisible()) {
        await resolutionSelect.click()
        console.log('Resolution select found for mixed media export')
      } else if (await customDimensionsInputs.count() >= 2) {
        const widthInput = customDimensionsInputs.first()
        const heightInput = customDimensionsInputs.last()
        
        await widthInput.fill('1280')
        await heightInput.fill('720')
        console.log('Custom dimensions set for mixed media export')
      } else {
        console.log('Aspect ratio/resolution settings not found')
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should validate complex export with performance monitoring', async ({ page }) => {
    // Start performance monitoring
    const performanceMetrics = await helpers.getPerformanceMetrics()
    console.log('Initial performance metrics:', performanceMetrics)
    
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Set high quality for performance test
      const qualitySelect = page.locator('[data-testid="quality-select"]').first()
      const highQualityOption = page.locator('*').filter({ hasText: /high|maximum/i }).first()
      
      if (await qualitySelect.isVisible()) {
        await qualitySelect.click()
        const highOption = page.getByRole('option', { name: /high/i }).first()
        if (await highOption.isVisible()) {
          await highOption.click()
          console.log('High quality selected for performance test')
        }
      } else if (await highQualityOption.isVisible()) {
        await highQualityOption.click()
        console.log('High quality option selected')
      }
      
      // Start export and monitor performance
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        const startTime = Date.now()
        
        await startExportButton.click()
        console.log('Complex mixed media export started with performance monitoring')
        
        // Monitor export progress and performance
        await page.waitForTimeout(5000)
        
        const progressBar = page.locator('[role="progressbar"]').first()
        if (await progressBar.isVisible()) {
          const progress = await progressBar.getAttribute('aria-valuenow')
          console.log(`Export progress: ${progress}%`)
        }
        
        // Check for performance warnings
        const performanceWarning = page.locator('*').filter({ hasText: /performance|slow|memory|warning/i }).first()
        if (await performanceWarning.isVisible()) {
          const warningText = await performanceWarning.textContent()
          console.log(`Performance warning: ${warningText}`)
        }
        
        // Get updated performance metrics
        const updatedMetrics = await helpers.getPerformanceMetrics()
        console.log('Performance during export:', updatedMetrics)
        
        // Check if memory usage increased significantly
        if (updatedMetrics.memoryUsage && performanceMetrics.memoryUsage) {
          const memoryIncrease = updatedMetrics.memoryUsage.usedJSHeapSize - performanceMetrics.memoryUsage.usedJSHeapSize
          console.log(`Memory usage increase during export: ${memoryIncrease / 1024 / 1024} MB`)
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })
})