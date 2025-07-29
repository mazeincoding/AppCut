# Library Unit Tests - Archived ❌

These Jest unit tests for internal library functions were moved from the E2E test directory as they are not suitable for E2E testing.

## Files Moved (January 2025):

### Library Test Files:
- `audio-mixer.test.ts` - AudioMixer class unit tests with mocked AudioContext
- `canvas-renderer.test.ts` - CanvasRenderer class unit tests with mocked canvas
- `export-errors.test.ts` - Export error handling unit tests
- `ffmpeg-utils.test.ts` - FFmpeg utility function tests with mock data
- `ffmpeg-video-recorder.test.ts` - FFmpeg video recording unit tests
- `frame-capture.test.ts` - Frame capture utility tests
- `url-validation.test.ts` - URL validation function tests
- `video-recorder.test.ts` - VideoRecorder class unit tests with mocked MediaRecorder

## Why These Were Not Useful:

### 1. **Jest Unit Tests vs E2E Tests**
```typescript
// Example of unit testing approach:
import { describe, it, expect } from '@jest/globals'
import { AudioMixer } from '@/lib/audio-mixer'

describe('AudioMixer', () => {
  it('should initialize with correct options', () => {
    const mixer = new AudioMixer({ sampleRate: 44100 })
    expect(mixer.getAudioContext().sampleRate).toBe(44100)
  })
})
```

### 2. **Heavy API Mocking**
- Mock AudioContext, MediaRecorder, Canvas APIs
- Mock DOM elements and browser features
- Test isolated function behavior, not user experience
- No real browser API integration

### 3. **Internal Implementation Focus**
- Test low-level library functions directly
- Validate class constructors and method calls
- Check data transformations and calculations
- No user-observable behavior testing

## Better E2E Approach:

Instead of testing internal libraries, E2E tests should:

1. **Test Real Export Functionality**
   ```typescript
   // E2E approach
   await page.setInputFiles('#video-upload', 'test-video.mp4')
   await page.click('button:has-text("Export")')
   await page.selectOption('#format', 'mp4')
   await page.click('button:has-text("Start Export")')
   
   // Verify real export behavior
   const downloadPromise = page.waitForEvent('download')
   const download = await downloadPromise
   expect(download.suggestedFilename()).toMatch(/\.mp4$/)
   ```

2. **Test Real Media Processing**
   ```typescript
   // E2E approach
   await page.setInputFiles('#media-upload', ['audio.mp3', 'video.mp4'])
   await page.dragAndDrop('.audio-track', '.timeline')
   await page.dragAndDrop('.video-track', '.timeline')
   
   // Verify timeline shows media
   await expect(page.locator('.timeline-element')).toHaveCount(2)
   await expect(page.locator('.audio-waveform')).toBeVisible()
   ```

3. **Test Real Canvas Rendering**
   ```typescript
   // E2E approach
   await page.goto('/editor/project/test')
   await page.setInputFiles('#image-upload', 'test-image.jpg')
   
   // Verify preview canvas updates
   const canvas = page.locator('canvas.preview')
   await expect(canvas).toBeVisible()
   
   // Verify canvas has rendered content (non-blank)
   const imageData = await canvas.evaluate(el => {
     const ctx = el.getContext('2d')
     return ctx.getImageData(0, 0, el.width, el.height)
   })
   expect(imageData.data.some(pixel => pixel !== 0)).toBe(true)
   ```

## Original Purpose:

These tests were meant to verify:
- **Audio Processing**: AudioMixer functionality, sample rate handling
- **Canvas Rendering**: CanvasRenderer drawing operations, dimension handling  
- **Video Recording**: MediaRecorder integration, format support
- **FFmpeg Integration**: Video encoding, frame processing
- **Error Handling**: Export error scenarios and recovery
- **URL Validation**: Media URL format checking

## Why Not Converted:

1. **Different Testing Levels**: Unit tests verify implementation, E2E tests verify user experience
2. **API Mocking vs Reality**: E2E tests should use real browser APIs
3. **Internal vs External**: E2E tests focus on user-observable behavior
4. **Maintenance Complexity**: Library unit tests require deep technical knowledge

## Recommendation:

For testing these features in OpenCut:

### Audio Processing Testing:
- Upload real audio files through UI
- Test volume controls and mixing through sliders
- Verify audio playback in timeline preview
- Test audio export in final video output

### Canvas Rendering Testing:
- Upload real images/videos through file inputs
- Verify preview canvas displays content correctly
- Test canvas interactions (zoom, pan, selection)
- Verify canvas content appears in exported video

### Video Recording Testing:
- Test complete export workflow from UI
- Verify different format options work
- Test export progress indicators
- Download and validate actual exported files

### FFmpeg Integration Testing:
- Test with various media formats through upload
- Verify format conversion works in exports
- Test with different quality settings
- Validate output file characteristics

These files demonstrate how unit tests complement but don't replace E2E tests - they serve different purposes in the testing pyramid.