import { test, expect } from '@playwright/test';
import { join } from 'path';

test.describe('AI Generation Test', () => {
  test('test generation workflow with real image', async ({ page }) => {
    console.log('🚀 Starting AI generation test...');
    
    // Navigate to editor
    await page.goto('/editor/project/test-project');
    await page.waitForLoadState('networkidle');
    
    // Go to Adjustment tab
    const adjustmentTab = page.locator('span:text("Adjustment")');
    await adjustmentTab.click();
    await page.waitForTimeout(2000);
    
    // Upload the real image
    const fileChooserPromise = page.waitForEvent('filechooser');
    const uploadArea = page.locator('.border-dashed').first();
    await uploadArea.click();
    
    const fileChooser = await fileChooserPromise;
    const realImagePath = join(__dirname, 'fixtures', 'test-image-real.jpg');
    await fileChooser.setFiles(realImagePath);
    
    // Wait for image to load
    await page.waitForTimeout(5000);
    
    // Verify image loaded
    const imageLoaded = page.locator('span:text("Image loaded")');
    if (await imageLoaded.isVisible()) {
      console.log('✅ Image loaded successfully!');
      
      // Screenshot: Image loaded state
      await page.screenshot({ path: 'test-results/gen-1-image-loaded.png', fullPage: true });
      
      // Look for ANY available model (not specific one)
      const anyModel = page.locator('h4').first();
      if (await anyModel.isVisible()) {
        await anyModel.click();
        console.log('✅ Selected a model');
        
        // Look for Generate button (might be "Generate Edit" or just "Generate")
        const generateButton = page.locator('button').filter({ 
          hasText: /Generate|Edit/ 
        }).first();
        
        if (await generateButton.isVisible()) {
          console.log('✅ Found Generate button');
          
          // Add prompt if textarea exists
          const promptArea = page.locator('textarea').first();
          if (await promptArea.isVisible()) {
            await promptArea.fill('Make this image brighter');
            console.log('✅ Added prompt');
          }
          
          // Screenshot: Before generation
          await page.screenshot({ path: 'test-results/gen-2-before-generate.png', fullPage: true });
          
          // Click Generate
          await generateButton.click();
          console.log('🎯 GENERATE CLICKED! Starting monitoring...');
          
          // Monitor every 5 seconds for 30 seconds
          for (let i = 5; i <= 30; i += 5) {
            await page.waitForTimeout(5000);
            await page.screenshot({ path: `test-results/gen-3-processing-${i}sec.png`, fullPage: true });
            console.log(`📸 Screenshot at ${i} seconds`);
            
            // Check for any status indicators
            const pageText = await page.locator('body').textContent();
            const statusWords = ['Processing', 'Generating', 'Completed', 'Error', 'Failed', 'Success'];
            const foundStatus = statusWords.find(word => pageText?.includes(word));
            
            if (foundStatus) {
              console.log(`📊 Status at ${i}s: ${foundStatus}`);
            }
            
            // Check for new images or edit history
            const editBadge = page.locator('text=1 edits');
            const hasEdit = await editBadge.isVisible();
            
            if (hasEdit) {
              console.log(`🎉 EDIT COMPLETED at ${i} seconds!`);
              
              // Wait 50 seconds AFTER processing completes to see what happens
              console.log('⏳ Waiting 50 seconds after processing to see page changes...');
              
              for (let j = 10; j <= 50; j += 10) {
                await page.waitForTimeout(10000);
                await page.screenshot({ path: `test-results/gen-post-${j}sec.png`, fullPage: true });
                console.log(`📸 Post-processing screenshot at ${j} seconds`);
                
                // Check current URL and page state
                const currentUrl = page.url();
                console.log(`🌐 URL at ${j}s: ${currentUrl}`);
                
                // Check for navigation elements
                const backButton = page.locator('button[aria-label="Back to media"]');
                const backButtonVisible = await backButton.isVisible();
                console.log(`🔙 Back button visible at ${j}s: ${backButtonVisible}`);
                
                // Check for any new page indicators
                const pageTitle = await page.title();
                console.log(`📄 Page title at ${j}s: ${pageTitle}`);
                
                // Check for any error or completion messages
                const pageText = await page.locator('body').textContent();
                const relevantText = pageText?.substring(0, 200) || '';
                console.log(`📝 Page text sample at ${j}s: ${relevantText}`);
                
                // Check if we're still in the adjustment view
                const adjustmentHeader = page.locator('h2:text("Image Adjustment")');
                const stillInAdjustment = await adjustmentHeader.isVisible();
                console.log(`🎛️ Still in adjustment view at ${j}s: ${stillInAdjustment}`);
              }
              
              break;
            }
          }
          
          // Final screenshot
          await page.screenshot({ path: 'test-results/gen-4-final-result.png', fullPage: true });
          console.log('📸 Final result captured');
          
          // Log final status
          const finalText = await page.locator('body').textContent();
          const finalStatusWords = ['Processing', 'Generating', 'Completed', 'Error', 'Failed', 'Success'];
          const finalStatus = finalStatusWords.find(word => finalText?.includes(word));
          console.log('🏁 Final status:', finalStatus || 'Unknown');
          
        } else {
          console.log('❌ Generate button not found');
          await page.screenshot({ path: 'test-results/gen-error-no-button.png', fullPage: true });
        }
      } else {
        console.log('❌ No models visible');
        await page.screenshot({ path: 'test-results/gen-error-no-models.png', fullPage: true });
      }
    } else {
      console.log('❌ Image failed to load');
      await page.screenshot({ path: 'test-results/gen-error-no-image.png', fullPage: true });
    }
    
    console.log('✅ Generation test completed');
  });
});