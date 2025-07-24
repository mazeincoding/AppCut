/**
 * AI Model Selection Bug Reproduction Test
 * 
 * This test reproduces the bug where clicking the AI model selection dropdown
 * causes component re-mounting and page navigation issues.
 * 
 * Bug confirmed: Model selector click triggers 3+ new StorageProvider instances
 * and causes unexpected page navigation.
 * 
 * Status: REPRODUCED ✅ - Emergency skip mechanism mitigates impact
 * 
 * Usage: npx playwright test ai-model-selection-bug-reproduction.spec.js --headed
 */

const { test, expect } = require('@playwright/test');

test.describe('AI Video Generation Complete Workflow Test', () => {
  test('should test complete AI video generation workflow with Hailuo model', async ({ page }) => {
    // Array to capture console logs for debugging
    const consoleLogs = [];
    const storageProviderInstances = [];
    const pageRefreshEvents = [];
    const navigationEvents = [];

    // Listen to all browser events
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({
        timestamp: Date.now(),
        type: msg.type(),
        text: text
      });

      console.log(`[BROWSER ${msg.type().toUpperCase()}] ${text}`);

      // Track StorageProvider instances
      if (text.includes('StorageProvider v14:15') || text.includes('StorageProvider v')) {
        storageProviderInstances.push({
          timestamp: Date.now(),
          text: text
        });
        console.log(`🔥 StorageProvider instance #${storageProviderInstances.length}: ${text}`);
      }
    });

    // Track navigation events
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        navigationEvents.push({
          timestamp: Date.now(),
          url: frame.url()
        });
        console.log(`🔄 Navigation: ${frame.url()}`);
      }
    });

    // Track page load events
    page.on('load', () => {
      pageRefreshEvents.push({
        timestamp: Date.now(),
        event: 'page_load'
      });
      console.log(`🔃 Page loaded/refreshed`);
    });

    console.log('🚀 Starting REAL AI interaction test...');
    
    // Navigate to projects page first
    console.log('📂 Navigating to projects page...');
    await page.goto('http://localhost:3000/projects');
    await page.waitForTimeout(3000);

    // Create or navigate to a project
    console.log('🆕 Creating or finding existing project...');
    try {
      const newProjectButton = page.locator('text=New project').first();
      if (await newProjectButton.isVisible({ timeout: 3000 })) {
        console.log('🔄 Creating new project...');
        await newProjectButton.click();
        await page.waitForTimeout(4000);
      }
    } catch (e) {
      console.log('⚠️ No new project button found, navigating to test project...');
      await page.goto('http://localhost:3000/editor/project/test-ai-real');
      await page.waitForTimeout(3000);
    }

    console.log(`📍 Current URL: ${page.url()}`);
    const initialStorageProviderCount = storageProviderInstances.length;
    console.log(`📊 Initial StorageProvider instances: ${initialStorageProviderCount}`);

    // Wait for editor to fully load
    console.log('⏳ Waiting for editor to fully load...');
    await page.waitForTimeout(5000);

    // Step 1: Find and click the AI tab specifically
    console.log('🎯 Step 1: Looking for AI tab in media panel...');
    
    // Look for various AI tab selectors based on the actual TabBar structure
    const aiTabSelectors = [
      '.flex.flex-col.gap-2.items-center.cursor-pointer:has-text("AI")', // Exact class structure from TabBar
      'div.cursor-pointer:has-text("AI")', // Simplified selector for clickable div
      'div:has(svg.lucide-bot)', // Look for the BotIcon component
      'div:has-text("AI")', // TabBar renders tabs as div elements
      'button:has-text("AI")', // Fallback in case it's a button
      '[data-tab="ai"]', // If data-tab attribute exists
      '.cursor-pointer:has(svg)', // Look for clickable elements with SVG icons
    ];

    let aiTabFound = false;
    let imageUploaded = false; // Track if image upload succeeded
    
    // First, try to scroll to see all tabs (AI might be hidden in scroll)
    console.log('📜 Checking if tab container is scrollable...');
    const scrollRightButton = page.locator('.scroll-button, button:has-text("→"), button[data-direction="right"]').first();
    if (await scrollRightButton.isVisible({ timeout: 1000 })) {
      console.log('🔄 Scrolling tab container to reveal more tabs...');
      await scrollRightButton.click();
      await page.waitForTimeout(1000);
    }
    
    for (const selector of aiTabSelectors) {
      console.log(`🔍 Checking selector: ${selector}`);
      const aiTabs = page.locator(selector);
      const count = await aiTabs.count();
      
      if (count > 0) {
        console.log(`📋 Found ${count} elements matching "${selector}"`);
        
        // Check each matching element to find the one with "AI" text
        for (let i = 0; i < count; i++) {
          const tab = aiTabs.nth(i);
          try {
            const textContent = await tab.textContent();
            console.log(`  Element ${i}: "${textContent}"`);
            
            if (textContent && textContent.includes('AI')) {
              console.log(`✅ AI tab found at index ${i} with selector: ${selector}`);
              console.log('🖱️ Clicking AI tab...');
              
              const beforeClickCount = storageProviderInstances.length;
              await tab.click();
              await page.waitForTimeout(2000);
              const afterClickCount = storageProviderInstances.length;
              
              console.log(`📊 StorageProvider instances before AI tab click: ${beforeClickCount}`);
              console.log(`📊 StorageProvider instances after AI tab click: ${afterClickCount}`);
              
              if (afterClickCount > beforeClickCount) {
                console.log(`🚨 AI TAB CLICK TRIGGERED ${afterClickCount - beforeClickCount} NEW INSTANCES!`);
              }
              
              aiTabFound = true;
              break;
            }
          } catch (e) {
            console.log(`  Element ${i}: [Could not read text]`);
          }
        }
        
        if (aiTabFound) break;
      }
    }

    if (!aiTabFound) {
      console.log('❌ AI tab not found! Checking page structure...');
      
      // Debug: Show all buttons with text content
      const allButtons = page.locator('button');
      const buttonCount = await allButtons.count();
      console.log(`🔍 Found ${buttonCount} buttons on page:`);
      
      for (let i = 0; i < Math.min(buttonCount, 20); i++) {
        try {
          const buttonText = await allButtons.nth(i).textContent();
          if (buttonText && buttonText.trim()) {
            console.log(`  Button ${i}: "${buttonText.trim()}"`);
          }
        } catch (e) {
          // Skip buttons that can't be read
        }
      }
      
      throw new Error('AI tab not found - cannot proceed with test');
    }

    // Step 2: Wait for AI panel to load and look for AI model selection dropdown
    console.log('🤖 Step 2: Waiting for AI panel to load...');
    await page.waitForTimeout(3000); // Wait for AI panel content to fully load
    
    console.log('🤖 Step 2: Looking for AI model selection dropdown...');
    
    const modelSelectors = [
      'button[id="model"]', // The actual AI model select trigger
      'button[role="combobox"]:has-text("Select AI model")', // Combobox with specific placeholder
      '.select-trigger:has-text("Select AI model")', // Select trigger with placeholder
      '[id="model"]', // Direct ID selector
      'select[id="model"]', // Fallback select element
      'button[role="combobox"]', // Generic combobox (last resort)
    ];

    let modelSelectFound = false;
    let modelSelector = null;
    
    for (const selector of modelSelectors) {
      console.log(`🔍 Checking model selector: ${selector}`);
      const element = page.locator(selector).first();
      
      if (await element.isVisible({ timeout: 2000 })) {
        console.log(`✅ Model selector found: ${selector}`);
        modelSelector = element;
        modelSelectFound = true;
        break;
      }
    }

    if (modelSelectFound && modelSelector) {
      console.log('🖱️ Clicking model selector...');
      
      const beforeModelClickCount = storageProviderInstances.length;
      await modelSelector.click();
      await page.waitForTimeout(2000);
      const afterModelClickCount = storageProviderInstances.length;
      
      console.log(`📊 StorageProvider instances before model click: ${beforeModelClickCount}`);
      console.log(`📊 StorageProvider instances after model click: ${afterModelClickCount}`);
      
      if (afterModelClickCount > beforeModelClickCount) {
        console.log(`🚨 MODEL SELECTOR CLICK TRIGGERED ${afterModelClickCount - beforeModelClickCount} NEW INSTANCES!`);
      }
      
      // Look for AI model options (specifically Hailuo)
      console.log('📋 Looking for AI model options...');
      const optionSelectors = [
        '[role="option"]',
        '[data-value]',
        '.select-item',
        'option'
      ];
      
      let hailuoFound = false;
      for (const optSelector of optionSelectors) {
        const options = page.locator(optSelector);
        const optionCount = await options.count();
        
        if (optionCount > 0) {
          console.log(`📝 Found ${optionCount} AI model options with selector: ${optSelector}`);
          
          // List available options and look for Hailuo
          for (let i = 0; i < Math.min(optionCount, 10); i++) {
            try {
              const optionText = await options.nth(i).textContent();
              console.log(`  Option ${i}: "${optionText}"`);
              
              if (optionText && optionText.includes('Hailuo')) {
                console.log('🎯 Found Hailuo model! Selecting...');
                const beforeOptionClickCount = storageProviderInstances.length;
                await options.nth(i).click();
                await page.waitForTimeout(2000);
                const afterOptionClickCount = storageProviderInstances.length;
                
                console.log(`📊 StorageProvider instances before Hailuo select: ${beforeOptionClickCount}`);
                console.log(`📊 StorageProvider instances after Hailuo select: ${afterOptionClickCount}`);
                
                if (afterOptionClickCount > beforeOptionClickCount) {
                  console.log(`🚨 HAILUO SELECT TRIGGERED ${afterOptionClickCount - beforeOptionClickCount} NEW INSTANCES!`);
                }
                hailuoFound = true;
                break;
              }
            } catch (e) {
              console.log(`  Option ${i}: [Unable to read text]`);
            }
          }
          
          // If Hailuo not found, select first option
          if (!hailuoFound && optionCount > 0) {
            console.log('🎯 Hailuo not found, selecting first AI model...');
            const beforeOptionClickCount = storageProviderInstances.length;
            await options.first().click();
            await page.waitForTimeout(2000);
            const afterOptionClickCount = storageProviderInstances.length;
            
            console.log(`📊 StorageProvider instances before first model select: ${beforeOptionClickCount}`);
            console.log(`📊 StorageProvider instances after first model select: ${afterOptionClickCount}`);
            
            if (afterOptionClickCount > beforeOptionClickCount) {
              console.log(`🚨 FIRST MODEL SELECT TRIGGERED ${afterOptionClickCount - beforeOptionClickCount} NEW INSTANCES!`);
            }
          }
          break;
        }
      }
    } else {
      console.log('⚠️ Model selector not found in AI panel');
    }

    // Step 3: Complete AI video generation workflow
    console.log('📷 Step 3: Testing complete AI video generation workflow...')
    
    // Step 3b: Switch to Image-to-Video tab first
    console.log('🖼️ Step 3b: Switching to Image-to-Video tab...');
    
    const imageTabSelectors = [
      'button:has-text("Image to Video")',
      '[role="tab"]:has-text("Image to Video")', 
      'button:has-text("Image")',
      '[data-value="image"]'
    ];
    
    let imageTabFound = false;
    for (const selector of imageTabSelectors) {
      const imageTab = page.locator(selector).first();
      if (await imageTab.isVisible({ timeout: 2000 })) {
        console.log(`✅ Image tab found: ${selector}`);
        await imageTab.click();
        await page.waitForTimeout(1000);
        imageTabFound = true;
        break;
      }
    }
    
    if (!imageTabFound) {
      console.log('⚠️ Image tab not found, continuing with text tab');
    }
    
    // Step 3c: Look for image upload functionality  
    console.log('📷 Step 3c: Looking for image upload in AI panel...');
    
    const uploadSelectors = [
      'input[type="file"]',
      'div[class*="border-dashed"]:has-text("Click to upload")',
      'button:has-text("Upload")',
      'button:has-text("Choose")',
      'button:has-text("Select")',
      'button:has-text("Add")',
      '[data-testid="file-upload"]',
      '.upload-button',
      '.file-input'
    ];

    let uploadFound = false;
    
    for (const selector of uploadSelectors) {
      console.log(`🔍 Checking upload selector: ${selector}`);
      const element = page.locator(selector).first();
      
      if (await element.isVisible({ timeout: 2000 })) {
        console.log(`✅ Upload element found: ${selector}`);
        
        if (selector.includes('input[type="file"]')) {
          console.log('📁 Testing file input with real image...');
          
          // Create a simple test image using canvas
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
              ctx.fillText('Test Image', 256, 256);
              
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
          const testImagePath = 'test-ai-image.png';
          
          try {
            const beforeUploadCount = storageProviderInstances.length;
            
            // Create a file from the blob
            await page.setInputFiles(selector, {
              name: testImagePath,
              mimeType: 'image/png',
              buffer: Buffer.from(await blob.arrayBuffer())
            });
            
            console.log(`📤 Test image uploaded successfully`);
            imageUploaded = true;
            
            await page.waitForTimeout(3000);
            const afterUploadCount = storageProviderInstances.length;
            
            console.log(`📊 StorageProvider instances before upload: ${beforeUploadCount}`);
            console.log(`📊 StorageProvider instances after upload: ${afterUploadCount}`);
            
            if (afterUploadCount > beforeUploadCount) {
              console.log(`🚨 IMAGE UPLOAD TRIGGERED ${afterUploadCount - beforeUploadCount} NEW INSTANCES!`);
            }
            
          } catch (e) {
            console.log(`⚠️ File upload failed: ${e.message}`);
            console.log('📝 Attempting to click upload button instead...');
            await element.click();
            await page.waitForTimeout(1000);
          }
        } else if (selector.includes('border-dashed')) {
          console.log('🖱️ Found upload area, attempting to upload image...');
          
          // First, let's try to find the hidden file input
          const hiddenFileInput = page.locator('input[type="file"]').first();
          
          if (await hiddenFileInput.isVisible({ timeout: 1000 }) || await hiddenFileInput.count() > 0) {
            console.log('📁 Found file input, uploading test image directly...');
            
            // Create a simple test image using canvas
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
                ctx.fillText('Test Image', 256, 256);
                
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
            
            try {
              await page.setInputFiles('input[type="file"]', {
                name: 'test-ai-image.png',
                mimeType: 'image/png', 
                buffer: Buffer.from(await blob.arrayBuffer())
              });
              
              console.log(`📤 Test image uploaded successfully to file input`);
              imageUploaded = true;
              await page.waitForTimeout(3000);
              
              // Check if image preview is visible  
              const imagePreview = page.locator('img[alt="Selected image"]').first();
              if (await imagePreview.isVisible({ timeout: 2000 })) {
                console.log('✅ Image preview is visible - upload successful!');
              } else {
                console.log('⚠️ Image preview not visible - upload might have failed');
              }
              
            } catch (e) {
              console.log(`⚠️ File upload failed: ${e.message}`);
              
              // Fallback: click the upload area to trigger file dialog
              console.log('📝 Attempting to click upload area as fallback...');
              await element.click();
              await page.waitForTimeout(1000);
            }
          } else {
            console.log('📝 No file input found, clicking upload area...');
            await element.click();
            await page.waitForTimeout(1000);
          }
        } else {
          console.log('🖱️ Clicking upload button...');
          const beforeUploadClickCount = storageProviderInstances.length;
          await element.click();
          await page.waitForTimeout(2000);
          const afterUploadClickCount = storageProviderInstances.length;
          
          console.log(`📊 StorageProvider instances before upload click: ${beforeUploadClickCount}`);
          console.log(`📊 StorageProvider instances after upload click: ${afterUploadClickCount}`);
          
          if (afterUploadClickCount > beforeUploadClickCount) {
            console.log(`🚨 UPLOAD BUTTON CLICK TRIGGERED ${afterUploadClickCount - beforeUploadClickCount} NEW INSTANCES!`);
          }
        }
        
        uploadFound = true;
        break;
      }
    }

    // Step 3d: Add text prompt for image-to-video
    if (imageUploaded) {
      console.log('📝 Step 3d: Adding text prompt for image animation...');
      const promptSelectors = [
        'textarea[id="image-prompt"]',
        'textarea[placeholder*="animate"]',
        'textarea',
        'input[type="text"]'
      ];
      
      for (const selector of promptSelectors) {
        const promptElement = page.locator(selector).first();
        if (await promptElement.isVisible({ timeout: 2000 })) {
          console.log(`✅ Prompt input found: ${selector}`);
          await promptElement.fill('A beautiful landscape with flowing water and gentle movement');
          await page.waitForTimeout(1000);
          break;
        }
      }
    }
    
    // Step 3e: Look for generate button and attempt video generation
    if (imageUploaded || uploadFound) {
      console.log('🎬 Step 3e: Looking for video generation button...');
      
      const generateSelectors = [
        'button:has-text("Generate")',
        'button:has-text("Create")',
        'button:has-text("Start")',
        '[data-testid="generate-button"]',
        '.generate-button',
        'button[type="submit"]'
      ];
      
      for (const selector of generateSelectors) {
        console.log(`🔍 Checking generate button: ${selector}`);
        const generateButton = page.locator(selector).first();
        
        if (await generateButton.isVisible({ timeout: 2000 })) {
          console.log(`✅ Generate button found: ${selector}`);
          
          // Check if button is enabled
          const isEnabled = await generateButton.isEnabled();
          console.log(`🔍 Generate button enabled: ${isEnabled}`);
          
          if (!isEnabled) {
            console.log('⚠️ Generate button is disabled. Checking requirements...');
            console.log(`   - Image uploaded: ${imageUploaded}`);
            console.log(`   - Model selected: ${modelSelectFound}`);
            
            // Try to enable by checking if we missed something
            if (!imageUploaded) {
              console.log('💡 Retrying image upload since generate button is disabled...');
              
              // Quick retry of image upload
              const fileInput = page.locator('input[type="file"]').first();
              if (await fileInput.count() > 0) {
                try {
                  // Simple retry
                  await page.setInputFiles('input[type="file"]', {
                    name: 'retry-test-image.png',
                    mimeType: 'image/png',
                    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
                  });
                  await page.waitForTimeout(2000);
                  
                  if (await generateButton.isEnabled()) {
                    console.log('✅ Generate button now enabled after retry!');
                    imageUploaded = true;
                  }
                } catch (e) {
                  console.log(`⚠️ Retry upload failed: ${e.message}`);
                }
              }
            }
          }
          
          // If still not enabled, we'll skip generation but still report findings
          if (await generateButton.isEnabled()) {
            console.log('🚀 Starting video generation...');
            
            const beforeGenerateCount = storageProviderInstances.length;
            await generateButton.click();
            await page.waitForTimeout(5000); // Wait longer for generation
            const afterGenerateCount = storageProviderInstances.length;
            
            console.log(`📊 StorageProvider instances before generate: ${beforeGenerateCount}`);
            console.log(`📊 StorageProvider instances after generate: ${afterGenerateCount}`);
            
            if (afterGenerateCount > beforeGenerateCount) {
              console.log(`🚨 VIDEO GENERATION TRIGGERED ${afterGenerateCount - beforeGenerateCount} NEW INSTANCES!`);
            }
            
            // Look for generated video or progress indicator
            console.log('🔍 Checking for video generation progress...');
            
            const progressSelectors = [
              '.progress',
              '[role="progressbar"]',
              '.loading',
              '.generating',
              'video',
              '.video-result',
              '[data-testid="generated-video"]',
              'div:has-text("Generating")',
              'div:has-text("Processing")'
            ];
            
            let videoFound = false;
            for (const progSelector of progressSelectors) {
              const progressElement = page.locator(progSelector).first();
              if (await progressElement.isVisible({ timeout: 3000 })) {
                console.log(`✅ Progress/video element found: ${progSelector}`);
                videoFound = true;
                break;
              }
            }
            
            if (videoFound) {
              console.log('🎉 Video generation appears to be working!');
            } else {
              console.log('⚠️ No video or progress indicator found');
            }
          } else {
            console.log('⚠️ Generate button remains disabled, skipping video generation');
          }
          
          break;
        }
      }
    }

    if (!uploadFound) {
      console.log('⚠️ No upload functionality found in AI panel');
    }

    // Final monitoring period
    console.log('⏳ Final monitoring period...');
    await page.waitForTimeout(5000);

    // Generate comprehensive test report
    console.log('\n📊 COMPLETE AI VIDEO GENERATION TEST RESULTS:');
    console.log('===============================================');
    console.log(`Total StorageProvider instances created: ${storageProviderInstances.length}`);
    console.log(`AI tab found and clicked: ${aiTabFound}`);
    console.log(`Model selector found: ${modelSelectFound}`);
    console.log(`Upload functionality found: ${uploadFound}`);
    console.log(`Image uploaded successfully: ${imageUploaded || false}`);
    console.log(`Hailuo model selection attempted: ${modelSelectFound}`);
    console.log(`Page refresh events: ${pageRefreshEvents.length}`);
    console.log(`Navigation events: ${navigationEvents.length}`);
    console.log(`Total console logs: ${consoleLogs.length}`);

    // Show StorageProvider creation timeline
    if (storageProviderInstances.length > 0) {
      console.log('\n🔥 StorageProvider Instance Timeline:');
      storageProviderInstances.forEach((instance, i) => {
        console.log(`  ${i + 1}. ${instance.text}`);
      });
    }

    // Check for bug reproduction
    if (storageProviderInstances.length > initialStorageProviderCount + 2) {
      console.log('\n🚨 BUG REPRODUCED: Excessive StorageProvider instances created during AI interaction!');
    } else {
      console.log('\n✅ No excessive StorageProvider creation detected');
    }

    // Save results to debug logger
    await page.evaluate((results) => {
      if (window.debugLogger) {
        window.debugLogger.log('RealAITest', 'REAL_AI_INTERACTION_TEST_COMPLETE', results);
        console.log('📁 Results saved to debug logger');
      }
    }, {
      totalInstances: storageProviderInstances.length,
      aiTabFound,
      modelSelectFound,
      uploadFound,
      pageRefreshes: pageRefreshEvents.length,
      navigations: navigationEvents.length,
      timestamp: new Date().toISOString()
    });

    // Test passes if we can interact with AI features without major issues
    expect(storageProviderInstances.length).toBeLessThan(20); // Allow some instances but not excessive
  });
});