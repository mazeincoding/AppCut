
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('OpenCut Video Export', () => {
  test('should export video successfully', async ({ page }) => {
    console.log('🚀 Starting video export test...');
    
    // Navigate to OpenCut
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Go to editor
    await page.click('text=Start Creating');
    await page.waitForLoadState('networkidle');
    
    // Upload test video
    console.log('📹 Uploading test video...');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('C:\Users\zdhpe\Desktop\New folder\OpenCut\apps\web\e2e\video-export-tests\input\generated_4a2ba290.mp4');
    
    // Wait for video to load
    await page.waitForTimeout(3000);
    
    // Add video to timeline
    const videoElement = page.locator('[data-testid="media-item"]').first();
    await videoElement.dragTo(page.locator('[data-testid="timeline"]'));
    
    // Wait for timeline update
    await page.waitForTimeout(1000);
    
    // Open export dialog
    console.log('📤 Opening export dialog...');
    await page.click('text=Export');
    await page.waitForSelector('[data-testid="export-dialog"]');
    
    // Configure export settings
    await page.selectOption('select[name="format"]', 'mp4');
    await page.selectOption('select[name="quality"]', '720p');
    
    // Start export
    console.log('🎬 Starting export...');
    const exportButton = page.locator('button:has-text("Start Export")');
    await exportButton.click();
    
    // Monitor export progress
    let exportComplete = false;
    let timeout = 0;
    const maxTimeout = 120000; // 2 minutes
    
    while (!exportComplete && timeout < maxTimeout) {
      try {
        // Check if export is complete
        const successMessage = page.locator('text=Export complete');
        if (await successMessage.isVisible()) {
          exportComplete = true;
          console.log('✅ Export completed successfully!');
          break;
        }
        
        // Check progress
        const progressElement = page.locator('[data-testid="export-progress"]');
        if (await progressElement.isVisible()) {
          const progressText = await progressElement.textContent();
          console.log(`📊 Export progress: ${progressText}`);
        }
        
        await page.waitForTimeout(1000);
        timeout += 1000;
      } catch (error) {
        console.log('⏳ Waiting for export...');
        await page.waitForTimeout(1000);
        timeout += 1000;
      }
    }
    
    if (!exportComplete) {
      throw new Error('Export timed out after 2 minutes');
    }
    
    // Download exported video
    console.log('💾 Downloading exported video...');
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download")');
    const download = await downloadPromise;
    
    const downloadPath = path.join('C:\Users\zdhpe\Desktop\New folder\OpenCut\apps\web\e2e\video-export-tests\output\test-outputs', `exported-${Date.now()}.mp4`);
    await download.saveAs(downloadPath);
    
    console.log(`✅ Video exported and saved to: ${downloadPath}`);
    
    // Verify file exists and has content
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(1000); // At least 1KB
    
    console.log(`📁 Export file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  });
  
  test('should handle export errors gracefully', async ({ page }) => {
    console.log('🧪 Testing error handling...');
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Try to export without any media
    await page.click('text=Export');
    
    // Should show error message
    const errorMessage = page.locator('text=No media to export');
    await expect(errorMessage).toBeVisible();
  });
});
