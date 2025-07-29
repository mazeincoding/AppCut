const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the editor page
    const testProjectId = process.env.TEST_PROJECT_ID || 'default-test-project-id';
    await page.goto(`http://localhost:3000/editor/project/${testProjectId}`);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('Taking initial screenshot...');
    await page.screenshot({ 
      path: 'before-video-upload.png', 
      fullPage: true 
    });
    
    // Look for the Add button in media panel
    const addButton = await page.locator('button:has-text("Add")').first();
    const hasAddButton = await addButton.count() > 0;
    console.log('Add button found:', hasAddButton);
    
    if (hasAddButton) {
      // Upload the specific video file
      const videoPath = 'c:\\Users\\zdhpe\\Desktop\\video_agent\\character_refine\\videos\\32_egypt.mp4';
      
      // Find the file input (it should be hidden)
      const fileInput = await page.locator('input[type="file"]').first();
      
      if (await fileInput.count() > 0) {
        console.log('Uploading video file...');
        await fileInput.setInputFiles(videoPath);
        
        // Wait for upload to process
        await page.waitForTimeout(5000);
        
        console.log('Taking screenshot after upload...');
        await page.screenshot({ 
          path: 'after-video-upload.png', 
          fullPage: true 
        });
        
        // Now check for timeline elements
        const timelineElements = await page.locator('[data-testid="timeline-element"]').all();
        console.log(`Found ${timelineElements.length} timeline elements after upload`);
        
        if (timelineElements.length > 0) {
          // Check the gradient styling
          const firstElement = timelineElements[0];
          const elementHTML = await firstElement.innerHTML();
          console.log('Timeline element HTML:', elementHTML);
          
          const hasGradient = elementHTML.includes('linear-gradient') || elementHTML.includes('rgb(59, 130, 246)');
          console.log('Timeline element has gradient:', hasGradient);
        }
        
        // Check for media items in the media panel
        const mediaItems = await page.locator('text=32_egypt').all();
        console.log(`Found ${mediaItems.length} media items with "32_egypt"`);
        
        // Keep browser open for inspection
        console.log('Upload complete. Browser left open for inspection...');
        await page.waitForTimeout(15000);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();