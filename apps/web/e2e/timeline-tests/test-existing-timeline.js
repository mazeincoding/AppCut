const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the editor page (assuming you already have the video in timeline)
    await page.goto('http://localhost:3000/editor/project/db4599bd-0a8a-4dc3-b727-2503b5434eac');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('Checking for existing timeline elements...');
    
    // Take screenshot to see current state
    await page.screenshot({ 
      path: 'current-timeline-state.png', 
      fullPage: true 
    });
    
    // Check for timeline elements
    const timelineElements = await page.locator('[data-testid="timeline-element"]').all();
    console.log(`Found ${timelineElements.length} timeline elements`);
    
    if (timelineElements.length > 0) {
      console.log('✅ Timeline elements found! Checking gradient styling...');
      
      for (let i = 0; i < timelineElements.length; i++) {
        const element = timelineElements[i];
        
        console.log(`\n--- Timeline Element ${i + 1} ---`);
        
        // Get the element's HTML structure
        const elementHTML = await element.innerHTML();
        console.log('Element HTML:', elementHTML.substring(0, 300) + '...');
        
        // Check all child divs for gradient styling
        const elementStyles = await element.evaluate((el) => {
          const allDivs = el.querySelectorAll('div');
          const results = [];
          
          allDivs.forEach((div, index) => {
            const computedStyle = window.getComputedStyle(div);
            const hasGradient = 
              computedStyle.background.includes('linear-gradient') ||
              computedStyle.background.includes('rgb(59, 130, 246)') ||
              div.style.background.includes('linear-gradient') ||
              div.style.background.includes('rgb(59, 130, 246)');
            
            if (hasGradient || index < 3) { // Show first 3 divs always, plus any with gradients
              results.push({
                index,
                className: div.className,
                styleAttr: div.style.cssText,
                computedBackground: computedStyle.background,
                hasGradient,
                textContent: div.textContent?.substring(0, 50)
              });
            }
          });
          
          return results;
        });
        
        console.log('Element styles analysis:', JSON.stringify(elementStyles, null, 2));
        
        const hasGradient = elementStyles.some(style => style.hasGradient);
        
        if (hasGradient) {
          console.log('✅ GRADIENT FOUND in timeline element!');
        } else {
          console.log('❌ NO GRADIENT found in timeline element');
          
          // Let's check what background it actually has
          const actualBackground = await element.evaluate((el) => {
            const mainDiv = el.querySelector('div');
            if (mainDiv) {
              const computed = window.getComputedStyle(mainDiv);
              return {
                backgroundColor: computed.backgroundColor,
                background: computed.background,
                classList: Array.from(mainDiv.classList)
              };
            }
            return null;
          });
          
          console.log('Actual background styling:', actualBackground);
        }
      }
    } else {
      console.log('❌ No timeline elements found');
      console.log('Please drag a video to the timeline first, then run this test again');
      
      // Check if there are any media items available to drag
      const mediaItems = await page.locator('[draggable="true"]').all();
      console.log(`Found ${mediaItems.length} draggable media items`);
      
      if (mediaItems.length > 0) {
        const mediaText = await mediaItems[0].textContent();
        console.log(`First media item: "${mediaText}"`);
        console.log('You can drag this to the timeline and run the test again');
      }
    }
    
    // Check if the "No media added" text is still visible
    const noMediaText = await page.locator('text=No media added to timeline').count();
    if (noMediaText > 0) {
      console.log('Timeline is still empty - "No media added" message is visible');
    } else {
      console.log('Timeline appears to have content - "No media added" message not found');
    }
    
    console.log('\nTest complete. You can now:');
    console.log('1. Drag a video to the timeline if not already done');
    console.log('2. Check if the timeline element shows the blue-purple-pink gradient');
    console.log('3. Run this test again to verify the gradient is working');
    
    // Keep browser open for manual verification
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();