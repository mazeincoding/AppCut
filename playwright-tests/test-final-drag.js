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
    
    // Find the draggable media item
    const draggableItem = await page.locator('[draggable="true"]').filter({ hasText: '32_egypt' }).first();
    const hasDraggable = await draggableItem.count() > 0;
    console.log('Found draggable media item:', hasDraggable);
    
    if (hasDraggable) {
      // Find a good drop target in the timeline
      // Look for the timeline area that says "No media added to timeline"
      const timelineDropArea = await page.locator('text=No media added to timeline').first();
      const hasDropArea = await timelineDropArea.count() > 0;
      console.log('Found timeline drop area:', hasDropArea);
      
      if (hasDropArea) {
        console.log('Performing drag and drop to timeline...');
        
        // Use Playwright's built-in drag and drop
        await draggableItem.dragTo(timelineDropArea);
        
        console.log('Drag and drop completed');
        
        // Wait for the timeline to update
        await page.waitForTimeout(3000);
        
        // Take screenshot after drag
        await page.screenshot({ 
          path: 'final-after-drag.png', 
          fullPage: true 
        });
        
        // Check for timeline elements now
        const timelineElements = await page.locator('[data-testid="timeline-element"]').all();
        console.log(`Found ${timelineElements.length} timeline elements after drag`);
        
        if (timelineElements.length > 0) {
          console.log('✅ Video successfully added to timeline!');
          
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
                className: div.className,
                innerHTML: div.innerHTML.substring(0, 100) // First 100 chars
              });
            });
            return styles;
          });
          
          console.log('Timeline element styles:', JSON.stringify(elementStyles, null, 2));
          
          const hasGradient = elementStyles.some(style => 
            style.background.includes('linear-gradient') || 
            style.styleAttr.includes('linear-gradient') ||
            style.background.includes('rgb(59, 130, 246)') ||
            style.styleAttr.includes('rgb(59, 130, 246)')
          );
          
          if (hasGradient) {
            console.log('✅ Timeline element HAS gradient styling!');
          } else {
            console.log('❌ Timeline element does NOT have gradient styling!');
            console.log('Need to debug why the gradient is not being applied...');
          }
          
          // Get the outer HTML of the timeline element for debugging
          const outerHTML = await firstElement.innerHTML();
          console.log('Timeline element HTML preview:', outerHTML.substring(0, 500) + '...');
          
        } else {
          console.log('❌ No timeline elements found after drag and drop');
        }
      } else {
        console.log('❌ Timeline drop area not found');
      }
    } else {
      console.log('❌ Draggable media item not found');
    }
    
    // Keep browser open for manual verification
    console.log('Test complete. Check the timeline for gradient colors...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();