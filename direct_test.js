// Direct test - navigate to specific project URL and test export dialog
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function directExportTest() {
  console.log('🚀 Starting direct export dialog test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate directly to the project URL
    const projectUrl = 'http://localhost:3000/editor/project/e41cb424-9e30-4a9b-87dc-0ac302c73bd4';
    console.log(`📱 Navigating directly to: ${projectUrl}`);
    
    await page.goto(projectUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for editor to load
    console.log('⏳ Waiting for editor to load...');
    await page.waitForTimeout(5000);
    
    // Take screenshot before export
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'editor_loaded.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot taken: editor_loaded.png');
    
    // Look for Export button with multiple selectors
    console.log('🔍 Looking for Export button...');
    const exportButton = page.locator('button:has-text("Export"), button:has-text("export"), [data-testid="export-button"], .export-button').first();
    
    // Wait a bit more for any dynamic content
    await page.waitForTimeout(2000);
    
    if (await exportButton.count() > 0) {
      console.log('✅ Found Export button, clicking...');
      await exportButton.click();
      
      // Wait for export dialog to appear
      await page.waitForTimeout(2000);
      
      // Take screenshot of export dialog
      await page.screenshot({ 
        path: path.join(__dirname, 'screenshots', 'export_dialog_with_spacing.png'),
        fullPage: true 
      });
      console.log('📸 Screenshot taken: export_dialog_with_spacing.png');
      
      // Look for the red spacer div we added
      const redSpacer = page.locator('div.bg-red-500').first();
      const redSpacerCount = await redSpacer.count();
      console.log(`🔴 Red spacer div count: ${redSpacerCount}`);
      
      // Look for Format and Quality sections
      const formatSection = page.locator('text="Format"').first();
      const qualitySection = page.locator('text="Quality"').first();
      
      console.log(`📝 Format section count: ${await formatSection.count()}`);
      console.log(`📝 Quality section count: ${await qualitySection.count()}`);
      
      if (await formatSection.count() > 0 && await qualitySection.count() > 0) {
        const formatBox = await formatSection.boundingBox();
        const qualityBox = await qualitySection.boundingBox();
        
        if (formatBox && qualityBox) {
          const spacing = qualityBox.y - (formatBox.y + formatBox.height);
          console.log(`📏 Measured spacing between Format and Quality: ${spacing}px`);
          
          // Save results
          const results = {
            timestamp: new Date().toISOString(),
            spacing_pixels: spacing,
            red_spacer_found: redSpacerCount > 0,
            format_position: formatBox,
            quality_position: qualityBox,
            test_passed: spacing > 30,
            export_dialog_opened: true
          };
          
          fs.writeFileSync(
            path.join(__dirname, 'direct_test_results.json'), 
            JSON.stringify(results, null, 2)
          );
          
          console.log('📝 Results saved to direct_test_results.json');
          console.log(`${results.test_passed ? '✅ TEST PASSED' : '❌ TEST FAILED'}: Spacing is ${spacing}px (red spacer: ${redSpacerCount > 0 ? 'YES' : 'NO'})`);
          
          // Take a focused screenshot of just the dialog
          const dialog = page.locator('[role="dialog"]').first();
          if (await dialog.count() > 0) {
            await dialog.screenshot({ 
              path: path.join(__dirname, 'screenshots', 'dialog_focused.png') 
            });
            console.log('📸 Focused dialog screenshot: dialog_focused.png');
          }
        }
      }
      
    } else {
      console.log('❌ Export button not found');
      await page.screenshot({ 
        path: path.join(__dirname, 'screenshots', 'no_export_button_direct.png'),
        fullPage: true 
      });
      console.log('📸 Debug screenshot: no_export_button_direct.png');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'error_direct_test.png'),
      fullPage: true 
    });
  } finally {
    console.log('🏁 Test completed. Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

directExportTest().catch(console.error);