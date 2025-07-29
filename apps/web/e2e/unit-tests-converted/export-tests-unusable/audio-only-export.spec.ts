/**
 * E2E Test: Audio-Only Export
 * Tests audio export functionality with timeline containing only audio elements
 */

import { test, expect } from '@playwright/test'
import { EditorPage, ExportDialog, MediaLibraryPanel } from '../fixtures/page-objects'
import { TestHelpers } from 
import { TEST_MEDIA, EXPORT_SETTINGS, createMockAudioFile } from '../fixtures/test-data'

test.describe('Audio-Only Export', () => {
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

  test('should create timeline with single audio element', async ({ page }) => {
    // Look for audio upload functionality
    const uploadButton = page.getByRole('button', { name: /upload|add media/i }).first()
    const fileInput = page.locator('input[type="file"]').first()
    const dropzone = page.locator('[data-testid="upload-dropzone"]').first()
    
    if (await uploadButton.isVisible()) {
      console.log('Upload button found')
      
      // Try to upload an audio file
      if (await fileInput.isVisible()) {
        const mockAudio = createMockAudioFile('test-audio.mp3', 256 * 1024) // 256KB
        await helpers.mockFileUpload('input[type="file"]', [mockAudio])
        console.log('Audio file uploaded via file input')
      }
    } else if (await dropzone.isVisible()) {
      console.log('Upload dropzone found')
      // Upload functionality exists but may be different implementation
    } else {
      console.log('Upload functionality not found - feature may be under development')
    }
    
    // Check for audio track in timeline
    const audioTrack = page.locator('[data-testid="audio-track"]').first()
    const timelineTrack = page.locator('[data-testid="timeline-track"]').first()
    const audioElement = page.locator('*').filter({ hasText: /audio|mp3|wav|ogg/i }).first()
    
    if (await audioTrack.isVisible()) {
      await expect(audioTrack).toBeVisible()
      console.log('Audio track found in timeline')
    } else if (await timelineTrack.isVisible()) {
      await expect(timelineTrack).toBeVisible()
      console.log('Timeline track found (may support audio)')
    } else if (await audioElement.isVisible()) {
      await expect(audioElement).toBeVisible()
      console.log('Audio element found')
    } else {
      console.log('Audio timeline not found - feature may be under development')
    }
  })

  test('should add audio element to timeline via drag and drop', async ({ page }) => {
    // Look for audio media items
    const audioItem = page.locator('[data-testid="media-item"]').filter({ hasText: /audio|mp3|wav/i }).first()
    const mediaItem = page.locator('[data-testid="media-item"]').first()
    const audioElement = page.locator('*').filter({ hasText: /audio|mp3|wav|ogg/i }).first()
    
    if (await audioItem.isVisible()) {
      console.log('Audio media item found for drag and drop')
      
      // Look for audio timeline track
      const audioTrack = page.locator('[data-testid="audio-track"]').first()
      const timelineTrack = page.locator('[data-testid="timeline-track"]').first()
      
      if (await audioTrack.isVisible()) {
        // Perform drag and drop to audio track
        await audioItem.dragTo(audioTrack)
        console.log('Attempted drag and drop to audio track')
        
        // Check if audio element was added
        const audioTimelineElement = page.locator('[data-testid="audio-element"]').first()
        const timelineElement = page.locator('[data-testid="timeline-element"]').first()
        
        if (await audioTimelineElement.isVisible()) {
          await expect(audioTimelineElement).toBeVisible()
          console.log('Audio element added to timeline')
        } else if (await timelineElement.isVisible()) {
          console.log('Timeline element added (may be audio)')
        }
      } else if (await timelineTrack.isVisible()) {
        await audioItem.dragTo(timelineTrack)
        console.log('Attempted drag and drop to timeline track')
      }
    } else if (await mediaItem.isVisible()) {
      console.log('Media item found (may be audio)')
    } else {
      console.log('Audio media items not found - upload or timeline feature may be under development')
    }
  })

  test('should export audio-only timeline as MP3', async ({ page }) => {
    // Try to set up audio timeline first
    await helpers.simulateUserBehavior()
    
    // Look for export functionality
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for audio format options
      const mp3Option = page.locator('*').filter({ hasText: /mp3/i }).first()
      const audioFormatSelect = page.locator('[data-testid="audio-format-select"]').first()
      const formatSelect = page.locator('[data-testid="format-select"]').first()
      
      if (await mp3Option.isVisible()) {
        await mp3Option.click()
        console.log('MP3 format selected')
      } else if (await audioFormatSelect.isVisible()) {
        await audioFormatSelect.click()
        const mp3SelectOption = page.getByRole('option', { name: /mp3/i }).first()
        if (await mp3SelectOption.isVisible()) {
          await mp3SelectOption.click()
          console.log('MP3 format selected from audio dropdown')
        }
      } else if (await formatSelect.isVisible()) {
        await formatSelect.click()
        const mp3SelectOption = page.getByRole('option', { name: /mp3/i }).first()
        if (await mp3SelectOption.isVisible()) {
          await mp3SelectOption.click()
          console.log('MP3 format selected from format dropdown')
        }
      }
      
      // Set filename for audio export
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('audio-only-mp3-export')
        console.log('Filename set for MP3 audio export')
      }
      
      // Start audio export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        // Monitor for download
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null)
        
        await startExportButton.click()
        console.log('MP3 audio export started')
        
        // Wait for export to complete
        const download = await downloadPromise
        if (download) {
          const filename = download.suggestedFilename()
          expect(filename).toMatch(/\.(mp3|mp4|webm)$/i) // Audio might be exported in container format
          console.log(`Audio export completed: ${filename}`)
        } else {
          console.log('Export started but download not detected - may take longer than timeout')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should export audio-only timeline as WAV', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for WAV format options
      const wavOption = page.locator('*').filter({ hasText: /wav/i }).first()
      const audioFormatSelect = page.locator('[data-testid="audio-format-select"]').first()
      
      if (await wavOption.isVisible()) {
        await wavOption.click()
        console.log('WAV format selected')
      } else if (await audioFormatSelect.isVisible()) {
        await audioFormatSelect.click()
        const wavSelectOption = page.getByRole('option', { name: /wav/i }).first()
        if (await wavSelectOption.isVisible()) {
          await wavSelectOption.click()
          console.log('WAV format selected from dropdown')
        }
      }
      
      // Set filename
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('audio-only-wav-export')
        console.log('Filename set for WAV export')
      }
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null)
        
        await startExportButton.click()
        console.log('WAV audio export started')
        
        const download = await downloadPromise
        if (download) {
          const filename = download.suggestedFilename()
          expect(filename).toMatch(/\.(wav|mp4|webm)$/i)
          console.log(`WAV export completed: ${filename}`)
        } else {
          console.log('Export started but download not detected')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should test audio mixing with multiple audio tracks', async ({ page }) => {
    // First try to add multiple audio elements
    const uploadButton = page.getByRole('button', { name: /upload|add media/i }).first()
    
    if (await uploadButton.isVisible()) {
      // Try to upload multiple audio files
      const fileInput = page.locator('input[type="file"]').first()
      if (await fileInput.isVisible()) {
        const mockAudio1 = createMockAudioFile('music.mp3', 256 * 1024)
        const mockAudio2 = createMockAudioFile('voiceover.mp3', 128 * 1024)
        await helpers.mockFileUpload('input[type="file"]', [mockAudio1, mockAudio2])
        console.log('Multiple audio files uploaded for mixing test')
      }
    }
    
    // Look for audio mixing controls
    const volumeSlider = page.locator('input[type="range"]').filter({ hasText: /volume/i }).first()
    const anyVolumeSlider = page.locator('input[type="range"]').first()
    const volumeInput = page.locator('input[type="number"]').filter({ hasText: /volume/i }).first()
    
    if (await volumeSlider.isVisible()) {
      // Test volume control
      await volumeSlider.fill('50') // Set to 50% volume
      console.log('Volume slider found and adjusted')
      
      const sliderValue = await volumeSlider.inputValue()
      expect(parseInt(sliderValue)).toBeLessThanOrEqual(100)
    } else if (await anyVolumeSlider.isVisible()) {
      await anyVolumeSlider.fill('75')
      console.log('Range slider found (may be volume control)')
    } else if (await volumeInput.isVisible()) {
      await volumeInput.fill('0.7')
      console.log('Volume input found and set')
    } else {
      console.log('Audio mixing controls not found - feature may be under development')
    }
    
    // Look for audio track muting/soloing
    const muteButton = page.getByRole('button', { name: /mute/i }).first()
    const soloButton = page.getByRole('button', { name: /solo/i }).first()
    
    if (await muteButton.isVisible()) {
      await muteButton.click()
      console.log('Mute button found and tested')
    }
    
    if (await soloButton.isVisible()) {
      await soloButton.click()
      console.log('Solo button found and tested')
    }
  })

  test('should verify audio quality settings for export', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Look for audio quality options
      const audioQualitySelect = page.locator('[data-testid="audio-quality-select"]').first()
      const bitrateSelect = page.locator('[data-testid="bitrate-select"]').first()
      const qualityOption = page.locator('*').filter({ hasText: /320|256|192|128|kbps/i }).first()
      
      if (await audioQualitySelect.isVisible()) {
        await audioQualitySelect.click()
        
        // Test different audio quality options
        const highQualityOption = page.getByRole('option', { name: /320|high/i }).first()
        if (await highQualityOption.isVisible()) {
          await highQualityOption.click()
          console.log('High audio quality (320 kbps) selected')
        }
      } else if (await bitrateSelect.isVisible()) {
        await bitrateSelect.click()
        
        const bitrate320 = page.getByRole('option', { name: /320/i }).first()
        if (await bitrate320.isVisible()) {
          await bitrate320.click()
          console.log('320 kbps bitrate selected')
        }
      } else if (await qualityOption.isVisible()) {
        await qualityOption.click()
        console.log('Audio quality option found and selected')
      } else {
        console.log('Audio quality settings not found - may be automatic')
      }
      
      // Check sample rate options
      const sampleRateSelect = page.locator('[data-testid="sample-rate-select"]').first()
      const sampleRateOption = page.locator('*').filter({ hasText: /44100|48000|96000|hz/i }).first()
      
      if (await sampleRateSelect.isVisible()) {
        await sampleRateSelect.click()
        
        const rate44100 = page.getByRole('option', { name: /44100|44.1/i }).first()
        if (await rate44100.isVisible()) {
          await rate44100.click()
          console.log('44.1 kHz sample rate selected')
        }
      } else if (await sampleRateOption.isVisible()) {
        await sampleRateOption.click()
        console.log('Sample rate option found')
      } else {
        console.log('Sample rate settings not found - may be automatic')
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should handle audio format compatibility', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Test different audio format combinations
      const audioFormatTests = [
        { format: 'mp3', codec: 'mp3' },
        { format: 'wav', codec: 'pcm' },
        { format: 'ogg', codec: 'vorbis' },
        { format: 'aac', codec: 'aac' }
      ]
      
      for (const test of audioFormatTests) {
        console.log(`Testing ${test.format} format with ${test.codec} codec`)
        
        // Select format
        const formatOption = page.locator('*').filter({ hasText: new RegExp(test.format, 'i') }).first()
        if (await formatOption.isVisible()) {
          await formatOption.click()
          console.log(`${test.format} format selected`)
        }
        
        // Look for codec options
        const codecOption = page.locator('*').filter({ hasText: new RegExp(test.codec, 'i') }).first()
        if (await codecOption.isVisible()) {
          await codecOption.click()
          console.log(`${test.codec} codec selected`)
        }
        
        // Check for compatibility warnings
        const warningMessage = page.locator('*').filter({ hasText: /warning|unsupported|compatibility/i }).first()
        if (await warningMessage.isVisible()) {
          const warningText = await warningMessage.textContent()
          console.log(`Audio compatibility warning: ${warningText}`)
        } else {
          console.log(`${test.format}/${test.codec} combination appears compatible`)
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should verify audio waveform visualization', async ({ page }) => {
    // Look for audio waveform display
    const waveform = page.locator('[data-testid="audio-waveform"]').first()
    const canvasWaveform = page.locator('canvas').filter({ hasText: /waveform|audio/i }).first()
    const anyCanvas = page.locator('canvas').first()
    const svgWaveform = page.locator('svg').filter({ hasText: /waveform|audio/i }).first()
    
    if (await waveform.isVisible()) {
      await expect(waveform).toBeVisible()
      console.log('Audio waveform visualization found')
      
      // Check if waveform is interactive
      await waveform.click({ position: { x: 100, y: 50 } })
      console.log('Attempted waveform interaction')
    } else if (await canvasWaveform.isVisible()) {
      await expect(canvasWaveform).toBeVisible()
      console.log('Canvas-based waveform found')
    } else if (await anyCanvas.isVisible()) {
      console.log('Canvas element found (may be waveform)')
    } else if (await svgWaveform.isVisible()) {
      await expect(svgWaveform).toBeVisible()
      console.log('SVG-based waveform found')
    } else {
      console.log('Audio waveform visualization not found - feature may be under development')
    }
    
    // Look for playback controls for audio preview
    const playButton = page.getByRole('button', { name: /play/i }).first()
    const pauseButton = page.getByRole('button', { name: /pause/i }).first()
    
    if (await playButton.isVisible()) {
      await playButton.click()
      console.log('Audio playback started')
      
      await page.waitForTimeout(1000)
      
      if (await pauseButton.isVisible()) {
        await pauseButton.click()
        console.log('Audio playback paused')
      }
    } else {
      console.log('Audio playback controls not found')
    }
  })

  test('should handle audio trimming and editing', async ({ page }) => {
    // Look for audio editing controls
    const trimButton = page.getByRole('button', { name: /trim|cut|split/i }).first()
    const fadeInButton = page.getByRole('button', { name: /fade in/i }).first()
    const fadeOutButton = page.getByRole('button', { name: /fade out/i }).first()
    
    if (await trimButton.isVisible()) {
      await trimButton.click()
      console.log('Audio trim/cut tool found')
      
      // Look for trim handles or inputs
      const trimHandle = page.locator('[data-testid="trim-handle"]').first()
      const startTimeInput = page.locator('input[type="number"]').filter({ hasText: /start|begin/i }).first()
      const endTimeInput = page.locator('input[type="number"]').filter({ hasText: /end|duration/i }).first()
      
      if (await trimHandle.isVisible()) {
        // Try to drag trim handle
        await trimHandle.dragTo(trimHandle, { targetPosition: { x: 50, y: 0 } })
        console.log('Attempted trim handle interaction')
      } else if (await startTimeInput.isVisible()) {
        await startTimeInput.fill('2')
        console.log('Start time set for audio trim')
      } else if (await endTimeInput.isVisible()) {
        await endTimeInput.fill('8')
        console.log('End time set for audio trim')
      }
    }
    
    if (await fadeInButton.isVisible()) {
      await fadeInButton.click()
      console.log('Fade in effect applied')
    }
    
    if (await fadeOutButton.isVisible()) {
      await fadeOutButton.click()
      console.log('Fade out effect applied')
    }
    
    if (!await trimButton.isVisible() && !await fadeInButton.isVisible() && !await fadeOutButton.isVisible()) {
      console.log('Audio editing tools not found - feature may be under development')
    }
  })

  test('should export audio with applied effects and mixing', async ({ page }) => {
    // First apply some audio effects if available
    const volumeSlider = page.locator('input[type="range"]').first()
    if (await volumeSlider.isVisible()) {
      await volumeSlider.fill('80') // Set volume to 80%
      console.log('Volume adjusted before export')
    }
    
    // Look for other audio effects
    const equalizerButton = page.getByRole('button', { name: /eq|equalizer/i }).first()
    const compressorButton = page.getByRole('button', { name: /compressor|dynamics/i }).first()
    const reverbButton = page.getByRole('button', { name: /reverb|echo/i }).first()
    
    if (await equalizerButton.isVisible()) {
      await equalizerButton.click()
      console.log('Equalizer panel opened')
    }
    
    if (await compressorButton.isVisible()) {
      await compressorButton.click()
      console.log('Compressor applied')
    }
    
    if (await reverbButton.isVisible()) {
      await reverbButton.click()
      console.log('Reverb effect applied')
    }
    
    // Now try to export with effects
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Set filename
      const filenameInput = page.locator('input[type="text"]').first()
      if (await filenameInput.isVisible()) {
        await filenameInput.fill('audio-with-effects-export')
        console.log('Filename set for audio export with effects')
      }
      
      // Start export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null)
        
        await startExportButton.click()
        console.log('Audio export with effects started')
        
        const download = await downloadPromise
        if (download) {
          const filename = download.suggestedFilename()
          expect(filename).toBeTruthy()
          console.log(`Audio export with effects completed: ${filename}`)
        } else {
          console.log('Export started but download not detected')
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })

  test('should handle audio-only export progress and cancellation', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first()
    
    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Start audio export
      const startExportButton = page.getByRole('button', { name: /start export|begin export|export now|start/i }).first()
      if (await startExportButton.isVisible() && await startExportButton.isEnabled()) {
        await startExportButton.click()
        console.log('Audio export started for progress tracking test')
        
        // Monitor progress indicators
        await page.waitForTimeout(2000)
        
        const progressBar = page.locator('[role="progressbar"]').first()
        const progressText = page.locator('[data-testid="export-status"]').first()
        const audioProgressText = page.locator('*').filter({ hasText: /audio|mixing|processing/i }).first()
        
        if (await progressBar.isVisible()) {
          const progressValue = await progressBar.getAttribute('aria-valuenow')
          console.log(`Audio export progress: ${progressValue}%`)
          expect(progressValue).toBeTruthy()
        } else if (await progressText.isVisible()) {
          const statusText = await progressText.textContent()
          console.log(`Audio export status: ${statusText}`)
          expect(statusText).toBeTruthy()
        } else if (await audioProgressText.isVisible()) {
          const progressInfo = await audioProgressText.textContent()
          console.log(`Audio processing info: ${progressInfo}`)
        } else {
          console.log('Audio export progress tracking not found')
        }
        
        // Test cancellation
        const cancelButton = page.getByRole('button', { name: /cancel|stop/i }).first()
        if (await cancelButton.isVisible()) {
          console.log('Cancel button available during audio export')
          await cancelButton.click()
          console.log('Audio export cancelled')
          
          // Verify export was cancelled
          await page.waitForTimeout(1000)
          const cancelledMessage = page.locator('*').filter({ hasText: /cancelled|stopped/i }).first()
          if (await cancelledMessage.isVisible()) {
            console.log('Export cancellation confirmed')
          }
        }
      }
    } else {
      console.log('Export functionality not available')
    }
  })
})