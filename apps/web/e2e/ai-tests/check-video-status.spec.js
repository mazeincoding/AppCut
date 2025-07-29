/**
 * Check Video Generation Status
 * 
 * This test checks if there are any generated videos in the system
 * and verifies their accessibility.
 */

const { test, expect } = require('@playwright/test');

// Configuration
const TEST_CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3002',
  projectId: process.env.TEST_PROJECT_ID || 'test-project',
  timeout: 60000
};

test.describe('Video Status Check', () => {
  test('should check for existing generated videos', async ({ page }) => {
    console.log('🔍 Checking for existing generated videos...');
    
    // Navigate directly to a project that might have videos
    const testProjectUrl = `${TEST_CONFIG.baseUrl}/editor/project/${TEST_CONFIG.projectId}`;
    await page.goto(testProjectUrl, { timeout: TEST_CONFIG.timeout });
    await page.waitForTimeout(5000);

    console.log(`📍 Current URL: ${page.url()}`);

    // Check debug logger for video generation history
    const videoHistory = await page.evaluate(() => {
      if (window.debugLogger && window.debugLogger.logs) {
        const logs = window.debugLogger.logs;
        const videoLogs = logs.filter(log => 
          log.event.includes('VIDEO') || 
          log.event.includes('GENERATION') ||
          (log.data && (log.data.videoUrl || log.data.video_url))
        );
        return videoLogs;
      }
      return [];
    });

    console.log(`📊 Found ${videoHistory.length} video-related log entries`);
    
    if (videoHistory.length > 0) {
      console.log('🎬 Video generation logs found:');
      videoHistory.forEach((log, i) => {
        console.log(`  ${i + 1}. ${log.event}: ${JSON.stringify(log.data)}`);
      });
    }

    // Check localStorage for AI generation history
    const aiHistory = await page.evaluate(() => {
      const savedHistory = localStorage.getItem('ai-generation-history');
      if (savedHistory) {
        try {
          return JSON.parse(savedHistory);
        } catch (e) {
          return null;
        }
      }
      return null;
    });

    if (aiHistory && aiHistory.length > 0) {
      console.log(`📚 Found ${aiHistory.length} videos in AI generation history:`);
      
      for (let i = 0; i < aiHistory.length; i++) {
        const video = aiHistory[i];
        console.log(`\n🎬 Video ${i + 1}:`);
        console.log(`   📝 Prompt: ${video.prompt}`);
        console.log(`   🤖 Model: ${video.model}`);
        console.log(`   🔗 URL: ${video.videoUrl}`);
        console.log(`   📊 Job ID: ${video.jobId}`);
        
        // Test if video URL is accessible
        if (video.videoUrl) {
          try {
            console.log(`   🔍 Testing video accessibility...`);
            const response = await page.request.get(video.videoUrl);
            console.log(`   ✅ Status: ${response.status()}`);
            console.log(`   📄 Content-Type: ${response.headers()['content-type'] || 'unknown'}`);
            console.log(`   📏 Content-Length: ${response.headers()['content-length'] || 'unknown'}`);
            
            if (response.status() === 200) {
              console.log(`   🎉 Video ${i + 1} is accessible and ready!`);
              
              // Get a small sample of the video data to verify it's a real video
              const buffer = await response.body();
              console.log(`   📦 Video file size: ${buffer.length} bytes`);
              
              if (buffer.length > 1000) { // Reasonable minimum for a video file
                console.log(`   ✅ Video file appears to be valid (size > 1KB)`);
              }
            } else {
              console.log(`   ❌ Video ${i + 1} is not accessible (status: ${response.status()})`);
            }
          } catch (e) {
            console.log(`   ❌ Error accessing video ${i + 1}: ${e.message}`);
          }
        }
      }
    } else {
      console.log('📭 No videos found in AI generation history');
    }

    // Navigate to AI tab if possible to check current state
    console.log('\n🤖 Attempting to navigate to AI tab...');
    
    // Wait a bit more for page to fully load
    await page.waitForTimeout(3000);
    
    // Look for AI tab with multiple strategies
    const aiTabSelectors = [
      '.flex.flex-col.gap-2.items-center.cursor-pointer:has-text("AI")',
      'div:has-text("AI")',
      'button:has-text("AI")',
      '[data-tab="ai"]'
    ];
    
    let aiTabFound = false;
    for (const selector of aiTabSelectors) {
      const aiTab = page.locator(selector).first();
      if (await aiTab.isVisible({ timeout: 2000 })) {
        console.log(`✅ AI tab found with selector: ${selector}`);
        await aiTab.click();
        await page.waitForTimeout(2000);
        aiTabFound = true;
        break;
      }
    }
    
    if (aiTabFound) {
      console.log('🎯 AI tab clicked, checking for generated videos in UI...');
      
      // Look for video success indicators
      const successElements = await page.locator('div:has-text("Generated Successfully"), div:has-text("Generation complete"), button:has-text("Download")').count();
      if (successElements > 0) {
        console.log(`✅ Found ${successElements} video success indicators in UI`);
      }
      
      // Look for video elements
      const videoElements = await page.locator('video, .video-result, [data-testid="generated-video"]').count();
      if (videoElements > 0) {
        console.log(`🎬 Found ${videoElements} video elements in UI`);
      }
    } else {
      console.log('⚠️ Could not find AI tab');
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Video logs: ${videoHistory.length}`);
    console.log(`   AI history: ${aiHistory ? aiHistory.length : 0}`);
    console.log(`   AI tab accessible: ${aiTabFound}`);
    
    // Test passes if we found any evidence of video generation
    const hasVideos = (aiHistory && aiHistory.length > 0) || videoHistory.length > 0;
    console.log(`   Has videos: ${hasVideos}`);
    
    expect(hasVideos).toBe(true);
  });
});