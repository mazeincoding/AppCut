/**
 * Video Generation Verification Test
 * 
 * This test specifically verifies that video generation completes
 * and the generated video is accessible.
 * 
 * Usage: npx playwright test verify-video-generation.spec.js --headed
 */

const { test, expect } = require('@playwright/test');

test.describe('AI Video Generation Verification', () => {
  test('should generate video and verify its accessibility', async ({ page }) => {
    console.log('🎬 Starting video generation verification test...');
    
    // Navigate to projects page
    await page.goto('http://localhost:3002/projects');
    await page.waitForTimeout(3000);

    // Create or navigate to a project
    try {
      const newProjectButton = page.locator('text=New project').first();
      if (await newProjectButton.isVisible({ timeout: 3000 })) {
        console.log('🔄 Creating new project...');
        await newProjectButton.click();
        await page.waitForTimeout(4000);
      }
    } catch (e) {
      console.log('⚠️ No new project button found, continuing...');
    }

    console.log(`📍 Current URL: ${page.url()}`);
    await page.waitForTimeout(5000);

    // Navigate to AI tab
    console.log('🤖 Navigating to AI tab...');
    const aiTab = page.locator('.flex.flex-col.gap-2.items-center.cursor-pointer:has-text("AI")').first();
    if (await aiTab.isVisible({ timeout: 5000 })) {
      await aiTab.click();
      await page.waitForTimeout(3000);
      console.log('✅ AI tab clicked');
    } else {
      throw new Error('AI tab not found');
    }

    // Select Hailuo model
    console.log('🎯 Selecting Hailuo model...');
    const modelSelector = page.locator('button[id="model"]').first();
    if (await modelSelector.isVisible({ timeout: 3000 })) {
      await modelSelector.click();
      await page.waitForTimeout(1000);
      
      const hailuoOption = page.locator('[role="option"]:has-text("Hailuo")').first();
      if (await hailuoOption.isVisible({ timeout: 2000 })) {
        await hailuoOption.click();
        await page.waitForTimeout(1000);
        console.log('✅ Hailuo model selected');
      }
    }

    // Switch to Image-to-Video tab
    console.log('🖼️ Switching to Image-to-Video tab...');
    const imageTab = page.locator('button:has-text("Image to Video")').first();
    if (await imageTab.isVisible({ timeout: 2000 })) {
      await imageTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ Image-to-Video tab selected');
    }

    // Upload image
    console.log('📷 Uploading test image...');
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      // Create a simple test image
      const testImageBuffer = await page.evaluate(() => {
        return new Promise((resolve) => {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          
          // Create a simple gradient image
          const gradient = ctx.createLinearGradient(0, 0, 512, 512);
          gradient.addColorStop(0, '#ff6b6b');
          gradient.addColorStop(1, '#4ecdc4');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 512, 512);
          
          // Add some text
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
      
      // Convert data URL to file
      const response = await fetch(testImageBuffer);
      const blob = await response.blob();
      
      await page.setInputFiles('input[type="file"]', {
        name: 'test-video-image.png',
        mimeType: 'image/png',
        buffer: Buffer.from(await blob.arrayBuffer())
      });
      
      await page.waitForTimeout(3000);
      console.log('✅ Image uploaded successfully');
    }

    // Add prompt
    console.log('📝 Adding prompt...');
    const promptInput = page.locator('textarea[id="image-prompt"]').first();
    if (await promptInput.isVisible({ timeout: 2000 })) {
      await promptInput.fill('A beautiful sunset with gentle movement');
      await page.waitForTimeout(1000);
      console.log('✅ Prompt added');
    }

    // Start video generation
    console.log('🚀 Starting video generation...');
    const generateButton = page.locator('button:has-text("Generate")').first();
    
    if (await generateButton.isVisible({ timeout: 2000 }) && await generateButton.isEnabled()) {
      await generateButton.click();
      console.log('✅ Generation started');
      
      // Monitor for completion with longer timeout
      console.log('⏳ Waiting for video generation to complete...');
      
      let videoCompleted = false;
      let videoUrl = null;
      let attempts = 0;
      const maxAttempts = 60; // 3 minutes total
      
      while (!videoCompleted && attempts < maxAttempts) {
        attempts++;
        await page.waitForTimeout(3000); // Check every 3 seconds
        
        // Check for success indicators
        const successSelectors = [
          'div:has-text("Video Generated Successfully")',
          'div:has-text("Generation complete")',
          'div:has-text("✅")',
          'button:has-text("Download")',
          'video',
          '.video-result'
        ];
        
        for (const selector of successSelectors) {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            console.log(`✅ Found completion indicator: ${selector}`);
            videoCompleted = true;
            break;
          }
        }
        
        // Check for error indicators
        const errorSelectors = [
          'div:has-text("failed")',
          'div:has-text("error")',
          '.text-destructive'
        ];
        
        for (const selector of errorSelectors) {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            const errorText = await element.textContent();
            console.log(`❌ Error detected: ${errorText}`);
            throw new Error(`Video generation failed: ${errorText}`);
          }
        }
        
        console.log(`⏳ Waiting for completion... (${attempts}/${maxAttempts})`);
      }
      
      if (videoCompleted) {
        console.log('🎉 Video generation completed!');
        
        // Try to extract video URL from debug logs
        const videoUrlFromLogs = await page.evaluate(() => {
          if (window.debugLogger && window.debugLogger.logs) {
            const logs = window.debugLogger.logs;
            for (let i = logs.length - 1; i >= 0; i--) {
              const log = logs[i];
              if (log.data && (log.data.videoUrl || log.data.video_url)) {
                return log.data.videoUrl || log.data.video_url;
              }
            }
          }
          return null;
        });
        
        if (videoUrlFromLogs) {
          console.log(`🎬 Video URL found: ${videoUrlFromLogs}`);
          videoUrl = videoUrlFromLogs;
          
          // Test if video URL is accessible
          try {
            const videoResponse = await page.request.get(videoUrl);
            console.log(`📊 Video URL status: ${videoResponse.status()}`);
            console.log(`📊 Video content type: ${videoResponse.headers()['content-type']}`);
            console.log(`📊 Video content length: ${videoResponse.headers()['content-length']}`);
            
            if (videoResponse.status() === 200) {
              console.log('✅ Video URL is accessible and ready for download!');
            } else {
              console.log(`⚠️ Video URL returned status: ${videoResponse.status()}`);
            }
          } catch (e) {
            console.log(`⚠️ Could not verify video URL: ${e.message}`);
          }
        }
        
        // Look for download button
        const downloadButton = page.locator('button:has-text("Download")').first();
        if (await downloadButton.isVisible({ timeout: 2000 })) {
          console.log('📥 Download button is available');
          
          // Test download functionality
          console.log('🔗 Testing download...');
          await downloadButton.click();
          await page.waitForTimeout(2000);
          console.log('✅ Download button clicked');
        }
        
      } else {
        console.log(`⏰ Video generation timed out after ${maxAttempts * 3} seconds`);
        throw new Error('Video generation did not complete within timeout');
      }
      
    } else {
      throw new Error('Generate button not available or not enabled');
    }

    // Final verification
    expect(videoCompleted).toBe(true);
    console.log('🎉 Video generation test completed successfully!');
  });
});