import { test, expect } from '@playwright/test';
import { join } from 'path';

test.describe('Fullscreen Navigation Bug Test', () => {
  test('detect and fix fullscreen navigation issue after generation', async ({ page }) => {
    console.log('🔍 Testing for fullscreen navigation bug...');
    
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
    
    // Verify image loaded and start generation
    const imageLoaded = page.locator('span:text("Image loaded")');
    if (await imageLoaded.isVisible()) {
      console.log('✅ Image loaded, starting generation...');
      
      // Select model and add prompt
      const anyModel = page.locator('h4').first();
      await anyModel.click();
      
      const promptArea = page.locator('textarea').first();
      if (await promptArea.isVisible()) {
        await promptArea.fill('Test generation');
      }
      
      // Click generate
      const generateButton = page.locator('button').filter({ hasText: /Generate|Edit/ }).first();
      await generateButton.click();
      console.log('🎯 Generation started, monitoring for fullscreen bug...');
      
      // Monitor for 60 seconds after generation starts
      let foundFullscreenBug = false;
      
      for (let i = 10; i <= 60; i += 10) {
        await page.waitForTimeout(10000);
        await page.screenshot({ path: `test-results/bug-check-${i}sec.png`, fullPage: true });
        
        // Check if we're in an unexpected fullscreen state
        const hasEditorUI = await page.locator('.bg-panel').isVisible();
        const hasTimeline = await page.locator('.timeline').isVisible();
        const hasBackButton = await page.locator('button[aria-label="Back to media"]').isVisible();
        
        console.log(`📊 At ${i}s - Editor UI: ${hasEditorUI}, Timeline: ${hasTimeline}, Back Button: ${hasBackButton}`);
        
        // If we lose the main UI elements, we might be in fullscreen bug state
        if (!hasEditorUI && !hasTimeline && !hasBackButton) {
          console.log(`🚨 POTENTIAL FULLSCREEN BUG DETECTED at ${i} seconds!`);
          foundFullscreenBug = true;
          
          // Try escape key
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
          await page.screenshot({ path: `test-results/bug-escape-attempt-${i}sec.png`, fullPage: true });
          
          // Check if escape worked
          const escapeWorked = await page.locator('.bg-panel').isVisible();
          console.log(`⌨️ Escape key worked: ${escapeWorked}`);
          
          if (!escapeWorked) {
            // Try clicking at coordinates where close button might be
            console.log('🖱️ Trying to click where close button should be...');
            await page.click('body', { position: { x: 1200, y: 50 } }); // Top right area
            await page.waitForTimeout(1000);
            
            const clickWorked = await page.locator('.bg-panel').isVisible();
            console.log(`🖱️ Click attempt worked: ${clickWorked}`);
            
            if (!clickWorked) {
              // Try clicking in center to close modal
              console.log('🖱️ Trying center click...');
              await page.click('body', { position: { x: 640, y: 400 } });
              await page.waitForTimeout(1000);
              
              const centerClickWorked = await page.locator('.bg-panel').isVisible();
              console.log(`🖱️ Center click worked: ${centerClickWorked}`);
            }
          }
          
          // Final check
          await page.screenshot({ path: `test-results/bug-final-state-${i}sec.png`, fullPage: true });
          const finalState = await page.locator('.bg-panel').isVisible();
          console.log(`🏁 Final navigation state: ${finalState ? 'RECOVERED' : 'STILL STUCK'}`);
          
          break;
        }
        
        // Check for edit completion
        const editBadge = page.locator('text=1 edits');
        const hasEdit = await editBadge.isVisible();
        if (hasEdit) {
          console.log(`✅ Edit completed at ${i} seconds - no fullscreen bug detected`);
          break;
        }
      }
      
      if (!foundFullscreenBug) {
        console.log('✅ No fullscreen navigation bug detected');
      }
      
    } else {
      console.log('❌ Image failed to load');
    }
    
    console.log('🏁 Fullscreen bug test completed');
  });
});