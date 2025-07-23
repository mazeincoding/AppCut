const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the editor page
    await page.goto('http://localhost:3000/editor/project/db4599bd-0a8a-4dc3-b727-2503b5434eac');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('Uploading video...');
    
    // Upload the video first
    const fileInput = await page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      const videoPath = 'c:\\Users\\zdhpe\\Desktop\\video_agent\\character_refine\\videos\\32_egypt.mp4';
      await fileInput.setInputFiles(videoPath);
      await page.waitForTimeout(5000);
    }
    
    // Now find the uploaded video in the media panel
    const mediaItems = await page.locator('text=32_egypt').all();
    console.log(`Found ${mediaItems.length} media items with "32_egypt"`);
    
    if (mediaItems.length > 0) {
      // Find the draggable media item (likely a button or div containing the video)
      const draggableItem = await page.locator('[class*="draggable"], button').filter({ hasText: '32_egypt' }).first();
      const hasDraggable = await draggableItem.count() > 0;
      console.log('Found draggable media item:', hasDraggable);
      
      if (hasDraggable) {
        // Find the timeline area to drop the video
        const timelineArea = await page.locator('[class*="timeline"], [data-testid*="timeline"]').first();
        const hasTimeline = await timelineArea.count() > 0;
        console.log('Found timeline area:', hasTimeline);
        
        if (hasTimeline) {
          console.log('Performing drag and drop...');
          
          // Get bounding boxes for drag and drop
          const sourceBox = await draggableItem.boundingBox();
          const targetBox = await timelineArea.boundingBox();
          
          if (sourceBox && targetBox) {
            // Perform drag and drop
            await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(targetBox.x + 200, targetBox.y + targetBox.height / 2, { steps: 10 });
            await page.mouse.up();
            
            console.log('Drag and drop completed');
            
            // Wait for the timeline to update
            await page.waitForTimeout(3000);
            
            // Take screenshot after drag
            await page.screenshot({ 
              path: 'after-drag-to-timeline.png', 
              fullPage: true 
            });
            
            // Check for timeline elements now
            const timelineElements = await page.locator('[data-testid="timeline-element"]').all();
            console.log(`Found ${timelineElements.length} timeline elements after drag`);
            
            if (timelineElements.length > 0) {
              // Inspect the gradient styling
              const firstElement = timelineElements[0];
              
              const elementStyles = await firstElement.evaluate((el) => {
                const allDivs = el.querySelectorAll('div');
                const styles = [];
                allDivs.forEach((div, index) => {
                  const computedStyle = window.getComputedStyle(div);
                  styles.push({
                    index,
                    background: computedStyle.background,
                    backgroundColor: computedStyle.backgroundColor,
                    styleAttr: div.style.cssText,
                    className: div.className
                  });
                });
                return styles;
              });
              
              console.log('Timeline element styles:', JSON.stringify(elementStyles, null, 2));
              
              const hasGradient = elementStyles.some(style => 
                style.background.includes('linear-gradient') || 
                style.styleAttr.includes('linear-gradient') ||
                style.background.includes('rgb(59, 130, 246)')
              );
              
              console.log('✅ Timeline element has gradient:', hasGradient);
              
              if (!hasGradient) {
                console.log('❌ No gradient found in timeline element!');
              }
            }
          }
        }
      }
    }
    
    // Keep browser open
    console.log('Test complete. Browser left open...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();