const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testVideoExport() {
  console.log('🚀 Starting Puppeteer video export test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for headless mode
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  const page = await browser.newPage();
  
  try {
    // Enable console logging
    page.on('console', (msg) => {
      if (msg.text().includes('export-engine') || 
          msg.text().includes('📹') || 
          msg.text().includes('🎬') || 
          msg.text().includes('✅')) {
        console.log('CONSOLE:', msg.text());
      }
    });
    
    // Navigate to OpenCut
    console.log('🌐 Navigating to OpenCut...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Wait for page to load
    await page.waitForSelector('body', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try direct navigation to editor
    console.log('🎯 Navigating directly to editor...');
    try {
      await page.goto('http://localhost:3000/editor/project/test-project', { waitUntil: 'networkidle0' });
      console.log('✅ Reached editor interface');
    } catch (navError) {
      console.log('⚠️  Direct navigation failed, trying projects page...');
      await page.goto('http://localhost:3000/projects', { waitUntil: 'networkidle0' });
    }
    
    // Wait for editor to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Basic automation attempts
    console.log('🎬 Attempting basic automation...');
    
    try {
      // Look for file input
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        console.log('📁 Found file input, uploading test video...');
        const videoPath = path.join(__dirname, '../input/generated_4a2ba290.mp4');
        
        // Check if file exists
        if (fs.existsSync(videoPath)) {
          await fileInput.uploadFile(videoPath);
          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('✅ Video upload attempted');
        } else {
          console.log('❌ Test video file not found:', videoPath);
        }
      } else {
        console.log('⚠️  No file input found - manual upload required');
      }
      
      // Look for export button
      await new Promise(resolve => setTimeout(resolve, 2000));
      const exportButtons = await page.$$('button');
      let exportFound = false;
      
      for (const button of exportButtons) {
        try {
          const text = await page.evaluate(el => el.textContent || '', button);
          if (text.toLowerCase().includes('export')) {
            console.log('🎯 Found export button:', text.trim());
            await button.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log('✅ Export button clicked');
            exportFound = true;
            break;
          }
        } catch (e) {
          // Skip buttons that can't be evaluated
        }
      }
      
      if (!exportFound) {
        console.log('⚠️  Export button not found - manual export required');
      }
      
    } catch (automationError) {
      console.log('⚠️  Automation error:', automationError.message);
    }
    
    // Provide manual instructions
    console.log('\n📋 Manual testing instructions:');
    console.log('   1. Upload video:', path.join(__dirname, '../input/generated_4a2ba290.mp4'));
    console.log('   2. Add video to timeline');
    console.log('   3. Click Export button');
    console.log('   4. Start export process');
    console.log('   5. Monitor console output above for success indicators');
    console.log('');
    console.log('🔍 Success indicators in console:');
    console.log('   ✅ Video preloaded messages');
    console.log('   🎬 Using preloaded video');
    console.log('   🎯 Video seeking messages');
    console.log('   ✅ Preloaded video drawn to canvas');
    console.log('   ✅ Export completed successfully!');
    console.log('');
    console.log('❌ Failure indicators:');
    console.log('   📦 Drew placeholder rectangle');
    console.log('   Video not preloaded or ready');
    console.log('   Export errors or timeouts');
    
    // Keep browser open for manual testing
    console.log('\n🔍 Browser kept open for manual testing (30 seconds)...');
    console.log('   Browser will close automatically or press Ctrl+C to exit early');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('🏁 Closing browser...');
    await browser.close();
  }
}

// Run the test
testVideoExport().catch(console.error);