#!/usr/bin/env node

/**
 * Video Export Test Script
 * Tests the OpenCut video export functionality with a specific video file
 */

const fs = require('fs');
const path = require('path');

// Configuration
const TEST_VIDEO_PATH = path.join(__dirname, '../input/generated_4a2ba290.mp4');
const OPENCUT_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '../output/test-outputs');

console.log('🎬 OpenCut Video Export Test Script');
console.log('=====================================');

// Check if test video exists
function checkTestVideo() {
  console.log('\n📹 Checking test video...');
  
  if (!fs.existsSync(TEST_VIDEO_PATH)) {
    console.error(`❌ Test video not found: ${TEST_VIDEO_PATH}`);
    process.exit(1);
  }
  
  const stats = fs.statSync(TEST_VIDEO_PATH);
  console.log(`✅ Test video found: ${path.basename(TEST_VIDEO_PATH)}`);
  console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Path: ${TEST_VIDEO_PATH}`);
}

// Create output directory
function createOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created output directory: ${OUTPUT_DIR}`);
  }
}

// Generate Playwright test
function generatePlaywrightTest() {
  const testScript = `
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('OpenCut Video Export', () => {
  test('should export video successfully', async ({ page }) => {
    console.log('🚀 Starting video export test...');
    
    // Navigate to OpenCut
    await page.goto('${OPENCUT_URL}');
    await page.waitForLoadState('networkidle');
    
    // Go to editor
    await page.click('text=Start Creating');
    await page.waitForLoadState('networkidle');
    
    // Upload test video
    console.log('📹 Uploading test video...');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('${TEST_VIDEO_PATH}');
    
    // Wait for video to load
    await page.waitForTimeout(3000);
    
    // Add video to timeline
    const videoElement = page.locator('[data-testid="media-item"]').first();
    await videoElement.dragTo(page.locator('[data-testid="timeline"]'));
    
    // Wait for timeline update
    await page.waitForTimeout(1000);
    
    // Open export dialog
    console.log('📤 Opening export dialog...');
    await page.click('text=Export');
    await page.waitForSelector('[data-testid="export-dialog"]');
    
    // Configure export settings
    await page.selectOption('select[name="format"]', 'mp4');
    await page.selectOption('select[name="quality"]', '720p');
    
    // Start export
    console.log('🎬 Starting export...');
    const exportButton = page.locator('button:has-text("Start Export")');
    await exportButton.click();
    
    // Monitor export progress
    let exportComplete = false;
    let timeout = 0;
    const maxTimeout = 120000; // 2 minutes
    
    while (!exportComplete && timeout < maxTimeout) {
      try {
        // Check if export is complete
        const successMessage = page.locator('text=Export complete');
        if (await successMessage.isVisible()) {
          exportComplete = true;
          console.log('✅ Export completed successfully!');
          break;
        }
        
        // Check progress
        const progressElement = page.locator('[data-testid="export-progress"]');
        if (await progressElement.isVisible()) {
          const progressText = await progressElement.textContent();
          console.log(\`📊 Export progress: \${progressText}\`);
        }
        
        await page.waitForTimeout(1000);
        timeout += 1000;
      } catch (error) {
        console.log('⏳ Waiting for export...');
        await page.waitForTimeout(1000);
        timeout += 1000;
      }
    }
    
    if (!exportComplete) {
      throw new Error('Export timed out after 2 minutes');
    }
    
    // Download exported video
    console.log('💾 Downloading exported video...');
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download")');
    const download = await downloadPromise;
    
    const downloadPath = path.join('${OUTPUT_DIR}', \`exported-\${Date.now()}.mp4\`);
    await download.saveAs(downloadPath);
    
    console.log(\`✅ Video exported and saved to: \${downloadPath}\`);
    
    // Verify file exists and has content
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(1000); // At least 1KB
    
    console.log(\`📁 Export file size: \${(stats.size / 1024 / 1024).toFixed(2)} MB\`);
  });
  
  test('should handle export errors gracefully', async ({ page }) => {
    console.log('🧪 Testing error handling...');
    
    await page.goto('${OPENCUT_URL}');
    await page.waitForLoadState('networkidle');
    
    // Try to export without any media
    await page.click('text=Export');
    
    // Should show error message
    const errorMessage = page.locator('text=No media to export');
    await expect(errorMessage).toBeVisible();
  });
});
`;

  const specPath = path.join(__dirname, 'generated-test-video-export.spec.js');
  fs.writeFileSync(specPath, testScript);
  console.log('✅ Generated Playwright test: generated-test-video-export.spec.js');
}

// Generate manual test instructions
function generateManualTest() {
  const instructions = `
# Manual Video Export Test Instructions

## Prerequisites
- OpenCut running at ${OPENCUT_URL}
- Test video: ${TEST_VIDEO_PATH}

## Test Steps

### 1. Basic Export Test
1. Open ${OPENCUT_URL} in Chrome
2. Click "Start Creating" or go to editor
3. Upload the test video: ${TEST_VIDEO_PATH}
4. Drag video to timeline
5. Click "Export" button
6. Select format: MP4, quality: 720p
7. Click "Start Export"
8. Monitor console logs for:
   - ✅ Video preloading messages
   - 🎬 Frame rendering progress
   - ✅ Export completion

### 2. Expected Console Output
Look for these log patterns:
\`\`\`
📹 Starting video preload process...
📹 Found 1 unique video(s) to preload
✅ Video fully preloaded: generated_4a2ba290.mp4, readyState: 4
🎬 Using preloaded video {readyState: 1, duration: X.XX}
🎯 Seeking video to X.XXs, readyState: 1
✅ Video seeked to X.XXs, actualTime: X.XXs, diff: 0.XXXs
✅ Preloaded video drawn to canvas at X.XXs
✅ Export completed successfully!
\`\`\`

### 3. Success Criteria
- [ ] Video uploads successfully
- [ ] Timeline shows video element
- [ ] Export dialog opens
- [ ] Export progress shows frame rendering
- [ ] Console shows video frame drawing (not placeholders)
- [ ] Export completes without errors
- [ ] Downloaded video plays correctly
- [ ] Video shows actual content (not gray frames)

### 4. Debugging Failed Frames
If you see placeholder rectangles:
- Check for "📦 Drew placeholder rectangle" in console
- Look for video readyState issues
- Verify seeking accuracy logs
- Check for timing differences > 0.1s

### 5. Performance Test
- Monitor export speed (should be near real-time)
- Check memory usage during export
- Verify no memory leaks after export

## Test Video Info
- Path: ${TEST_VIDEO_PATH}
- Expected to be MP4 format
- Should contain actual video content for frame testing
`;

  const manualPath = path.join(__dirname, 'generated-MANUAL_TEST_INSTRUCTIONS.md');
  fs.writeFileSync(manualPath, instructions);
  console.log('✅ Generated manual test instructions: generated-MANUAL_TEST_INSTRUCTIONS.md');
}

// Generate browser automation test
function generatePuppeteerTest() {
  const puppeteerScript = `
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
    await page.goto('${OPENCUT_URL}', { waitUntil: 'networkidle0' });
    
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
    console.log('   1. Upload video: ${TEST_VIDEO_PATH}');
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
`;

  const puppeteerPath = path.join(__dirname, 'generated-puppeteer-test.js');
  fs.writeFileSync(puppeteerPath, puppeteerScript);
  console.log('✅ Generated Puppeteer test: generated-puppeteer-test.js');
}

// Main execution
function main() {
  checkTestVideo();
  createOutputDir();
  generatePlaywrightTest();
  generateManualTest();
  generatePuppeteerTest();
  
  console.log('\n🎯 Test files generated successfully!');
  console.log('\n📋 Available test options:');
  console.log('   1. Manual testing: Follow MANUAL_TEST_INSTRUCTIONS.md');
  console.log('   2. Playwright E2E: npx playwright test test-video-export.spec.js');
  console.log('   3. Puppeteer automation: node puppeteer-test.js');
  console.log('\n💡 Recommended: Start with manual testing to verify functionality');
  console.log('   Then use automation for regression testing');
}

if (require.main === module) {
  main();
}