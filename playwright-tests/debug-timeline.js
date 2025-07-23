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
    
    // Find and drag the video
    const draggableItem = await page.locator('[draggable="true"]').filter({ hasText: '32_egypt' }).first();
    const timelineDropArea = await page.locator('text=No media added to timeline').first();
    
    if (await draggableItem.count() > 0 && await timelineDropArea.count() > 0) {
      await draggableItem.dragTo(timelineDropArea);
      await page.waitForTimeout(3000);
      
      // Take screenshot
      await page.screenshot({ 
        path: 'debug-after-drag.png', 
        fullPage: true 
      });
    }
    
    // Check for various possible selectors for timeline elements
    const possibleSelectors = [
      '[data-testid="timeline-element"]',
      '[class*="timeline-element"]',
      '.timeline-element',
      '[data-element-id]',
      '[class*="element"]'
    ];
    
    console.log('Checking for timeline elements with different selectors:');
    for (const selector of possibleSelectors) {
      const elements = await page.locator(selector).all();
      console.log(`  ${selector}: ${elements.length} elements`);
    }
    
    // Look for any elements containing the video name in the timeline area
    const timelineVideoElements = await page.locator('*').filter({ hasText: '32_egypt' }).all();
    console.log(`Found ${timelineVideoElements.length} total elements containing "32_egypt"`);
    
    // Check if the "No media added" text is still there
    const noMediaText = await page.locator('text=No media added to timeline').count();
    console.log('Still shows "No media added":', noMediaText > 0);
    
    // Look for any gradient styles in the entire page
    const allGradientElements = await page.locator('div[style*="linear-gradient"]').all();
    console.log(`Found ${allGradientElements.length} elements with linear-gradient styles`);
    
    if (allGradientElements.length > 0) {
      for (let i = 0; i < allGradientElements.length; i++) {
        const style = await allGradientElements[i].getAttribute('style');
        const text = await allGradientElements[i].textContent();
        console.log(`Gradient element ${i + 1}:`);
        console.log(`  Style: ${style}`);
        console.log(`  Text: ${text?.substring(0, 50)}...`);
      }
    }
    
    // Check all elements with blue colors (from our gradient)
    const blueElements = await page.locator('*').filter({ hasText: /.*/ }).evaluateAll(elements => {
      return elements.filter(el => {
        const style = window.getComputedStyle(el);
        const bgColor = style.backgroundColor;
        const bg = style.background;
        return bgColor.includes('59, 130, 246') || bg.includes('59, 130, 246') || 
               bg.includes('linear-gradient') || el.style.background.includes('linear-gradient');
      }).map(el => ({
        tagName: el.tagName,
        className: el.className,
        textContent: el.textContent?.substring(0, 50),
        style: el.style.cssText,
        computedBackground: window.getComputedStyle(el).background
      }));
    });
    
    console.log(`Found ${blueElements.length} elements with blue/gradient styling:`, blueElements);
    
    // Keep browser open for manual inspection
    console.log('Debug complete. Browser left open for manual inspection...');
    await page.waitForTimeout(20000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();