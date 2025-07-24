import { test, expect } from '@playwright/test';
import { join } from 'path';

test.describe('Real Image Upload Test', () => {
  test('upload real image and test navigation', async ({ page }) => {
    // Navigate to editor
    await page.goto('/editor/project/test-project');
    await page.waitForLoadState('networkidle');
    
    // Screenshot 1: Initial editor
    await page.screenshot({ path: 'test-results/real-1-initial.png', fullPage: true });
    
    // Navigate to Adjustment tab
    const adjustmentTab = page.locator('span:text("Adjustment")');
    await adjustmentTab.click();
    await page.waitForTimeout(1000);
    
    // Screenshot 2: Empty adjustment view
    await page.screenshot({ path: 'test-results/real-2-adjustment-empty.png', fullPage: true });
    
    // Upload the real image
    console.log('Starting image upload...');
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Click on the upload area
    const uploadArea = page.locator('.border-dashed').first();
    await uploadArea.click();
    
    const fileChooser = await fileChooserPromise;
    const realImagePath = join(__dirname, 'fixtures', 'test-image-real.jpg');
    console.log('Uploading image from:', realImagePath);
    await fileChooser.setFiles(realImagePath);
    
    // Wait for image to load
    console.log('Waiting for image to load...');
    await page.waitForTimeout(5000);
    
    // Screenshot 3: After uploading real image
    await page.screenshot({ path: 'test-results/real-3-image-loaded.png', fullPage: true });
    
    // Check if image loaded
    const imageLoaded = page.locator('span:text("Image loaded")');
    if (await imageLoaded.isVisible()) {
      console.log('✅ Image loaded successfully!');
      
      // Get the file size info (skip if multiple elements)
      try {
        const fileInfo = await page.locator('span:has-text("KB")').first().textContent();
        console.log('File info:', fileInfo);
      } catch (e) {
        console.log('File info not readable, continuing...');
      }
      
      // Check if models are visible
      const modelsVisible = await page.locator('h4:text("SeedEdit v3")').isVisible();
      console.log('Models visible:', modelsVisible);
      
      // Screenshot 4: Focus on the loaded image area
      await page.screenshot({ path: 'test-results/real-4-models-ready.png', fullPage: true });
      
      // Test AI generation workflow
      console.log('Testing AI image generation...');
      
      // Select the first model (SeedEdit v3)
      const seedEditModel = page.locator('h4:text("SeedEdit v3")').first();
      await seedEditModel.click();
      console.log('✅ Selected SeedEdit v3 model');
      
      // Add a prompt
      const promptInput = page.locator('textarea').first();
      if (await promptInput.isVisible()) {
        await promptInput.fill('Make this image brighter and more colorful');
        console.log('✅ Added prompt: "Make this image brighter and more colorful"');
      }
      
      // Look for Generate Edit button
      const generateButton = page.locator('button:has-text("Generate")').first();
      if (await generateButton.isVisible()) {
        console.log('✅ Generate button found, clicking...');
        
        // Screenshot 5: Before clicking generate
        await page.screenshot({ path: 'test-results/real-5-before-generate.png', fullPage: true });
        
        await generateButton.click();
        console.log('🎯 Generate button clicked! Starting 20-second wait...');
        
        // Wait 2 seconds and take screenshot of processing state
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/real-6-processing-2sec.png', fullPage: true });
        console.log('📸 Screenshot taken after 2 seconds');
        
        // Wait 5 seconds total
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/real-7-processing-5sec.png', fullPage: true });
        console.log('📸 Screenshot taken after 5 seconds');
        
        // Wait 10 seconds total
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'test-results/real-8-processing-10sec.png', fullPage: true });
        console.log('📸 Screenshot taken after 10 seconds');
        
        // Wait 20 seconds total
        await page.waitForTimeout(10000);
        await page.screenshot({ path: 'test-results/real-9-processing-20sec.png', fullPage: true });
        console.log('📸 Screenshot taken after 20 seconds');
        
        // Check for completion indicators
        const completedText = page.locator('text=Completed').first();
        const errorText = page.locator('text=Error').first();
        const processingText = page.locator('text=Processing').first();
        const generateText = page.locator('text=Generating').first();
        
        const isCompleted = await completedText.isVisible();
        const hasError = await errorText.isVisible();
        const isProcessing = await processingText.isVisible();
        const isGenerating = await generateText.isVisible();
        
        console.log('=== GENERATION STATUS AFTER 20 SECONDS ===');
        console.log('Completed:', isCompleted);
        console.log('Error:', hasError);
        console.log('Processing:', isProcessing);
        console.log('Generating:', isGenerating);
        
        // Check edit history for new edits
        const editHistory = page.locator('text=1 edits');
        const hasEdit = await editHistory.isVisible();
        console.log('Edit in history:', hasEdit);
        
        // Check for edited image in preview
        const editedImage = page.locator('img').nth(1); // Second image would be the edited one
        const hasEditedImage = await editedImage.isVisible();
        console.log('Edited image visible:', hasEditedImage);
        
        // Take final screenshot showing result
        await page.screenshot({ path: 'test-results/real-10-final-result.png', fullPage: true });
        console.log('📸 Final result screenshot taken');
        
        // Log all visible text for debugging
        const pageText = await page.locator('body').textContent();
        const relevantText = pageText?.substring(0, 500) || 'No text found';
        console.log('Page text sample:', relevantText);
        
      } else {
        console.log('❌ Generate button not found');
      }
      
      // Test the enhanced back button
      const backButton = page.locator('button[aria-label="Back to media"]');
      await backButton.hover();
      await page.waitForTimeout(1000);
      
      // Screenshot 5: Back button hover with real image
      await page.screenshot({ path: 'test-results/real-5-back-hover.png', fullPage: true });
      
      // Click back
      await backButton.click();
      await page.waitForTimeout(2000);
      
      // Screenshot 6: Back to media
      await page.screenshot({ path: 'test-results/real-6-back-to-media.png', fullPage: true });
      
      // Check if we're back in media view
      const backToMedia = await page.locator('span:text("Media")').isVisible();
      console.log('Successfully navigated back to media:', backToMedia);
      
      // Check if the image appears in media panel
      const mediaItems = page.locator('.group.w-28.h-28');
      const itemCount = await mediaItems.count();
      console.log('Media items count:', itemCount);
      
      if (itemCount > 0) {
        // Screenshot 7: Media panel with uploaded image
        await page.screenshot({ path: 'test-results/real-7-media-with-image.png', fullPage: true });
        
        // Test context menu
        await mediaItems.first().click({ button: 'right' });
        await page.waitForTimeout(1000);
        
        // Screenshot 8: Context menu on real image
        await page.screenshot({ path: 'test-results/real-8-context-menu.png', fullPage: true });
        
        // Check for Edit Image option
        const editOption = page.locator('text="Edit Image"');
        if (await editOption.isVisible()) {
          console.log('✅ Edit Image context menu option is available!');
          
          // Click Edit Image
          await editOption.click();
          await page.waitForTimeout(2000);
          
          // Screenshot 9: Back in adjustment view via context menu
          await page.screenshot({ path: 'test-results/real-9-context-edit.png', fullPage: true });
          
          // Verify we're back in adjustment with image loaded
          const backInAdjustment = await page.locator('h2:text("Image Adjustment")').isVisible();
          const imageStillLoaded = await page.locator('span:text("Image loaded")').isVisible();
          
          console.log('Back in adjustment via context menu:', backInAdjustment);
          console.log('Image still loaded:', imageStillLoaded);
        }
      }
      
    } else {
      console.log('❌ Image failed to load');
      // Take screenshot of failure state
      await page.screenshot({ path: 'test-results/real-error-failed-load.png', fullPage: true });
    }
    
    // Final verification
    await expect(page.locator('h2:text("Image Adjustment")')).toBeVisible();
    console.log('✅ Test completed successfully!');
  });
});