import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Enhanced Video Thumbnails', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the editor
    await page.goto('/editor/project');
    
    // Wait for the media panel to be ready
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    // Wait for editor to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('generates multiple thumbnails for uploaded video', async ({ page }) => {
    // Upload a video file
    const fileInput = page.locator('input[type="file"]');
    const testVideoPath = path.join(__dirname, '..', 'fixtures', 'test-video.mp4');
    
    // Upload the video
    await fileInput.setInputFiles(testVideoPath);
    
    // Wait for video processing
    await page.waitForSelector('.relative.w-full.h-full.cursor-pointer', { timeout: 30000 });
    
    // Take screenshot of initial thumbnail
    await page.screenshot({ 
      path: 'test-results/initial-video-thumbnail.png',
      fullPage: false 
    });
    
    // Wait for enhanced thumbnails to be generated
    await page.waitForTimeout(5000); // Give time for background processing
    
    // Check if multiple thumbnails indicator appears
    const multipleThumbnailsIndicator = page.locator('.bg-blue-500\\/80:has-text(/\\d+/)');
    const indicatorCount = await multipleThumbnailsIndicator.count();
    
    if (indicatorCount > 0) {
      const thumbnailCount = await multipleThumbnailsIndicator.textContent();
      console.log(`Generated ${thumbnailCount} thumbnails`);
      expect(parseInt(thumbnailCount || '0')).toBeGreaterThan(1);
    }
    
    // Take screenshot showing enhanced thumbnail features
    await page.screenshot({ 
      path: 'test-results/enhanced-video-thumbnail.png',
      fullPage: false 
    });
  });

  test('hover scrubbing works on video thumbnails', async ({ page }) => {
    // Upload a video file
    const fileInput = page.locator('input[type="file"]');
    const testVideoPath = path.join(__dirname, '..', 'fixtures', 'test-video.mp4');
    
    await fileInput.setInputFiles(testVideoPath);
    
    // Wait for video thumbnail to appear
    const videoThumbnail = page.locator('.relative.w-full.h-full.cursor-pointer').first();
    await videoThumbnail.waitFor({ timeout: 30000 });
    
    // Wait for enhanced thumbnails
    await page.waitForTimeout(5000);
    
    // Get initial thumbnail src
    const initialSrc = await videoThumbnail.locator('img').getAttribute('src');
    
    // Hover over the thumbnail
    await videoThumbnail.hover();
    
    // Take screenshot while hovering
    await page.screenshot({ 
      path: 'test-results/thumbnail-hover-start.png',
      fullPage: false 
    });
    
    // Move mouse across the thumbnail to trigger scrubbing
    const box = await videoThumbnail.boundingBox();
    if (box) {
      // Move to 25% position
      await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5);
      await page.waitForTimeout(200);
      
      await page.screenshot({ 
        path: 'test-results/thumbnail-hover-25.png',
        fullPage: false 
      });
      
      // Move to 50% position
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
      await page.waitForTimeout(200);
      
      await page.screenshot({ 
        path: 'test-results/thumbnail-hover-50.png',
        fullPage: false 
      });
      
      // Move to 75% position
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
      await page.waitForTimeout(200);
      
      await page.screenshot({ 
        path: 'test-results/thumbnail-hover-75.png',
        fullPage: false 
      });
      
      // Check if scrub indicator is visible
      const scrubIndicator = videoThumbnail.locator('.h-full.bg-white\\/80');
      await expect(scrubIndicator).toBeVisible();
      
      // Get current thumbnail src after scrubbing
      const currentSrc = await videoThumbnail.locator('img').getAttribute('src');
      
      // If enhanced thumbnails were generated, src should change
      if (await videoThumbnail.locator('.bg-blue-500\\/80').count() > 0) {
        expect(currentSrc).not.toBe(initialSrc);
      }
    }
    
    // Move mouse away to reset
    await page.mouse.move(0, 0);
    await page.waitForTimeout(200);
    
    // Verify thumbnail returns to original
    const resetSrc = await videoThumbnail.locator('img').getAttribute('src');
    expect(resetSrc).toBe(initialSrc);
  });

  test('thumbnail quality controls work', async ({ page }) => {
    // Upload a video file
    const fileInput = page.locator('input[type="file"]');
    const testVideoPath = path.join(__dirname, '..', 'fixtures', 'test-video.mp4');
    
    await fileInput.setInputFiles(testVideoPath);
    
    // Wait for video to be processed
    await page.waitForSelector('.relative.w-full.h-full.cursor-pointer', { timeout: 30000 });
    
    // Check if thumbnail controls are visible
    const thumbnailControls = page.locator('.bg-muted.rounded-lg:has(button:has-text("Low"))');
    await expect(thumbnailControls).toBeVisible();
    
    // Take screenshot of thumbnail controls
    await page.screenshot({ 
      path: 'test-results/thumbnail-controls.png',
      fullPage: false 
    });
    
    // Click on High quality button
    const highQualityButton = page.locator('button:has-text("High")');
    await highQualityButton.click();
    
    // Wait for regeneration to start
    await expect(page.locator('.animate-spin')).toBeVisible({ timeout: 5000 });
    
    // Take screenshot during regeneration
    await page.screenshot({ 
      path: 'test-results/thumbnail-regenerating.png',
      fullPage: false 
    });
    
    // Wait for regeneration to complete
    await expect(highQualityButton).toBeEnabled({ timeout: 30000 });
    
    // Check if HD indicator appears
    const hdIndicator = page.locator('.bg-green-500\\/80:has-text("HD")');
    const hdCount = await hdIndicator.count();
    
    if (hdCount > 0) {
      console.log('HD thumbnails generated successfully');
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/thumbnail-high-quality.png',
      fullPage: false 
    });
  });

  test('clear cache functionality works', async ({ page }) => {
    // Upload a video file
    const fileInput = page.locator('input[type="file"]');
    const testVideoPath = path.join(__dirname, '..', 'fixtures', 'test-video.mp4');
    
    await fileInput.setInputFiles(testVideoPath);
    
    // Wait for video processing and enhanced thumbnails
    await page.waitForSelector('.relative.w-full.h-full.cursor-pointer', { timeout: 30000 });
    await page.waitForTimeout(5000);
    
    // Click Clear Cache button
    const clearCacheButton = page.locator('button:has-text("Clear Cache")');
    await clearCacheButton.click();
    
    // Verify cache was cleared
    const cacheCleared = await page.evaluate(() => {
      // Check if thumbnail cache keys are removed from localStorage/sessionStorage
      const cacheKeys = Object.keys(localStorage).filter(key => key.includes('thumbnail-cache'));
      return cacheKeys.length === 0;
    });
    expect(cacheCleared).toBe(true);
    
    // Alternatively, check if thumbnails need regeneration
    const thumbnailIndicator = page.locator('.bg-blue-500\\/80');
    await expect(thumbnailIndicator).toHaveCount(0);
    
    // Take screenshot after clearing cache
    await page.screenshot({ 
      path: 'test-results/thumbnail-cache-cleared.png',
      fullPage: false 
    });
  });

  test('error handling for invalid video files', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    // Create an actual invalid file for testing
    // Use a text file content but with .mp4 extension to bypass file type validation
    await fileInput.setInputFiles({
      name: 'fake-video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('invalid video content - this is not a real video file')
    });
    
    // Wait for error state to appear
    const errorMessage = page.locator('.text-red-500:has-text("Thumbnail failed")');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    
    // Verify error state UI
    const videoPreview = page.locator('.relative.w-full.h-full.bg-muted.flex.items-center.justify-center');
    await expect(videoPreview).toBeVisible();
    
    // Take screenshot of error state
    await page.screenshot({ 
      path: 'test-results/invalid-video-error-state.png',
      fullPage: false 
    });
  });

  test('multiple video thumbnails display correctly', async ({ page }) => {
    // Upload multiple video files
    const fileInput = page.locator('input[type="file"]');
    const testVideoPaths = [
      path.join(__dirname, '..', 'fixtures', 'test-video.mp4'),
      path.join(__dirname, '..', 'fixtures', 'test-video-2.mp4')
    ];
    
    // Upload multiple videos
    await fileInput.setInputFiles(testVideoPaths);
    
    // Wait for first video
    await page.waitForSelector('.relative.w-full.h-full.cursor-pointer', { timeout: 30000 });
    
    // Count video thumbnails
    const videoThumbnails = page.locator('.relative.w-full.h-full.cursor-pointer');
    const count = await videoThumbnails.count();
    
    expect(count).toBeGreaterThanOrEqual(1);
    
    // Take screenshot of media grid with videos
    await page.screenshot({ 
      path: 'test-results/multiple-video-thumbnails.png',
      fullPage: false 
    });
    
    // Verify each video has basic elements
    for (let i = 0; i < count; i++) {
      const thumbnail = videoThumbnails.nth(i);
      
      // Check for video icon
      await expect(thumbnail.locator('.h-4.w-4.text-white')).toBeVisible();
      
      // Check for duration badge if available
      const durationBadge = thumbnail.locator('.bg-gradient-to-r.from-blue-500.to-purple-500');
      if (await durationBadge.count() > 0) {
        await expect(durationBadge).toBeVisible();
      }
    }
  });
});

// Helper test to create screenshots for documentation
test.describe('Documentation Screenshots', () => {
  test('capture all thumbnail states for documentation', async ({ page }) => {
    await page.goto('/editor/project');
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Create a structured screenshot session
    const screenshots = [
      { name: '1-empty-media-panel', action: async () => {} },
      { 
        name: '2-uploading-video', 
        action: async () => {
          const fileInput = page.locator('input[type="file"]');
          await fileInput.setInputFiles(path.join(__dirname, '..', 'fixtures', 'test-video.mp4'));
        }
      },
      { 
        name: '3-basic-thumbnail', 
        action: async () => {
          await page.waitForSelector('.relative.w-full.h-full.cursor-pointer', { timeout: 30000 });
        }
      },
      { 
        name: '4-enhanced-thumbnails', 
        action: async () => {
          await page.waitForTimeout(5000);
        }
      },
      { 
        name: '5-hover-scrubbing', 
        action: async () => {
          const thumbnail = page.locator('.relative.w-full.h-full.cursor-pointer').first();
          await thumbnail.hover();
          const box = await thumbnail.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
          }
        }
      },
      { 
        name: '6-quality-controls', 
        action: async () => {
          await page.mouse.move(0, 0); // Reset hover
          await page.locator('button:has-text("High")').click();
        }
      }
    ];
    
    for (const screenshot of screenshots) {
      await screenshot.action();
      await page.waitForTimeout(500); // Small delay for UI to settle
      
      await page.screenshot({ 
        path: `test-results/docs-${screenshot.name}.png`,
        fullPage: false 
      });
    }
  });
});