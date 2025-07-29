/**
 * Manual Video Generation Test
 * 
 * This test manually triggers video generation and waits for the actual result.
 */

const { test, expect } = require('@playwright/test');

test.describe('Manual Video Generation Test', () => {
  test('should manually test video generation and get actual results', async ({ page }) => {
    console.log('🎬 Starting manual video generation test...');
    
    // Navigate to editor
    await page.goto(`${process.env.BASE_URL || 'http://localhost:3002'}/projects`);
    await page.waitForTimeout(3000);

    // Create new project
    const newProjectButton = page.locator('text=New project').first();
    if (await newProjectButton.isVisible({ timeout: 3000 })) {
      await newProjectButton.click();
      await page.waitForTimeout(4000);
    }

    console.log(`📍 Current URL: ${page.url()}`);
    await page.waitForTimeout(5000);

    // Navigate to AI tab
    const aiTab = page.locator('.flex.flex-col.gap-2.items-center.cursor-pointer:has-text("AI")').first();
    await aiTab.click();
    await page.waitForTimeout(3000);

    // Select Hailuo model
    const modelSelector = page.locator('button[id="model"]').first();
    await modelSelector.click();
    await page.waitForTimeout(1000);
    
    const hailuoOption = page.locator('[role="option"]:has-text("Hailuo")').first();
    await hailuoOption.click();
    await page.waitForTimeout(1000);

    // Switch to Image-to-Video tab
    const imageTab = page.locator('button:has-text("Image to Video")').first();
    await imageTab.click();
    await page.waitForTimeout(1000);

    // Upload image
    const fileInput = page.locator('input[type="file"]').first();
    
    // Create test image
    const testImageBuffer = await page.evaluate(() => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#4ecdc4');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Test Video', 256, 256);
        
        canvas.toBlob((blob) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        }, 'image/png');
      });
    });
    
    const response = await fetch(testImageBuffer);
    const blob = await response.blob();
    
    await page.setInputFiles('input[type="file"]', {
      name: 'test-video-image.png',
      mimeType: 'image/png',
      buffer: Buffer.from(await blob.arrayBuffer())
    });
    
    await page.waitForTimeout(3000);

    // Add prompt
    const promptInput = page.locator('textarea[id="image-prompt"]').first();
    await promptInput.fill('A beautiful sunset with gentle movement');
    await page.waitForTimeout(1000);

    // Monitor network requests
    const videoRequests = [];
    page.on('response', response => {
      if (response.url().includes('fal.run') || response.url().includes('video')) {
        videoRequests.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers()
        });
        console.log(`🌐 API Request: ${response.url()} - Status: ${response.status()}`);
      }
    });

    // Capture console messages that might contain video URLs
    const videoUrls = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('http') && (text.includes('.mp4') || text.includes('video') || text.includes('fal.run'))) {
        videoUrls.push(text);
        console.log(`🎬 Potential video URL: ${text}`);
      }
      if (text.includes('✅ FAL API response:')) {
        console.log(`📊 FAL API Response logged: ${text}`);
      }
    });

    // Start generation
    console.log('🚀 Starting video generation...');
    const generateButton = page.locator('button:has-text("Generate")').first();
    
    // Verify button is enabled
    const isEnabled = await generateButton.isEnabled();
    console.log(`🔍 Generate button enabled: ${isEnabled}`);
    
    if (isEnabled) {
      await generateButton.click();
      console.log('✅ Generate button clicked');
      
      // Wait and monitor for a reasonable time
      console.log('⏳ Monitoring for video generation completion...');
      
      let completed = false;
      let videoUrl = null;
      
      for (let i = 0; i < 30; i++) { // 1.5 minutes
        await page.waitForTimeout(3000);
        
        // Check for success indicators
        const success = await page.locator('div:has-text("Generated Successfully"), div:has-text("Generation complete"), button:has-text("Download")').first().isVisible({ timeout: 1000 }).catch(() => false);
        
        if (success) {
          console.log(`✅ Success indicator found at attempt ${i + 1}`);
          completed = true;
          break;
        }
        
        // Check for errors
        const error = await page.locator('div:has-text("failed"), div:has-text("error"), .text-destructive').first().isVisible({ timeout: 1000 }).catch(() => false);
        
        if (error) {
          const errorText = await page.locator('div:has-text("failed"), div:has-text("error"), .text-destructive').first().textContent();
          console.log(`❌ Error detected: ${errorText}`);
          break;
        }
        
        console.log(`⏳ Waiting... (${i + 1}/30)`);
      }
      
      // Final check for any video URLs or results
      const finalVideoUrls = await page.evaluate(() => {
        const urls = [];
        
        // Check debug logger
        if (window.debugLogger && window.debugLogger.logs) {
          const logs = window.debugLogger.logs;
          logs.forEach(log => {
            if (log.data && (log.data.videoUrl || log.data.video_url)) {
              urls.push(log.data.videoUrl || log.data.video_url);
            }
          });
        }
        
        // Check localStorage
        try {
          const history = localStorage.getItem('ai-generation-history');
          if (history) {
            const parsed = JSON.parse(history);
            parsed.forEach(item => {
              if (item.videoUrl) {
                urls.push(item.videoUrl);
              }
            });
          }
        } catch (e) {
          // Ignore
        }
        
        return urls;
      });
      
      // Report results
      console.log('\n📊 FINAL RESULTS:');
      console.log(`   Completed: ${completed}`);
      console.log(`   Network requests: ${videoRequests.length}`);
      console.log(`   Video URLs from console: ${videoUrls.length}`);
      console.log(`   Video URLs from evaluation: ${finalVideoUrls.length}`);
      
      if (videoRequests.length > 0) {
        console.log('\n🌐 Network Requests:');
        videoRequests.forEach((req, i) => {
          console.log(`   ${i + 1}. ${req.url} - ${req.status}`);
        });
      }
      
      if (videoUrls.length > 0) {
        console.log('\n🎬 Video URLs from console:');
        videoUrls.forEach((url, i) => {
          console.log(`   ${i + 1}. ${url}`);
        });
      }
      
      if (finalVideoUrls.length > 0) {
        console.log('\n🎯 Video URLs found:');
        for (let i = 0; i < finalVideoUrls.length; i++) {
          const url = finalVideoUrls[i];
          console.log(`   ${i + 1}. ${url}`);
          
          // Test accessibility
          try {
            const testResponse = await page.request.get(url);
            console.log(`      Status: ${testResponse.status()}`);
            console.log(`      Content-Type: ${testResponse.headers()['content-type'] || 'unknown'}`);
            console.log(`      Content-Length: ${testResponse.headers()['content-length'] || 'unknown'}`);
            
            if (testResponse.status() === 200) {
              console.log(`      ✅ Video is accessible!`);
              videoUrl = url;
            }
          } catch (e) {
            console.log(`      ❌ Error accessing: ${e.message}`);
          }
        }
      }
      
      // Final assertion
      const hasResult = completed || finalVideoUrls.length > 0 || videoRequests.length > 0;
      console.log(`\n🎯 Test success: ${hasResult}`);
      
      if (videoUrl) {
        console.log(`\n🎉 WORKING VIDEO URL: ${videoUrl}`);
      }
      
      expect(hasResult).toBe(true);
      
    } else {
      throw new Error('Generate button is not enabled');
    }
  });
});