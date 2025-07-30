const { test, expect } = require('@playwright/test');

test.describe('OpenCut Video Export - Simple', () => {
  test('should show export dialog', async ({ page }) => {
    console.log('🚀 Starting simple export dialog test...');
    
    // Navigate to editor
    await page.goto('http://localhost:3000/editor/project/test');
    await page.waitForLoadState('networkidle');
    
    // Open export dialog
    console.log('📤 Opening export dialog...');
    
    // Handle nextjs-portal overlay
    await page.addStyleTag({
      content: 'nextjs-portal { display: none !important; }'
    });
    
    const exportBtn = page.locator('nav button:has-text("Export")');
    await exportBtn.click({ force: true });
    
    // Wait for dialog
    await page.waitForSelector('#filename', { timeout: 10000 });
    
    console.log('✅ Export dialog opened successfully');
    
    // Check if export button in dialog exists
    const dialogButtons = await page.locator('button:has-text("Export Video")').count();
    console.log(`📊 Found ${dialogButtons} export button(s) in dialog`);
    
    expect(dialogButtons).toBeGreaterThan(0);
  });
});