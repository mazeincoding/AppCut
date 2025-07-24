// Simple test to check export dialog spacing
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testExportSpacing() {
  console.log('🚀 Starting simple export dialog spacing test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  try {
    // First, let's just manually test the export dialog by using browser automation
    console.log('📱 Opening browser manually - please navigate to editor and export dialog manually');
    console.log('⏳ Waiting 30 seconds for manual navigation...');
    
    // Give time to manually navigate
    await page.waitForTimeout(30000);
    
    console.log('📸 Taking screenshot of current page...');
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'manual_navigation.png'),
      fullPage: true 
    });
    
    // Look for export dialog elements
    const formatSection = page.locator('text="Format"').first();
    const qualitySection = page.locator('text="Quality"').first();
    const spacerDiv = page.locator('div.h-12').first();
    
    console.log(`Format section count: ${await formatSection.count()}`);
    console.log(`Quality section count: ${await qualitySection.count()}`);
    console.log(`Spacer div count: ${await spacerDiv.count()}`);
    
    if (await formatSection.count() > 0 && await qualitySection.count() > 0) {
      const formatBox = await formatSection.boundingBox();
      const qualityBox = await qualitySection.boundingBox();
      
      if (formatBox && qualityBox) {
        const spacing = qualityBox.y - (formatBox.y + formatBox.height);
        console.log(`📏 Spacing between Format and Quality: ${spacing}px`);
        
        const results = {
          timestamp: new Date().toISOString(),
          spacing_pixels: spacing,
          spacer_div_found: await spacerDiv.count() > 0,
          test_passed: spacing > 30
        };
        
        fs.writeFileSync(
          path.join(__dirname, 'spacing_test_results.json'), 
          JSON.stringify(results, null, 2)
        );
        
        console.log('📝 Results saved to spacing_test_results.json');
        console.log(`✅ Test ${results.test_passed ? 'PASSED' : 'FAILED'}: Spacing is ${spacing}px`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    console.log('🏁 Test completed. Press any key to close browser...');
    // Keep browser open for manual inspection
    await page.waitForTimeout(60000);
    await browser.close();
  }
}

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

testExportSpacing().catch(console.error);