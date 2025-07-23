import { test, expect } from '@playwright/test';
import { join } from 'path';

test.describe('Navigation Bug Fix Test', () => {
  test('verify no navigation bug after image generation completes', async ({ page }) => {
    console.log('🔍 Testing navigation bug fix...');
    
    // Navigate and upload image
    await page.goto('/editor/project/test-project');
    await page.waitForLoadState('networkidle');
    
    const adjustmentTab = page.locator('span:text("Adjustment")');
    await adjustmentTab.click();
    await page.waitForTimeout(2000);
    
    // Upload image
    const fileChooserPromise = page.waitForEvent('filechooser');
    const uploadArea = page.locator('.border-dashed').first();
    await uploadArea.click();
    
    const fileChooser = await fileChooserPromise;
    const realImagePath = join(__dirname, 'fixtures', 'test-image-real.jpg');
    await fileChooser.setFiles(realImagePath);
    await page.waitForTimeout(5000);
    
    // Select model and add prompt
    const anyModel = page.locator('h4').first();
    await anyModel.click();
    
    const promptArea = page.locator('textarea').first();
    if (await promptArea.isVisible()) {
      await promptArea.fill('Test generation');
    }
    
    // Monitor for any navigation events
    let navigationOccurred = false;
    page.on('framenavigated', (frame) => {
      const url = frame.url();
      console.log(`🔄 Frame navigated to: ${url}`);
      // Check if navigation is to a blob URL (which would be the bug)
      if (url.includes('blob:') && !url.includes('/editor/project/')) {
        navigationOccurred = true;
        console.log('🚨 NAVIGATION BUG DETECTED! Navigated to blob URL');
      }
    });
    
    // Start generation
    const generateButton = page.locator('button').filter({ hasText: /Generate|Edit/ }).first();
    await generateButton.click();
    console.log('🎯 Generation started, monitoring for navigation bug...');
    
    // Wait and monitor for 60 seconds
    let editorUILost = false;
    for (let i = 10; i <= 60; i += 10) {
      await page.waitForTimeout(10000);
      
      const currentUrl = page.url();
      console.log(`⏰ ${i}s - Current URL: ${currentUrl}`);
      
      // Take screenshot
      await page.screenshot({ path: `test-results/fix-check-${i}sec.png`, fullPage: true });
      
      // Check if we still have editor UI
      const hasBackButton = await page.locator('button[aria-label="Back to media"]').isVisible();
      const hasMediaPanel = await page.locator('[data-testid="media-panel"]').isVisible();
      const hasAdjustmentHeader = await page.locator('h2:text("Image Adjustment")').isVisible();
      
      console.log(`📊 ${i}s - Back Button: ${hasBackButton}, Media Panel: ${hasMediaPanel}, Adjustment Header: ${hasAdjustmentHeader}`);
      
      // If we lose all UI elements, that's the bug
      if (!hasBackButton && !hasMediaPanel && !hasAdjustmentHeader) {
        editorUILost = true;
        console.log(`🚨 EDITOR UI LOST at ${i} seconds! This indicates the navigation bug occurred.`);
        break;
      }
      
      // Check for edit completion
      const editBadge = page.locator('text=1 edits');
      const hasEdit = await editBadge.isVisible();
      if (hasEdit) {
        console.log(`✅ Edit completed at ${i} seconds - checking if UI remains stable...`);
        
        // Wait a bit more to ensure no delayed navigation
        await page.waitForTimeout(5000);
        
        // Final check
        const finalBackButton = await page.locator('button[aria-label="Back to media"]').isVisible();
        const finalMediaPanel = await page.locator('[data-testid="media-panel"]').isVisible();
        const finalAdjustmentHeader = await page.locator('h2:text("Image Adjustment")').isVisible();
        
        console.log(`🔍 Final check - Back Button: ${finalBackButton}, Media Panel: ${finalMediaPanel}, Adjustment Header: ${finalAdjustmentHeader}`);
        
        if (finalBackButton || finalMediaPanel || finalAdjustmentHeader) {
          console.log('✅ SUCCESS! Editor UI remained stable after generation completion.');
        } else {
          editorUILost = true;
          console.log('🚨 FAILED! Editor UI was lost after generation completion.');
        }
        break;
      }
    }
    
    // Assert that the navigation bug did not occur
    expect(navigationOccurred).toBeFalsy();
    expect(editorUILost).toBeFalsy();
    
    console.log('🏁 Navigation bug fix test completed');
  });
});