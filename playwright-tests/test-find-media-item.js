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
    
    // Take screenshot after upload to see the media panel
    await page.screenshot({ 
      path: 'media-panel-with-video.png', 
      fullPage: true 
    });
    
    // Look for all elements that might contain the video
    const allElements = await page.locator('*').filter({ hasText: '32_egypt' }).all();
    console.log(`Found ${allElements.length} elements containing "32_egypt"`);
    
    // Check for different possible selectors
    const possibleSelectors = [
      '[data-testid*="media"]',
      '[class*="media"]',
      '[class*="draggable"]',
      'button:has-text("32_egypt")',
      'div:has-text("32_egypt")',
      '[draggable="true"]'
    ];
    
    for (const selector of possibleSelectors) {
      const elements = await page.locator(selector).all();
      console.log(`Selector "${selector}": found ${elements.length} elements`);
      
      if (elements.length > 0) {
        const firstElement = elements[0];
        const text = await firstElement.textContent();
        const classes = await firstElement.getAttribute('class');
        console.log(`  First element text: "${text}"`);
        console.log(`  First element classes: "${classes}"`);
      }
    }
    
    // Look specifically for DraggableMediaItem component
    const draggableMediaItems = await page.locator('[class*="DraggableMediaItem"], [data-testid="draggable-media-item"]').all();
    console.log(`Found ${draggableMediaItems.length} DraggableMediaItem components`);
    
    // Look for any element that contains video preview
    const videoPreviewElements = await page.locator('img, video, [src*="mp4"], [class*="preview"]').all();
    console.log(`Found ${videoPreviewElements.length} potential video preview elements`);
    
    // Try to find the media item by looking for the parent container
    const mediaContainers = await page.locator('div').filter({ hasText: '32_egypt' }).all();
    console.log(`Found ${mediaContainers.length} div containers with "32_egypt"`);
    
    if (mediaContainers.length > 0) {
      // Try to drag the first container that contains the video name
      const firstContainer = mediaContainers[0];
      const isDraggable = await firstContainer.getAttribute('draggable');
      console.log('First container draggable attribute:', isDraggable);
      
      // Check if parent is draggable
      const parent = await firstContainer.locator('..').first();
      const parentDraggable = await parent.getAttribute('draggable');
      console.log('Parent draggable attribute:', parentDraggable);
      
      // Get all classes to understand the structure
      const containerClasses = await firstContainer.getAttribute('class');
      const parentClasses = await parent.getAttribute('class');
      console.log('Container classes:', containerClasses);
      console.log('Parent classes:', parentClasses);
    }
    
    // Keep browser open for manual inspection
    console.log('Browser left open for manual inspection of media panel...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();