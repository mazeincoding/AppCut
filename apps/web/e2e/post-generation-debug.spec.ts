import { test, expect } from '@playwright/test';
import { join } from 'path';

test.describe('Post Generation Debug', () => {
  test('debug what happens after generation completes', async ({ page }) => {
    console.log('🔍 Debugging post-generation behavior...');
    
    // Setup and generation
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
    
    // Start generation
    const anyModel = page.locator('h4').first();
    await anyModel.click();
    
    const promptArea = page.locator('textarea').first();
    if (await promptArea.isVisible()) {
      await promptArea.fill('Make brighter');
    }
    
    const generateButton = page.locator('button').filter({ hasText: /Generate|Edit/ }).first();
    await generateButton.click();
    console.log('🎯 Generation started...');
    
    // Monitor navigation changes
    page.on('framenavigated', (frame) => {
      console.log(`🔄 Frame navigated to: ${frame.url()}`);
    });
    
    page.on('popup', (popup) => {
      console.log(`🪟 Popup opened: ${popup.url()}`);
    });
    
    // Wait and monitor for 60 seconds
    for (let i = 5; i <= 60; i += 5) {
      await page.waitForTimeout(5000);
      
      const currentUrl = page.url();
      const pageTitle = await page.title();
      
      console.log(`⏰ ${i}s - URL: ${currentUrl}`);
      console.log(`⏰ ${i}s - Title: ${pageTitle}`);
      
      // Take screenshot
      await page.screenshot({ path: `test-results/debug-${i}sec.png`, fullPage: true });
      
      // Check for specific elements
      const hasBackButton = await page.locator('button[aria-label="Back to media"]').isVisible();
      const hasMediaPanel = await page.locator('[data-testid="media-panel"]').isVisible();
      const hasTimeline = await page.locator('.timeline').isVisible();
      const hasAdjustmentHeader = await page.locator('h2:text("Image Adjustment")').isVisible();
      
      console.log(`📊 ${i}s - Back Button: ${hasBackButton}`);
      console.log(`📊 ${i}s - Media Panel: ${hasMediaPanel}`);
      console.log(`📊 ${i}s - Timeline: ${hasTimeline}`);
      console.log(`📊 ${i}s - Adjustment Header: ${hasAdjustmentHeader}`);
      
      // Check if we have any image elements that might be taking over
      const images = await page.locator('img').count();
      console.log(`🖼️ ${i}s - Total images on page: ${images}`);
      
      // Check for any fullscreen modals or overlays
      const fullscreenModal = await page.locator('.fixed.inset-0').isVisible();
      const zIndexElements = await page.locator('[style*="z-index"]').count();
      
      console.log(`🎭 ${i}s - Fullscreen modal: ${fullscreenModal}`);
      console.log(`🎭 ${i}s - Z-index elements: ${zIndexElements}`);
      
      // Check page content to see if we've lost the editor
      const bodyText = await page.locator('body').textContent();
      const hasEditorContent = bodyText?.includes('Image Adjustment') || bodyText?.includes('Generate Edit');
      
      console.log(`📄 ${i}s - Has editor content: ${hasEditorContent}`);
      
      // If we detect loss of editor UI, try to recover
      if (!hasBackButton && !hasMediaPanel && !hasAdjustmentHeader) {
        console.log(`🚨 ${i}s - EDITOR UI LOST! Attempting recovery...`);
        
        // Try various recovery methods
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        
        // Try clicking back button in browser
        await page.goBack();
        await page.waitForTimeout(1000);
        
        // Try navigating back to editor
        await page.goto('/editor/project/test-project');
        await page.waitForTimeout(2000);
        
        // Take recovery screenshot
        await page.screenshot({ path: `test-results/debug-recovery-${i}sec.png`, fullPage: true });
        
        const recoverySuccessful = await page.locator('h2:text("Image Adjustment")').isVisible();
        console.log(`🔧 ${i}s - Recovery successful: ${recoverySuccessful}`);
        
        break;
      }
      
      // Check for completion
      const editBadge = page.locator('text=1 edits');
      const hasEdit = await editBadge.isVisible();
      if (hasEdit) {
        console.log(`✅ ${i}s - Edit completed, continuing to monitor...`);
      }
    }
    
    console.log('🏁 Post-generation debug completed');
  });
});