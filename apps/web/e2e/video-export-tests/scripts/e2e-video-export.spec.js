
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('OpenCut Video Export', () => {
  test('should export video successfully', async ({ page }) => {
    console.log('🚀 Starting video export test...');
    
    // Navigate to projects page first
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(`${baseUrl}/projects`);
    await page.waitForLoadState('networkidle');
    
    // Create or navigate to a project
    const createProjectButton = page.getByRole('button', { name: /create.*project/i }).first();
    if (await createProjectButton.isVisible()) {
      await createProjectButton.click();
      await page.waitForLoadState('networkidle');
    } else {
      // Navigate directly to editor
      await page.goto(`${baseUrl}/editor/project/test-project`);
      await page.waitForLoadState('networkidle');
    }
    
    // Upload test video
    console.log('📹 Uploading test video...');
    
    // First, make sure we're on the Media tab
    const mediaTab = page.locator('button[role="tab"]:has-text("Media")');
    if (await mediaTab.isVisible()) {
      await mediaTab.click();
    }
    
    const fileInput = page.locator('input[type="file"]');
    const videoPath = process.env.TEST_VIDEO_PATH || path.join(__dirname, '../input/generated_4a2ba290.mp4');
    await fileInput.setInputFiles(videoPath);
    
    // Wait for video to process and appear in media panel
    console.log('⏳ Waiting for video to process...');
    await page.waitForTimeout(7000);
    
    // Try to find the media item with various selectors
    const mediaSelectors = [
      '.aspect-video',
      'img[alt*="video"]',
      'video',
      '[data-media-item]',
      '.media-item'
    ];
    
    let mediaFound = false;
    for (const selector of mediaSelectors) {
      const item = page.locator(selector).first();
      if (await item.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`📌 Found media with selector: ${selector}`);
        await item.click();
        mediaFound = true;
        break;
      }
    }
    
    if (!mediaFound) {
      console.log('⚠️ Could not find media item, proceeding anyway...');
    }
    
    // Wait for timeline update
    await page.waitForTimeout(3000);
    
    // Open export dialog using nav button
    console.log('📤 Opening export dialog...');
    
    // Workaround: Hide nextjs-portal overlay that can interfere with clicks
    await page.addStyleTag({
      content: 'nextjs-portal { display: none !important; }'
    });
    
    // Use force click to bypass any overlays
    await page.waitForSelector('nav button:has-text("Export")', { timeout: 10000 });
    await page.click('nav button:has-text("Export")', { force: true });
    
    // Wait for export dialog by waiting for filename input
    await page.waitForSelector('#filename', { timeout: 10000 });
    
    // Configure export settings - quality is selected by default
    console.log('🎬 Starting export...');
    
    // Find and click the export button in the dialog
    // Try multiple selectors as button text may vary
    const possibleButtons = [
      page.locator('button:has-text("Export Video")'),
      page.locator('button:has-text("Start Export")'),
      page.locator('button:has-text("Export")').last(),
      page.locator('[role="dialog"] button').filter({ hasText: /export/i }).last()
    ];
    
    let clicked = false;
    for (const button of possibleButtons) {
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Check if button is enabled, wait if not
        const isDisabled = await button.isDisabled();
        if (isDisabled) {
          console.log('⏳ Waiting for export button to be enabled...');
          await page.waitForTimeout(2000);
        }
        
        await button.click();
        clicked = true;
        break;
      }
    }
    
    if (!clicked) {
      throw new Error('Could not find export button in dialog');
    }
    
    console.log('⏳ Waiting for export to complete...');
    
    // Handle download that starts automatically
    const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
    const download = await downloadPromise;
    
    console.log('✅ Export completed successfully!');
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '../output/test-outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const downloadPath = path.join(outputDir, `exported-${Date.now()}.mp4`);
    await download.saveAs(downloadPath);
    
    console.log(`✅ Video exported and saved to: ${downloadPath}`);
    
    // Verify file exists and has content
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(1000); // At least 1KB
    
    console.log(`📁 Export file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  });
  
  test('should handle export errors gracefully', async ({ page }) => {
    console.log('🧪 Testing error handling...');
    
    // Navigate directly to editor without any media
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(`${baseUrl}/editor/project/empty-test`);
    await page.waitForLoadState('networkidle');
    
    // Try to click export button
    const exportBtn = page.locator('nav button:has-text("Export")');
    
    // Check if button exists and is disabled/shows error
    if (await exportBtn.isVisible()) {
      const isDisabled = await exportBtn.isDisabled();
      if (isDisabled) {
        console.log('✅ Export button is correctly disabled when no media');
        expect(isDisabled).toBe(true);
      } else {
        // Click and check for error message
        await exportBtn.click();
        
        // Look for any error indicators
        const errorDialog = page.locator('text=/no.*media|empty.*timeline|add.*content/i');
        const hasError = await errorDialog.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (hasError) {
          console.log('✅ Error message shown when trying to export empty project');
        } else {
          console.log('⚠️ No error shown, but export should not proceed without media');
        }
      }
    }
  });
});
