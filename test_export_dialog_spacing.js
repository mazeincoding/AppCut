// Playwright test script to capture export dialog spacing
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testExportDialogSpacing() {
  console.log('🚀 Starting export dialog spacing test...');
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false, // Set to true for headless mode
    slowMo: 1000 // Slow down actions for better visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Try different ports that might be running
    const ports = [3002, 3003, 3000];
    let appUrl = null;
    
    for (const port of ports) {
      try {
        console.log(`📱 Trying to connect to http://localhost:${port}...`);
        await page.goto(`http://localhost:${port}`, { waitUntil: 'domcontentloaded', timeout: 5000 });
        appUrl = `http://localhost:${port}`;
        console.log(`✅ Successfully connected to ${appUrl}`);
        break;
      } catch (error) {
        console.log(`❌ Port ${port} not available`);
        continue;
      }
    }
    
    if (!appUrl) {
      throw new Error('Could not connect to any development server on ports 3000, 3002, or 3003');
    }
    
    // Wait a bit for app to fully load
    await page.waitForTimeout(3000);
    
    // Look for "Try early beta" button or "Projects" link in header
    console.log('🔍 Looking for entry point to editor...');
    
    const tryBetaButton = page.locator('button:has-text("Try early beta"), a:has-text("Try early beta")').first();
    const projectsLink = page.locator('a:has-text("Projects")').first();
    
    if (await tryBetaButton.count() > 0) {
      console.log('✅ Found "Try early beta" button, clicking...');
      await tryBetaButton.click();
      await page.waitForTimeout(4000);
    } else if (await projectsLink.count() > 0) {
      console.log('✅ Found "Projects" link, clicking...');
      await projectsLink.click();
      await page.waitForTimeout(3000);
      
      // Now look for "New project" button
      const newProjectButton = page.locator('button:has-text("New project")').first();
      if (await newProjectButton.count() > 0) {
        console.log('✅ Found "New project" button, clicking...');
        await newProjectButton.click();
        await page.waitForTimeout(4000);
      }
    } else {
      console.log('❌ Could not find entry point, taking screenshot...');
      await page.screenshot({ 
        path: path.join(__dirname, 'screenshots', 'debug_no_entry.png'),
        fullPage: true 
      });
    }
    
    // Wait for editor to load
    console.log('⏳ Waiting for editor to load...');
    await page.waitForTimeout(3000);
    
    // Check if we're still on projects page and need to create a project
    const newProjectButtonMain = page.locator('button:has-text("New project")').first();
    if (await newProjectButtonMain.count() > 0) {
      console.log('✅ Found "New project" button on main page, clicking...');
      await newProjectButtonMain.click();
      await page.waitForTimeout(5000);
    }
    
    // Look for project card to click and enter editor - try multiple approaches
    let projectCard = page.locator('div:has-text("New Project")').first();
    if (await projectCard.count() === 0) {
      projectCard = page.locator('[data-testid="project-card"]').first();
    }
    if (await projectCard.count() === 0) {
      // Try clicking anywhere in the project area
      projectCard = page.locator('text="New Project"').first();
    }
    
    if (await projectCard.count() > 0) {
      console.log('✅ Found project card, clicking to enter editor...');
      await projectCard.click();
      await page.waitForTimeout(5000); // Wait for editor to load
    } else {
      console.log('❌ Could not find project card to click');
    }
    
    // Look for Export button
    console.log('🔍 Looking for Export button...');
    const exportButton = page.locator('button:has-text("Export"), [data-testid="export-button"], .export-button, button:has-text("export")').first();
    
    // Take screenshot before clicking export
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'before_export_dialog.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot taken: before_export_dialog.png');
    
    if (await exportButton.count() > 0) {
      console.log('✅ Found Export button, clicking...');
      await exportButton.click();
      
      // Wait for export dialog to appear
      await page.waitForTimeout(1500);
      
      // Look for the export dialog
      const exportDialog = page.locator('[role="dialog"], .dialog, .modal').first();
      
      if (await exportDialog.count() > 0) {
        console.log('✅ Export dialog opened successfully!');
        
        // Take screenshot of the export dialog
        await page.screenshot({ 
          path: path.join(__dirname, 'screenshots', 'export_dialog_spacing.png'),
          fullPage: true 
        });
        console.log('📸 Screenshot taken: export_dialog_spacing.png');
        
        // Take a more focused screenshot of just the dialog
        await exportDialog.screenshot({ 
          path: path.join(__dirname, 'screenshots', 'export_dialog_focused.png') 
        });
        console.log('📸 Focused screenshot taken: export_dialog_focused.png');
        
        // Check for Format section
        const formatSection = page.locator('text="Format"').first();
        const qualitySection = page.locator('text="Quality"').first();
        
        if (await formatSection.count() > 0 && await qualitySection.count() > 0) {
          console.log('✅ Found both Format and Quality sections');
          
          // Get bounding boxes to measure spacing
          const formatBox = await formatSection.boundingBox();
          const qualityBox = await qualitySection.boundingBox();
          
          if (formatBox && qualityBox) {
            const spacing = qualityBox.y - (formatBox.y + formatBox.height);
            console.log(`📏 Spacing between Format and Quality: ${spacing}px`);
            
            // Log results to file
            const results = {
              timestamp: new Date().toISOString(),
              spacing_pixels: spacing,
              format_position: formatBox,
              quality_position: qualityBox,
              test_passed: spacing > 30 // Consider test passed if spacing > 30px
            };
            
            fs.writeFileSync(
              path.join(__dirname, 'test_results.json'), 
              JSON.stringify(results, null, 2)
            );
            console.log('📝 Test results saved to test_results.json');
          }
        } else {
          console.log('❌ Could not find Format and/or Quality sections');
        }
        
        // Inspect DOM structure around spacing
        const spacerDiv = page.locator('div.h-12').first();
        if (await spacerDiv.count() > 0) {
          console.log('✅ Found spacer div with h-12 class');
          const spacerBox = await spacerDiv.boundingBox();
          console.log('📐 Spacer div dimensions:', spacerBox);
        } else {
          console.log('❌ Spacer div with h-12 class not found');
        }
        
      } else {
        console.log('❌ Export dialog not found after clicking Export button');
        await page.screenshot({ 
          path: path.join(__dirname, 'screenshots', 'no_dialog_found.png'),
          fullPage: true 
        });
      }
    } else {
      console.log('❌ Export button not found');
      await page.screenshot({ 
        path: path.join(__dirname, 'screenshots', 'no_export_button.png'),
        fullPage: true 
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    await page.screenshot({ 
      path: path.join(__dirname, 'screenshots', 'error_screenshot.png'),
      fullPage: true 
    });
  } finally {
    console.log('🏁 Test completed. Closing browser...');
    await browser.close();
  }
}

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Run the test
testExportDialogSpacing().catch(console.error);