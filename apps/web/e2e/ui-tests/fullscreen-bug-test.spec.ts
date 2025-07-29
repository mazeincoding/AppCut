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
  
  // Check if basic UI is still visible
  const hasNav = await page.locator('nav').isVisible();
  const hasBody = await page.locator('body').isVisible();
  const recovered = hasNav && hasBody;
  
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
      const hasNav = await page.locator('nav').isVisible();
      const hasBody = await page.locator('body').isVisible();
      const recovered = hasNav && hasBody;
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
      const hasNav = await page.locator('nav').isVisible();
      const hasBody = await page.locator('body').isVisible();
      const recovered = hasNav && hasBody;
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
    
    // Navigate to projects page first 
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    
    // Try to create or access a project
    const createProjectButton = page.getByRole('button', { name: /create.*project/i }).first();
    if (await createProjectButton.isVisible()) {
      await createProjectButton.click();
      await page.waitForLoadState('networkidle');
    } else {
      // Navigate directly to editor
      await page.goto('/editor/project/test-project');
      await page.waitForLoadState('networkidle');
    }
    
    // Basic navigation test - check if we can navigate between tabs
    console.log('🔍 Testing basic navigation without getting stuck...');
    
    // Check if media panel tabs are available
    const tabs = ['Media', 'AI', 'Text', 'Adjustment'];
    let navigationWorking = true;
    
    for (const tabName of tabs) {
      const tab = page.locator(`button:has-text("${tabName}"), span:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`).first();
      
      if (await tab.isVisible({ timeout: 2000 })) {
        console.log(`🎯 Testing navigation to ${tabName} tab...`);
        await tab.click();
        await page.waitForTimeout(1000);
        
        // Check if we can still see basic UI elements and navigate
        const hasMainUI = await page.locator('body').isVisible();
        const hasNavigation = await page.locator('nav').isVisible();
        const hasEditorUI = await page.locator('main, .editor, .canvas-container').first().isVisible();
        
        if (!hasMainUI || !hasNavigation || !hasEditorUI) {
          console.log(`🚨 Navigation issue detected on ${tabName} tab!`);
          navigationWorking = false;
          
          // Attempt recovery
          const recovered = await attemptFullRecovery(page);
          expect(recovered).toBe(true);
          break;
        } else {
          console.log(`✅ ${tabName} tab navigation working correctly`);
        }
      } else {
        console.log(`⚠️ ${tabName} tab not found - skipping`);
      }
    }
    
    if (navigationWorking) {
      console.log('✅ All tested navigation paths working correctly - no fullscreen bug detected');
    }
    
    console.log('🏁 Fullscreen bug test completed');
  });
});