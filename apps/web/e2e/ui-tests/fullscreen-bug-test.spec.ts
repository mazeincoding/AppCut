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
            // Try to find and click actual close buttons
            console.log('🖱️ Trying to find close buttons...');
            
            const closeSelectors = [
              'button[aria-label="Close"]',
              'button[aria-label="close"]',
              '.close-button',
              'button:has-text("×")',
              'button:has-text("Close")',
              '[data-testid="close-button"]',
              '[role="button"]:has-text("×")'
            ];
            
            let clickWorked = false;
            for (const selector of closeSelectors) {
              const closeButton = page.locator(selector).first();
              if (await closeButton.isVisible({ timeout: 1000 })) {
                console.log(`🎯 Found close button with selector: ${selector}`);
                await closeButton.click();
                await page.waitForTimeout(500);
                clickWorked = await page.locator('.bg-panel').isVisible();
                if (clickWorked) break;
              }
            }
            
            console.log(`🖱️ Close button click worked: ${clickWorked}`);
            
            if (!clickWorked) {
              // Try clicking on backdrop/overlay to close modal
              console.log('🖱️ Trying backdrop click...');
              
              const backdropSelectors = [
                '.modal-backdrop',
                '.overlay',
                '[data-testid="modal-backdrop"]',
                '.dialog-overlay'
              ];
              
              let backdropClickWorked = false;
              for (const selector of backdropSelectors) {
                const backdrop = page.locator(selector).first();
                if (await backdrop.isVisible({ timeout: 1000 })) {
                  console.log(`🎯 Found backdrop with selector: ${selector}`);
                  await backdrop.click({ position: { x: 10, y: 10 } }); // Click edge to avoid content
                  await page.waitForTimeout(500);
                  backdropClickWorked = await page.locator('.bg-panel').isVisible();
                  if (backdropClickWorked) break;
                }
              }
              
              // If no backdrop found, try alternative keyboard shortcuts
              if (!backdropClickWorked) {
                console.log('⌨️ Trying alternative keyboard shortcuts...');
                await page.keyboard.press('Alt+F4'); // Windows close shortcut
                await page.waitForTimeout(500);
                backdropClickWorked = await page.locator('.bg-panel').isVisible();
              }
              
              console.log(`🖱️ Backdrop/keyboard attempt worked: ${backdropClickWorked}`);
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