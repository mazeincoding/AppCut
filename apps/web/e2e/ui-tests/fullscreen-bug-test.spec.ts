import { test, expect, Page } from '@playwright/test';
import { join } from 'node:path';
import { createTestImageFile } from '../fixtures/test-utils';

// Helper functions for fullscreen bug detection and recovery

async function detectFullscreenBug(page: Page): Promise<boolean> {
  const hasEditorUI = await page.locator('.bg-panel').isVisible();
  const hasTimeline = await page.locator('.timeline').isVisible();
  const hasBackButton = await page.locator('button[aria-label="Back to media"]').isVisible();
  
  console.log(`📊 UI State - Editor UI: ${hasEditorUI}, Timeline: ${hasTimeline}, Back Button: ${hasBackButton}`);
  
  // If we lose all main UI elements, we're likely in fullscreen bug state
  return !hasEditorUI && !hasTimeline && !hasBackButton;
}

async function attemptRecoveryWithEscape(page: Page): Promise<boolean> {
  console.log('⌨️ Attempting recovery with Escape key...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  const recovered = await page.locator('.bg-panel').isVisible();
  console.log(`⌨️ Escape key recovery: ${recovered ? 'SUCCESS' : 'FAILED'}`);
  return recovered;
}

async function attemptRecoveryWithCloseButtons(page: Page): Promise<boolean> {
  console.log('🖱️ Attempting recovery with close buttons...');
  
  const closeSelectors = [
    'button[aria-label="Close"]',
    'button[aria-label="close"]',
    '.close-button',
    'button:has-text("×")',
    'button:has-text("Close")',
    '[data-testid="close-button"]',
    '[role="button"]:has-text("×")'
  ];
  
  for (const selector of closeSelectors) {
    const closeButton = page.locator(selector).first();
    if (await closeButton.isVisible({ timeout: 1000 })) {
      console.log(`🎯 Found close button with selector: ${selector}`);
      await closeButton.click();
      await page.waitForTimeout(500);
      const recovered = await page.locator('.bg-panel').isVisible();
      if (recovered) {
        console.log('🖱️ Close button recovery: SUCCESS');
        return true;
      }
    }
  }
  
  console.log('🖱️ Close button recovery: FAILED');
  return false;
}

async function attemptRecoveryWithBackdrop(page: Page): Promise<boolean> {
  console.log('🖱️ Attempting recovery with backdrop click...');
  
  const backdropSelectors = [
    '.modal-backdrop',
    '.overlay',
    '[data-testid="modal-backdrop"]',
    '.dialog-overlay'
  ];
  
  for (const selector of backdropSelectors) {
    const backdrop = page.locator(selector).first();
    if (await backdrop.isVisible({ timeout: 1000 })) {
      console.log(`🎯 Found backdrop with selector: ${selector}`);
      await backdrop.click({ position: { x: 10, y: 10 } }); // Click edge to avoid content
      await page.waitForTimeout(500);
      const recovered = await page.locator('.bg-panel').isVisible();
      if (recovered) {
        console.log('🖱️ Backdrop recovery: SUCCESS');
        return true;
      }
    }
  }
  
  console.log('🖱️ Backdrop recovery: FAILED');
  return false;
}

async function attemptFullRecovery(page: Page): Promise<boolean> {
  // Try recovery methods in order of likelihood to succeed
  if (await attemptRecoveryWithEscape(page)) return true;
  if (await attemptRecoveryWithCloseButtons(page)) return true;
  if (await attemptRecoveryWithBackdrop(page)) return true;
  
  // Final escape attempt
  console.log('⌨️ Final escape key attempt...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  return await page.locator('.bg-panel').isVisible();
}

test.describe('Fullscreen Navigation Bug Test', () => {
  test('detect and fix fullscreen navigation issue after generation', async ({ page }) => {
    console.log('🔍 Testing for fullscreen navigation bug...');
    
    // Navigate and upload image
    await page.goto('/editor/project/test-project');
    await page.waitForLoadState('networkidle');
    
    const adjustmentTab = page.locator('span:text("Adjustment")');
    await adjustmentTab.click();
    await page.waitForSelector('.border-dashed', { state: 'visible' });
    
    // Upload image
    const fileChooserPromise = page.waitForEvent('filechooser');
    const uploadArea = page.locator('.border-dashed').first();
    await uploadArea.click();
    
    const fileChooser = await fileChooserPromise;
    // Use the test utility to create a test image
    const testImage = createTestImageFile('test-image.jpg');
    await fileChooser.setFiles(testImage);
    await page.waitForSelector('span:text("Image loaded")', { timeout: 10000 });
    
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
        
        console.log(`🕐 Checking at ${i} seconds...`);
        
        // Check if we're in fullscreen bug state
        if (await detectFullscreenBug(page)) {
          console.log(`🚨 FULLSCREEN BUG DETECTED at ${i} seconds!`);
          foundFullscreenBug = true;
          
          // Take screenshot before recovery
          await page.screenshot({ path: `test-results/bug-detected-${i}sec.png`, fullPage: true });
          
          // Attempt recovery
          const recovered = await attemptFullRecovery(page);
          
          // Take screenshot after recovery attempts
          await page.screenshot({ path: `test-results/bug-recovery-${i}sec.png`, fullPage: true });
          
          console.log(`🏁 Recovery result: ${recovered ? 'SUCCESS - UI RESTORED' : 'FAILED - STILL STUCK'}`);
          
          // Assert recovery was successful
          expect(recovered).toBe(true);
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
        console.log('✅ No fullscreen navigation bug detected during test');
      }
      
    } else {
      console.log('❌ Image failed to load');
    }
    
    console.log('🏁 Fullscreen bug test completed');
  });
});