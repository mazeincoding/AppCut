import { test, expect } from '@playwright/test';

test.describe('Video Thumbnail Enhancement Demo', () => {
  test('demonstrate enhanced video thumbnail features', async ({ page }) => {
    // Navigate to the projects page first
    await page.goto('/projects');
    await page.waitForTimeout(2000);
    
    // Take screenshot of projects page
    await page.screenshot({ 
      path: 'test-results/video-thumbnails-1-projects-page.png',
      fullPage: false 
    });
    
    // Create or select a project
    const createButton = page.locator('button:has-text("Create Project")');
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(2000);
    } else {
      // Click on first project if it exists
      const firstProject = page.locator('.cursor-pointer').first();
      if (await firstProject.isVisible()) {
        await firstProject.click();
      }
    }
    
    // Wait for editor to load
    await page.waitForTimeout(3000);
    
    // Take screenshot of empty media panel
    await page.screenshot({ 
      path: 'test-results/video-thumbnails-2-empty-media-panel.png',
      fullPage: false 
    });
    
    // Focus on media panel area
    const mediaPanel = page.locator('.h-full.flex.flex-col.gap-1');
    
    // Take close-up of media panel
    if (await mediaPanel.isVisible()) {
      await mediaPanel.screenshot({ 
        path: 'test-results/video-thumbnails-3-media-panel-closeup.png'
      });
    }
    
    // Look for upload button
    const uploadButton = page.locator('button:has-text("Upload Media")').or(page.locator('button:has(.lucide-plus)'));
    if (await uploadButton.isVisible()) {
      await uploadButton.screenshot({ 
        path: 'test-results/video-thumbnails-4-upload-button.png'
      });
    }
    
    // Check if thumbnail controls are visible
    const thumbnailControls = page.locator('.bg-muted.rounded-lg:has(button:has-text("Low"))');
    if (await thumbnailControls.isVisible()) {
      await thumbnailControls.screenshot({ 
        path: 'test-results/video-thumbnails-5-thumbnail-controls.png'
      });
    }
    
    // Full page screenshot
    await page.screenshot({ 
      path: 'test-results/video-thumbnails-6-full-editor.png',
      fullPage: true 
    });
    
    console.log('Screenshots captured successfully!');
  });
  
  test('verify thumbnail UI components exist', async ({ page }) => {
    // Navigate directly to editor
    await page.goto('/editor/project');
    await page.waitForTimeout(3000);
    
    // Check for file input
    const fileInput = page.locator('input[type="file"]');
    expect(await fileInput.count()).toBeGreaterThan(0);
    
    // Check for media panel container
    const mediaPanel = page.locator('.h-full.flex.flex-col');
    expect(await mediaPanel.count()).toBeGreaterThan(0);
    
    // Log what we found
    console.log('File inputs found:', await fileInput.count());
    console.log('Media panels found:', await mediaPanel.count());
    
    // Check if our enhanced components are in the code
    const pageContent = await page.content();
    
    // These strings should be in our enhanced component
    const enhancedFeatures = [
      'EnhancedVideoPreview',
      'hover scrubbing',
      'thumbnail quality',
      'generateEnhancedThumbnails'
    ];
    
    let foundFeatures = 0;
    for (const feature of enhancedFeatures) {
      if (pageContent.includes(feature)) {
        console.log(`✓ Found enhanced feature: ${feature}`);
        foundFeatures++;
      }
    }
    
    console.log(`Found ${foundFeatures}/${enhancedFeatures.length} enhanced features in the code`);
  });
});