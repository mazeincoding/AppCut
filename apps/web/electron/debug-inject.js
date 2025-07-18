// Debug script to inject into Electron window for troubleshooting
// This will help identify loading issues with React/Next.js

window.addEventListener('DOMContentLoaded', () => {
  console.log('=== ELECTRON DEBUG: DOM Content Loaded ===');
  
  // Check for Next.js app container
  const nextContainer = document.getElementById('__next');
  console.log('Next.js container found:', !!nextContainer);
  
  // Check for script tags
  const scripts = Array.from(document.querySelectorAll('script'));
  console.log('Total script tags:', scripts.length);
  
  // Check which scripts loaded successfully
  const srcScripts = scripts.filter(s => s.src);
  console.log('Scripts with src:', srcScripts.length);
  
  srcScripts.forEach((script, index) => {
    // Extract just the filename from the src
    const url = new URL(script.src);
    const filename = url.pathname.split('/').pop();
    console.log(`Script ${index + 1}: ${filename} - ${script.src.substring(0, 50)}...`);
  });
  
  // Monitor for errors
  window.addEventListener('error', (event) => {
    console.error('=== ELECTRON DEBUG: JavaScript Error ===');
    console.error('Message:', event.message);
    console.error('Source:', event.filename);
    console.error('Line:', event.lineno, 'Column:', event.colno);
    console.error('Error object:', event.error);
  });
  
  // Monitor image loading specifically
  console.log('🖼️ Setting up image load monitoring...');
  
  // Function to setup debugging for an image
  function setupImageDebug(img) {
    console.log('🔍 Setting up debug for image:', img.src);
    
    img.addEventListener('load', function() {
      console.log('✅ Image loaded successfully:');
      console.log('   - Src:', this.src);
      console.log('   - Natural width:', this.naturalWidth);
      console.log('   - Natural height:', this.naturalHeight);
      console.log('   - Display width:', this.width);
      console.log('   - Display height:', this.height);
      console.log('   - Complete:', this.complete);
      
      // Check if this is the background image that's corrupted
      if (this.src.includes('landing-page-bg')) {
        console.log('🎯 BACKGROUND IMAGE DEBUG:');
        console.log('   - Element classes:', this.className);
        console.log('   - Element styles:', this.style.cssText);
        console.log('   - Parent element:', this.parentElement?.tagName);
        console.log('   - Image data URL (first 100 chars):', this.src.substring(0, 100));
      }
    });
    
    img.addEventListener('error', function(e) {
      console.error('❌ Image failed to load:');
      console.error('   - Src:', this.src);
      console.error('   - Error:', e);
    });
    
    img.addEventListener('abort', function() {
      console.warn('⚠️ Image loading aborted:', this.src);
    });
  }
  
  // Monitor all image elements with mutation observer
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // Check if it's an image
          if (node.tagName === 'IMG') {
            console.log('🖼️ New image detected:', node.src);
            setupImageDebug(node);
          }
          
          // Check for images in added subtree
          const images = node.querySelectorAll && node.querySelectorAll('img');
          if (images) {
            images.forEach(img => {
              console.log('🖼️ Image in subtree:', img.src);
              setupImageDebug(img);
            });
          }
        }
      });
    });
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Check for existing images
  const existingImages = document.querySelectorAll('img');
  console.log('🔍 Found', existingImages.length, 'existing images');
  existingImages.forEach(img => {
    console.log('🖼️ Existing image:', img.src);
    setupImageDebug(img);
  });
  
  // Check for CSS background images
  function checkBackgroundImages() {
    console.log('\n🎨 Checking for CSS background images...');
    const allElements = document.querySelectorAll('*');
    let bgImageCount = 0;
    
    allElements.forEach(element => {
      const computedStyle = window.getComputedStyle(element);
      const bgImage = computedStyle.backgroundImage;
      
      if (bgImage && bgImage !== 'none') {
        bgImageCount++;
        console.log('🎨 Background image found:');
        console.log('   - Element:', element.tagName, element.className);
        console.log('   - Background image:', bgImage);
        console.log('   - Background size:', computedStyle.backgroundSize);
        console.log('   - Background position:', computedStyle.backgroundPosition);
        console.log('   - Background repeat:', computedStyle.backgroundRepeat);
        
        // Check if this contains our landing page image
        if (bgImage.includes('landing-page-bg')) {
          console.log('🎯 FOUND THE BACKGROUND IMAGE ELEMENT!');
          console.log('   - Full background image value:', bgImage);
          console.log('   - Element classes:', element.className);
          console.log('   - Element ID:', element.id);
          console.log('   - Parent:', element.parentElement?.tagName);
        }
      }
    });
    
    console.log('🎨 Total elements with background images:', bgImageCount);
  }
  
  // Run background image check after DOM loads
  setTimeout(checkBackgroundImages, 1000);
  setTimeout(checkBackgroundImages, 3000); // Check again after React hydration
  
  // Check storage APIs
  console.log('\n=== ELECTRON DEBUG: Storage APIs ===');
  console.log('IndexedDB available:', !!window.indexedDB);
  console.log('localStorage available:', !!window.localStorage);
  console.log('sessionStorage available:', !!window.sessionStorage);
  console.log('navigator.storage available:', !!navigator.storage);
  
  // Try to detect OPFS
  let opfsAvailable = false;
  try {
    if (navigator.storage && navigator.storage.getDirectory) {
      opfsAvailable = true;
    }
  } catch (e) {
    // OPFS not available
  }
  console.log('OPFS available:', opfsAvailable);
  
  // Check after scripts should have loaded
  setTimeout(() => {
    console.log('\n=== ELECTRON DEBUG: After 3s delay ===');
    
    // Check if React is available globally (which it shouldn't be in production)
    console.log('window.React:', typeof window.React);
    console.log('window.ReactDOM:', typeof window.ReactDOM);
    
    // Check if app rendered (Next.js 13+ App Router doesn't use #__next)
    const appContent = document.querySelector('#__next');
    const headerEl = document.querySelector('header');
    const footerEl = document.querySelector('footer');
    const bodyContent = document.body.innerHTML;
    
    if (appContent) {
      console.log('✅ Found #__next container (legacy Next.js)');
      const hasContent = appContent.innerHTML.length > 100;
      console.log('App rendered:', hasContent);
    } else if (headerEl && footerEl && bodyContent.length > 10000) {
      console.log('✅ Next.js 13+ App Router detected and working!');
      console.log('- Header found:', !!headerEl);
      console.log('- Footer found:', !!footerEl);
      console.log('- Body content length:', bodyContent.length);
      console.log('- App fully rendered and functional');
    } else {
      console.log('❌ App not rendered properly');
      console.log('Body content length:', bodyContent.length);
      console.log('Header found:', !!headerEl);
      console.log('Footer found:', !!footerEl);
    }
    
    // Check for any React root markers
    const reactRoots = document.querySelectorAll('[data-reactroot]');
    console.log('React root elements found:', reactRoots.length);
    
    // Check for React 18 createRoot markers
    const reactFiberNodes = document.querySelectorAll('[data-reactfiber]');
    console.log('React Fiber nodes found:', reactFiberNodes.length);
    
    // Check for OpenCut specific elements
    const editorCanvas = document.querySelector('[data-testid="editor-canvas"]');
    const timeline = document.querySelector('[data-testid="timeline"]');
    const headerElement = document.querySelector('header');
    const footerElement = document.querySelector('footer');
    
    console.log('OpenCut elements found:');
    console.log('- Header:', !!headerElement);
    console.log('- Footer:', !!footerElement);
    console.log('- Editor canvas:', !!editorCanvas);
    console.log('- Timeline:', !!timeline);
    
    // Check for JavaScript errors in console
    console.log('\n=== CHECKING FOR ERRORS ===');
    
    // Listen for any unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
    
  }, 3000);
});

console.log('=== ELECTRON DEBUG: Debug script injected ===');