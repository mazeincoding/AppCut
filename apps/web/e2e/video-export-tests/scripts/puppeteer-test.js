
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
    
    // Go to projects or editor
    await page.waitForSelector('button, a', { timeout: 10000 });
    
    // Look for "Start Creating" or similar button
    const startButton = await page.$('text=Start Creating') || 
                       await page.$('[href*="editor"]') ||
                       await page.$('button:contains("Create")');
    
    if (startButton) {
      await startButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    }
    
    console.log('✅ Reached editor interface');
    
    // The rest would need to be adapted based on actual UI structure
    console.log('⚠️  Manual interaction required from here');
    console.log('   1. Upload video: /home/zdhpe/veo3-video-generation/output/videos/generated_4a2ba290.mp4');
    console.log('   2. Add to timeline');
    console.log('   3. Start export');
    console.log('   4. Check console output above');
    
    // Keep browser open for manual testing
    console.log('🔍 Browser kept open for manual testing...');
    await page.waitForTimeout(300000); // 5 minutes
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testVideoExport().catch(console.error);
