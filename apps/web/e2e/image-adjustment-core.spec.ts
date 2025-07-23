import { test, expect } from '@playwright/test';
import { join } from 'path';

test.describe('Image Adjustment Core Features', () => {
  test('navigation between media and adjustment tabs', async ({ page }) => {
    // Navigate to editor
    await page.goto('/editor/project/test-project');
    await page.waitForLoadState('networkidle');
    
    // Screenshot 1: Initial editor view
    await page.screenshot({ path: 'test-results/1-initial-editor.png', fullPage: true });
    
    // Find and click the Adjustment tab
    const adjustmentTab = page.locator('span:text("Adjustment")');
    await adjustmentTab.click();
    
    // Wait a bit for transition
    await page.waitForTimeout(1000);
    
    // Screenshot 2: After clicking Adjustment tab
    await page.screenshot({ path: 'test-results/2-adjustment-view.png', fullPage: true });
    
    // Verify we're in adjustment view
    await expect(page.locator('h2:text("Image Adjustment")')).toBeVisible();
    
    // Verify back button exists and works
    const backButton = page.locator('button[aria-label="Back to media"]');
    await expect(backButton).toBeVisible();
    
    // Screenshot 3: Highlighting back button
    await backButton.hover();
    await page.screenshot({ path: 'test-results/3-back-button-hover.png', fullPage: true });
    
    // Click back button
    await backButton.click();
    
    // Wait for transition
    await page.waitForTimeout(1000);
    
    // Screenshot 4: After clicking back
    await page.screenshot({ path: 'test-results/4-back-to-media.png', fullPage: true });
    
    // Verify we're back in media view by checking that Media tab exists
    await expect(page.locator('span:text("Media")')).toBeVisible();
  });

  test('image adjustment UI elements', async ({ page }) => {
    // Navigate to editor and adjustment tab
    await page.goto('/editor/project/test-project');
    await page.waitForLoadState('networkidle');
    
    const adjustmentTab = page.locator('span:text("Adjustment")');
    await adjustmentTab.click();
    
    // Wait for adjustment view
    await page.waitForSelector('h2:text("Image Adjustment")');
    
    // Verify key UI elements are present
    const elements = {
      header: page.locator('h2:text("Image Adjustment")'),
      backButton: page.locator('button[aria-label="Back to media"]'),
      uploadArea: page.locator('text="Upload an image to edit"'),
      modelSection: page.locator('label:text("AI Model")'),
      // Look for at least one model card
      modelCard: page.locator('h4:text("SeedEdit v3")'),
    };
    
    // Check each element is visible
    for (const [name, element] of Object.entries(elements)) {
      await expect(element).toBeVisible({ timeout: 5000 });
    }
  });

  test('model selection', async ({ page }) => {
    // Navigate to adjustment tab
    await page.goto('/editor/project/test-project');
    await page.waitForLoadState('networkidle');
    
    const adjustmentTab = page.locator('span:text("Adjustment")');
    await adjustmentTab.click();
    
    // Wait for models to load
    await page.waitForSelector('label:text("AI Model")');
    
    // Find all model cards
    const modelCards = page.locator('h4').filter({ 
      hasText: /SeedEdit v3|FLUX Pro Kontext/ 
    });
    
    // Should have at least one model
    expect(await modelCards.count()).toBeGreaterThan(0);
    
    // Click on first model
    const firstModel = modelCards.first();
    await firstModel.click();
    
    // Verify model is selected (parent should have different styling)
    const selectedCard = page.locator('.border-primary').first();
    await expect(selectedCard).toBeVisible();
  });

  test('parameter controls toggle', async ({ page }) => {
    // Navigate to adjustment tab
    await page.goto('/editor/project/test-project');
    await page.waitForLoadState('networkidle');
    
    const adjustmentTab = page.locator('span:text("Adjustment")');
    await adjustmentTab.click();
    
    // Look for settings/parameters button
    const settingsButton = page.locator('button').filter({ 
      has: page.locator('.lucide-settings') 
    }).first();
    
    // Toggle parameters if button exists
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      // Wait a bit for animation
      await page.waitForTimeout(500);
      
      // Check if parameter controls are visible
      const parameterSection = page.locator('text="Parameters"');
      await expect(parameterSection).toBeVisible();
    }
  });

  test('complete image upload and editing workflow', async ({ page }) => {
    // Navigate to editor
    await page.goto('/editor/project/test-project');
    await page.waitForLoadState('networkidle');
    
    // Screenshot 1: Initial state
    await page.screenshot({ path: 'test-results/workflow-1-initial.png', fullPage: true });
    
    // Navigate to Adjustment tab
    const adjustmentTab = page.locator('span:text("Adjustment")');
    await adjustmentTab.click();
    await page.waitForTimeout(1000);
    
    // Screenshot 2: Adjustment view
    await page.screenshot({ path: 'test-results/workflow-2-adjustment-empty.png', fullPage: true });
    
    // Upload an image
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Click on the upload area (the dashed border area)
    const uploadArea = page.locator('.border-dashed').first();
    await uploadArea.click();
    
    const fileChooser = await fileChooserPromise;
    const testImagePath = join(__dirname, 'fixtures', 'test-image.jpg');
    await fileChooser.setFiles(testImagePath);
    
    // Wait for image to be processed and loaded
    await page.waitForTimeout(3000);
    
    // Screenshot 3: After image upload
    await page.screenshot({ path: 'test-results/workflow-3-image-uploaded.png', fullPage: true });
    
    // Verify image loaded successfully
    await expect(page.locator('span:text("Image loaded")')).toBeVisible();
    
    // Check that we have model options visible
    await expect(page.locator('label:text("AI Model")')).toBeVisible();
    
    // Screenshot 4: Model selection area
    await page.screenshot({ path: 'test-results/workflow-4-models-visible.png', fullPage: true });
    
    // Test the enhanced back button hover effect
    const backButton = page.locator('button[aria-label="Back to media"]');
    await backButton.hover();
    await page.waitForTimeout(500); // Let hover effect show
    
    // Screenshot 5: Back button hover effect
    await page.screenshot({ path: 'test-results/workflow-5-back-button-hover.png', fullPage: true });
    
    // Click back to return to media view
    await backButton.click();
    await page.waitForTimeout(1000);
    
    // Screenshot 6: Back to media view
    await page.screenshot({ path: 'test-results/workflow-6-back-to-media.png', fullPage: true });
    
    // Verify we're back in media view and the uploaded image should now be in the media panel
    await expect(page.locator('span:text("Media")')).toBeVisible();
    
    // Look for the uploaded image in the media panel
    const mediaItems = page.locator('.group.w-28.h-28');
    const itemCount = await mediaItems.count();
    
    if (itemCount > 0) {
      // Screenshot 7: Media panel with uploaded image
      await page.screenshot({ path: 'test-results/workflow-7-media-with-image.png', fullPage: true });
      
      // Right-click on the first media item to test context menu
      await mediaItems.first().click({ button: 'right' });
      await page.waitForTimeout(500);
      
      // Screenshot 8: Context menu
      await page.screenshot({ path: 'test-results/workflow-8-context-menu.png', fullPage: true });
      
      // Check if "Edit Image" option is available
      const editImageOption = page.locator('text="Edit Image"');
      if (await editImageOption.isVisible()) {
        await editImageOption.click();
        await page.waitForTimeout(1000);
        
        // Screenshot 9: Back in adjustment view via context menu
        await page.screenshot({ path: 'test-results/workflow-9-context-menu-edit.png', fullPage: true });
        
        // Verify we're back in adjustment view with the image loaded
        await expect(page.locator('h2:text("Image Adjustment")')).toBeVisible();
        await expect(page.locator('span:text("Image loaded")')).toBeVisible();
      }
    }
  });
});