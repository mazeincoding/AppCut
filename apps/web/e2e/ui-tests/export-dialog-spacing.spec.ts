import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Export Dialog Spacing', () => {
  test.beforeEach(async () => {
    // Create screenshots directory if it doesn't exist
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('should have proper spacing between Format and Quality sections', async ({ page, baseURL }) => {
    console.log('🚀 Starting export dialog spacing test...');
    
    // Navigate to the projects page first
    await page.goto(`${baseURL}/projects`);
    await page.waitForLoadState('networkidle');
    
    // Create or navigate to a project
    const createProjectButton = page.getByRole('button', { name: /create.*project/i }).first();
    if (await createProjectButton.isVisible()) {
      await createProjectButton.click();
      await page.waitForLoadState('networkidle');
    } else {
      // Try to click on an existing project
      const projectLink = page.locator('a[href*="/editor/project"]').first();
      if (await projectLink.isVisible()) {
        await projectLink.click();
        await page.waitForLoadState('networkidle');
      } else {
        // Navigate directly to editor with a test project
        await page.goto(`${baseURL}/editor/project/test-project`);
        await page.waitForLoadState('networkidle');
      }
    }
    
    // Wait for editor to load and find the main video export button in header (not the "Export All" media button)
    await page.waitForSelector('nav button:has-text("Export")', { timeout: 10000 });
    await page.click('nav button:has-text("Export")');
    
    // Wait for export dialog to be visible by waiting for filename input (same as other tests)
    await page.waitForSelector('#filename', { timeout: 10000 });
    
    console.log('📸 Taking screenshot of export dialog...');
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'export-dialog-spacing.png'),
      fullPage: true 
    });
    
    // Look for export dialog elements
    const formatSection = page.locator('text="Format"').first();
    const qualitySection = page.locator('text="Quality"').first();
    const spacerDiv = page.locator('div.h-12').first();
    
    // Check if elements exist
    await expect(formatSection).toBeVisible();
    await expect(qualitySection).toBeVisible();
    
    console.log(`Format section count: ${await formatSection.count()}`);
    console.log(`Quality section count: ${await qualitySection.count()}`);
    console.log(`Spacer div count: ${await spacerDiv.count()}`);
    
    // Get bounding boxes
    const formatBox = await formatSection.boundingBox();
    const qualityBox = await qualitySection.boundingBox();
    
    expect(formatBox).not.toBeNull();
    expect(qualityBox).not.toBeNull();
    
    if (formatBox && qualityBox) {
      const spacing = qualityBox.y - (formatBox.y + formatBox.height);
      console.log(`📏 Spacing between Format and Quality: ${spacing}px`);
      
      const results = {
        timestamp: new Date().toISOString(),
        spacing_pixels: spacing,
        spacer_div_found: await spacerDiv.count() > 0,
        test_passed: spacing > 30
      };
      
      // Create results directory if it doesn't exist
      const resultsDir = path.join(__dirname, 'results');
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(resultsDir, 'spacing_test_results.json'), 
        JSON.stringify(results, null, 2)
      );
      
      console.log('📝 Results saved to results/spacing_test_results.json');
      console.log(`✅ Test ${results.test_passed ? 'PASSED' : 'FAILED'}: Spacing is ${spacing}px`);
      
      // Assert that spacing is adequate (at least 30px)
      expect(spacing).toBeGreaterThan(30);
    }
  });
});