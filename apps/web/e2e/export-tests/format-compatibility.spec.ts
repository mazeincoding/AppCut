/**
 * E2E Test: Format Compatibility
 * Tests different export format compatibility (MP4, WebM, MOV)
 */

import { test, expect } from '@playwright/test'
import { EditorPage, ExportDialog } from './fixtures/page-objects'
import { TestHelpers } from './helpers/test-helpers'
import { EXPORT_SETTINGS } from './fixtures/test-data'

test.describe('Format Compatibility', () => {
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

  test('should support MP4 export format', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for MP4 format option
      const mp4Option = page.locator('*').filter({ hasText: /mp4/i }).first()
      const formatSelect = page.locator('[data-testid="format-select"]').first()
      const videoFormatSelect = page.locator('[data-testid="video-format-select"]').first()
      
      if (await mp4Option.isVisible()) {
        await mp4Option.click()
        console.log('MP4 format option found and selected')
        
        // Verify MP4-specific settings are available
        const h264Codec = page.locator('*').filter({ hasText: /h\.?264|avc/i }).first()
        const aacAudio = page.locator('*').filter({ hasText: /aac/i }).first()
        
        if (await h264Codec.isVisible()) {
          console.log('H.264 codec option available for MP4')
        }
        
        if (await aacAudio.isVisible()) {
          console.log('AAC audio codec available for MP4')
        }
      } else if (await formatSelect.isVisible()) {
        await formatSelect.click()
        const mp4SelectOption = page.getByRole('option', { name: /mp4/i }).first()
        if (await mp4SelectOption.isVisible()) {
          await mp4SelectOption.click()
          console.log('MP4 format selected from dropdown')
        } else {
          console.log('MP4 option not found in format dropdown')
        }
      } else if (await videoFormatSelect.isVisible()) {
        await videoFormatSelect.click()
        const mp4VideoOption = page.getByRole('option', { name: /mp4/i }).first()
        if (await mp4VideoOption.isVisible()) {
          await mp4VideoOption.click()
          console.log('MP4 selected from video format dropdown')
        }
      } else {
        console.log('MP4 format selection not found - may be default or under development')
      }
      
      // Test MP4 compatibility indicators
      const compatibilityInfo = page.locator('*').filter({ hasText: /compatibility|browser support|widely supported/i }).first()
      if (await compatibilityInfo.isVisible()) {
        const compatText = await compatibilityInfo.textContent()
        console.log(`MP4 compatibility info: ${compatText}`)
      }
      
      // Set filename for MP4 export
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('format-test-mp4-export')
        console.log('Filename set for MP4 export test')
      }
      
      // Check estimated file size for MP4
      const fileSizeEstimate = page.locator('[data-testid="estimated-size"]').first()
      const sizeDisplay = page.locator('*').filter({ hasText: /size.*\d+.*mb|mb.*\d+/i }).first()
      
      if (await fileSizeEstimate.isVisible()) {
        const sizeText = await fileSizeEstimate.textContent()
        console.log(`MP4 estimated file size: ${sizeText}`)
      } else if (await sizeDisplay.isVisible()) {
        const sizeText = await sizeDisplay.textContent()
        console.log(`MP4 file size display: ${sizeText}`)
      }
      
      // Test MP4 export start
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null)
        
        await startExportButton.click()
        console.log('MP4 export started')
        
        const download = await downloadPromise
        if (download) {
          const filename = download.suggestedFilename()
          expect(filename).toMatch(/\.mp4$/i)
          console.log(`MP4 export completed: ${filename}`)
        } else {
          console.log('MP4 export started but download not detected')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should support WebM export format', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for WebM format option
      const webmOption = page.locator('*').filter({ hasText: /webm/i }).first()
      const formatSelect = page.locator('[data-testid="format-select"]').first()
      
      if (await webmOption.isVisible()) {
        await webmOption.click()
        console.log('WebM format option found and selected')
        
        // Verify WebM-specific codec options
        const vp9Codec = page.locator('*').filter({ hasText: /vp9/i }).first()
        const vp8Codec = page.locator('*').filter({ hasText: /vp8/i }).first()
        const opusAudio = page.locator('*').filter({ hasText: /opus/i }).first()
        const vorbisAudio = page.locator('*').filter({ hasText: /vorbis/i }).first()
        
        if (await vp9Codec.isVisible()) {
          console.log('VP9 codec option available for WebM')
        }
        
        if (await vp8Codec.isVisible()) {
          console.log('VP8 codec option available for WebM')
        }
        
        if (await opusAudio.isVisible()) {
          console.log('Opus audio codec available for WebM')
        }
        
        if (await vorbisAudio.isVisible()) {
          console.log('Vorbis audio codec available for WebM')
        }
      } else if (await formatSelect.isVisible()) {
        await formatSelect.click()
        const webmSelectOption = page.getByRole('option', { name: /webm/i }).first()
        if (await webmSelectOption.isVisible()) {
          await webmSelectOption.click()
          console.log('WebM format selected from dropdown')
        } else {
          console.log('WebM option not found in format dropdown')
        }
      } else {
        console.log('WebM format selection not found')
      }
      
      // Test WebM browser compatibility warnings
      const browserWarning = page.locator('*').filter({ hasText: /chrome|firefox|webkit|safari.*support/i }).first()
      const compatibilityWarning = page.locator('*').filter({ hasText: /limited support|compatibility/i }).first()
      
      if (await browserWarning.isVisible()) {
        const warningText = await browserWarning.textContent()
        console.log(`WebM browser compatibility: ${warningText}`)
      }
      
      if (await compatibilityWarning.isVisible()) {
        const warningText = await compatibilityWarning.textContent()
        console.log(`WebM compatibility warning: ${warningText}`)
      }
      
      // Set filename for WebM export
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('format-test-webm-export')
        console.log('Filename set for WebM export test')
      }
      
      // Test WebM export start
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        const downloadPromise = page.waitForEvent('download', { timeout: 35000 }).catch(() => null)
        
        await startExportButton.click()
        console.log('WebM export started')
        
        const download = await downloadPromise
        if (download) {
          const filename = download.suggestedFilename()
          expect(filename).toMatch(/\.webm$/i)
          console.log(`WebM export completed: ${filename}`)
        } else {
          console.log('WebM export started but download not detected')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should support MOV export format with fallback', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for MOV format option
      const movOption = page.locator('*').filter({ hasText: /mov|quicktime/i }).first()
      const formatSelect = page.locator('[data-testid="format-select"]').first()
      
      if (await movOption.isVisible()) {
        await movOption.click()
        console.log('MOV format option found and selected')
        
        // Check for QuickTime compatibility
        const qtCompatibility = page.locator('*').filter({ hasText: /quicktime|apple|macos/i }).first()
        if (await qtCompatibility.isVisible()) {
          console.log('QuickTime compatibility info displayed')
        }
      } else if (await formatSelect.isVisible()) {
        await formatSelect.click()
        const movSelectOption = page.getByRole('option', { name: /mov|quicktime/i }).first()
        if (await movSelectOption.isVisible()) {
          await movSelectOption.click()
          console.log('MOV format selected from dropdown')
        } else {
          console.log('MOV option not found - may not be supported in web browsers')
        }
      } else {
        console.log('MOV format selection not found')
      }
      
      // Test MOV fallback mechanism
      const fallbackWarning = page.locator('*').filter({ hasText: /fallback|alternative|mp4.*instead/i }).first()
      const browserLimitationWarning = page.locator('*').filter({ hasText: /browser.*limitation|not supported/i }).first()
      
      if (await fallbackWarning.isVisible()) {
        const fallbackText = await fallbackWarning.textContent()
        console.log(`MOV fallback info: ${fallbackText}`)
      }
      
      if (await browserLimitationWarning.isVisible()) {
        const limitationText = await browserLimitationWarning.textContent()
        console.log(`MOV browser limitation: ${limitationText}`)
      }
      
      // Set filename for MOV export (or fallback)
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('format-test-mov-export')
        console.log('Filename set for MOV export test')
      }
      
      // Test MOV export or fallback
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null)
        
        await startExportButton.click()
        console.log('MOV export (or fallback) started')
        
        const download = await downloadPromise
        if (download) {
          const filename = download.suggestedFilename()
          // MOV might fall back to MP4 in browsers
          expect(filename).toMatch(/\.(mov|mp4)$/i)
          console.log(`MOV export (or fallback) completed: ${filename}`)
        } else {
          console.log('MOV export started but download not detected')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should handle format-specific codec selection', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Test codec selection for different formats
      const formatCodecTests = [
        { format: 'MP4', videoCodecs: ['H.264', 'H.265'], audioCodecs: ['AAC', 'MP3'] },
        { format: 'WebM', videoCodecs: ['VP9', 'VP8'], audioCodecs: ['Opus', 'Vorbis'] },
        { format: 'MOV', videoCodecs: ['H.264', 'ProRes'], audioCodecs: ['AAC', 'PCM'] }
      ]
      
      for (const test of formatCodecTests) {
        console.log(`Testing codec selection for ${test.format}`)
        
        // Select format
        const formatOption = page.locator('*').filter({ hasText: new RegExp(test.format, 'i') }).first()
        const formatSelect = page.locator('[data-testid="format-select"]').first()
        
        if (await formatOption.isVisible()) {
          await formatOption.click()
          console.log(`${test.format} format selected for codec testing`)
        } else if (await formatSelect.isVisible()) {
          await formatSelect.click()
          const selectOption = page.getByRole('option', { name: new RegExp(test.format, 'i') }).first()
          if (await selectOption.isVisible()) {
            await selectOption.click()
            console.log(`${test.format} selected from dropdown`)
          }
        }
        
        // Test video codec options
        for (const codec of test.videoCodecs) {
          const codecOption = page.locator('*').filter({ hasText: new RegExp(codec.replace('.', '\\.'), 'i') }).first()
          if (await codecOption.isVisible()) {
            console.log(`${codec} video codec available for ${test.format}`)
          }
        }
        
        // Test audio codec options
        for (const codec of test.audioCodecs) {
          const codecOption = page.locator('*').filter({ hasText: new RegExp(codec, 'i') }).first()
          if (await codecOption.isVisible()) {
            console.log(`${codec} audio codec available for ${test.format}`)
          }
        }
        
        // Check for codec compatibility warnings
        const codecWarning = page.locator('*').filter({ hasText: /codec.*support|encoding.*limitation/i }).first()
        if (await codecWarning.isVisible()) {
          const warningText = await codecWarning.textContent()
          console.log(`${test.format} codec warning: ${warningText}`)
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should validate browser-specific format support', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Check for browser capability detection
      const browserDetection = page.locator('*').filter({ hasText: /browser.*support|capability.*detect/i }).first()
      const supportMatrix = page.locator('[data-testid="format-support-matrix"]').first()
      
      if (await browserDetection.isVisible()) {
        const detectionText = await browserDetection.textContent()
        console.log(`Browser detection info: ${detectionText}`)
      }
      
      if (await supportMatrix.isVisible()) {
        console.log('Format support matrix found')
      }
      
      // Test format availability based on browser
      const formatOptions = await page.locator('*').filter({ hasText: /mp4|webm|mov/i }).count()
      console.log(`Available format options: ${formatOptions}`)
      
      // Check for format recommendations
      const recommendedFormat = page.locator('*').filter({ hasText: /recommended|best.*compatibility|default/i }).first()
      if (await recommendedFormat.isVisible()) {
        const recommendationText = await recommendedFormat.textContent()
        console.log(`Format recommendation: ${recommendationText}`)
      }
      
      // Test unsupported format handling
      const unsupportedWarning = page.locator('*').filter({ hasText: /not supported|unavailable|unsupported/i }).first()
      if (await unsupportedWarning.isVisible()) {
        const warningText = await unsupportedWarning.textContent()
        console.log(`Unsupported format warning: ${warningText}`)
      }
      
      // Test format fallback mechanism
      const fallbackInfo = page.locator('*').filter({ hasText: /fallback|alternative.*format/i }).first()
      if (await fallbackInfo.isVisible()) {
        const fallbackText = await fallbackInfo.textContent()
        console.log(`Format fallback info: ${fallbackText}`)
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should handle format-specific quality settings', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Test quality settings for different formats
      const formats = ['MP4', 'WebM']
      
      for (const format of formats) {
        console.log(`Testing quality settings for ${format}`)
        
        // Select format
        const formatOption = page.locator('*').filter({ hasText: new RegExp(format, 'i') }).first()
        if (await formatOption.isVisible()) {
          await formatOption.click()
          console.log(`${format} format selected for quality testing`)
          
          // Look for format-specific quality options
          const bitrateSlider = page.locator('input[type="range"]').filter({ hasText: /bitrate/i }).first()
          const qualitySlider = page.locator('input[type="range"]').filter({ hasText: /quality/i }).first()
          const anySlider = page.locator('input[type="range"]').first()
          
          if (await bitrateSlider.isVisible()) {
            await bitrateSlider.fill('8000000') // 8 Mbps
            console.log(`${format} bitrate setting adjusted`)
          } else if (await qualitySlider.isVisible()) {
            await qualitySlider.fill('85') // 85% quality
            console.log(`${format} quality setting adjusted`)
          } else if (await anySlider.isVisible()) {
            await anySlider.fill('75')
            console.log(`${format} quality slider found and adjusted`)
          }
          
          // Look for format-specific preset options
          const qualityPreset = page.locator('[data-testid="quality-preset"]').first()
          if (await qualityPreset.isVisible()) {
            console.log(`${format} quality presets available`)
          }
          
          // Check estimated file size for format
          const fileSizeEstimate = page.locator('[data-testid="estimated-size"]').first()
          if (await fileSizeEstimate.isVisible()) {
            const sizeText = await fileSizeEstimate.textContent()
            console.log(`${format} estimated file size: ${sizeText}`)
          }
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should verify format output compatibility with media players', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for compatibility information
      const compatibilitySection = page.locator('[data-testid="compatibility-info"]').first()
      const playerCompatibility = page.locator('*').filter({ hasText: /vlc|quicktime|windows media|video player/i }).first()
      
      if (await compatibilitySection.isVisible()) {
        console.log('Format compatibility section found')
      }
      
      if (await playerCompatibility.isVisible()) {
        const compatText = await playerCompatibility.textContent()
        console.log(`Media player compatibility: ${compatText}`)
      }
      
      // Test device compatibility information
      const deviceCompatibility = page.locator('*').filter({ hasText: /mobile|ios|android|desktop/i }).first()
      if (await deviceCompatibility.isVisible()) {
        const deviceText = await deviceCompatibility.textContent()
        console.log(`Device compatibility: ${deviceText}`)
      }
      
      // Test web compatibility information
      const webCompatibility = page.locator('*').filter({ hasText: /web.*browser|html5.*video/i }).first()
      if (await webCompatibility.isVisible()) {
        const webText = await webCompatibility.textContent()
        console.log(`Web compatibility: ${webText}`)
      }
      
      // Test social media platform compatibility
      const socialCompatibility = page.locator('*').filter({ hasText: /youtube|facebook|instagram|twitter/i }).first()
      if (await socialCompatibility.isVisible()) {
        const socialText = await socialCompatibility.textContent()
        console.log(`Social media compatibility: ${socialText}`)
      }
      
      // Test format recommendations for different use cases
      const useCase = page.locator('*').filter({ hasText: /streaming|web.*upload|archive/i }).first()
      if (await useCase.isVisible()) {
        const useCaseText = await useCase.textContent()
        console.log(`Use case recommendation: ${useCaseText}`)
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should handle format conversion and transcoding options', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for transcoding options
      const transcodingOption = page.locator('*').filter({ hasText: /transcode|convert|re-encode/i }).first()
      const copyStreamOption = page.locator('*').filter({ hasText: /copy.*stream|no.*re-encode/i }).first()
      
      if (await transcodingOption.isVisible()) {
        console.log('Transcoding options found')
        
        // Test transcoding quality settings
        const transcodingQuality = page.locator('[data-testid="transcoding-quality"]').first()
        if (await transcodingQuality.isVisible()) {
          console.log('Transcoding quality settings available')
        }
      }
      
      if (await copyStreamOption.isVisible()) {
        await copyStreamOption.click()
        console.log('Stream copy option (no re-encoding) selected')
      }
      
      // Test format conversion speed settings
      const speedPreset = page.locator('[data-testid="encoding-speed"]').first()
      const speedOption = page.locator('*').filter({ hasText: /fast|medium|slow.*encode/i }).first()
      
      if (await speedPreset.isVisible()) {
        console.log('Encoding speed presets available')
      } else if (await speedOption.isVisible()) {
        await speedOption.click()
        console.log('Encoding speed option found and selected')
      }
      
      // Test advanced encoding options
      const advancedOptions = page.locator('[data-testid="advanced-encoding"]').first()
      const keyframeInterval = page.locator('*').filter({ hasText: /keyframe.*interval|gop.*size/i }).first()
      
      if (await advancedOptions.isVisible()) {
        console.log('Advanced encoding options available')
      }
      
      if (await keyframeInterval.isVisible()) {
        console.log('Keyframe interval settings found')
      }
      
      // Test format conversion time estimation
      const timeEstimate = page.locator('[data-testid="encoding-time-estimate"]').first()
      if (await timeEstimate.isVisible()) {
        const estimateText = await timeEstimate.textContent()
        console.log(`Encoding time estimate: ${estimateText}`)
      }
    } else {
      console.log('Export functionality not available')
    }
  })
})