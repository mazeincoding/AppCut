const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the editor page
    await page.goto('http://localhost:3000/editor/project/db4599bd-0a8a-4dc3-b727-2503b5434eac');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'timeline-initial.png', 
      fullPage: true 
    });
    console.log('Initial screenshot saved as timeline-initial.png');
    
    // Look for the Add button in media panel
    const addButton = await page.locator('button:has-text("Add")').first();
    const hasAddButton = await addButton.count() > 0;
    console.log('Add button found:', hasAddButton);
    
    if (hasAddButton) {
      // Create a test video file path (we'll simulate file upload)
      const testVideoPath = path.join(__dirname, 'test-video.mp4');
      
      // Click the add button to open file dialog
      await addButton.click();
      console.log('Clicked Add button');
      
      // Wait a moment
      await page.waitForTimeout(2000);
      
      // Try to find file input and upload
      const fileInput = await page.locator('input[type="file"]').first();
      const hasFileInput = await fileInput.count() > 0;
      console.log('File input found:', hasFileInput);
      
      if (hasFileInput) {
        // Since we don't have a real video file, let's skip the upload
        // and check if there are already media items
        console.log('Skipping file upload - checking for existing media...');
      }
      
      // Check for existing media items in the media panel
      const mediaItems = await page.locator('[class*="media"], [data-testid*="media"]').all();
      console.log(`Found ${mediaItems.length} potential media items`);
      
      // Look for any draggable media items
      const draggableItems = await page.locator('[draggable="true"], [class*="draggable"]').all();
      console.log(`Found ${draggableItems.length} draggable items`);
      
      // Take screenshot after trying to add media
      await page.screenshot({ 
        path: 'timeline-after-add-click.png', 
        fullPage: true 
      });
      console.log('Screenshot after add click saved');
    }
    
    // Look for timeline elements
    const timelineElements = await page.locator('[data-testid="timeline-element"]').all();
    console.log(`Found ${timelineElements.length} timeline elements`);
    
    if (timelineElements.length > 0) {
      // Get the first timeline element
      const firstElement = timelineElements[0];
      
      // Get computed styles
      const elementStyles = await firstElement.evaluate((el) => {
        const computedStyle = window.getComputedStyle(el);
        const innerDiv = el.querySelector('div');
        const innerStyles = innerDiv ? window.getComputedStyle(innerDiv) : null;
        
        return {
          outerBackground: computedStyle.backgroundColor,
          outerClasses: el.className,
          innerBackground: innerStyles ? innerStyles.background : 'none',
          innerClasses: innerDiv ? innerDiv.className : 'none',
          innerHTML: el.innerHTML
        };
      });
      
      console.log('Timeline Element Styles:', JSON.stringify(elementStyles, null, 2));
      
      // Check if gradient is applied
      const hasGradient = elementStyles.innerBackground.includes('linear-gradient') || 
                         elementStyles.innerBackground.includes('rgb(59, 130, 246)');
      
      console.log('Has gradient:', hasGradient);
      
      if (!hasGradient) {
        console.log('❌ Gradient not found! Checking for video elements...');
        
        // Check for video media items
        const videoElements = await page.locator('[data-testid="timeline-element"]').evaluateAll((elements) => {
          return elements.map(el => {
            const contentDiv = el.querySelector('div > div');
            const hasVideoBackground = contentDiv && contentDiv.style.background.includes('linear-gradient');
            return {
              hasVideoBackground,
              innerHTML: el.innerHTML,
              styles: contentDiv ? contentDiv.style.cssText : 'none'
            };
          });
        });
        
        console.log('Video elements check:', JSON.stringify(videoElements, null, 2));
      } else {
        console.log('✅ Gradient found successfully!');
      }
    }
    
    // Take a screenshot
    await page.screenshot({ 
      path: 'timeline-gradient-test.png', 
      fullPage: true 
    });
    console.log('Screenshot saved as timeline-gradient-test.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();