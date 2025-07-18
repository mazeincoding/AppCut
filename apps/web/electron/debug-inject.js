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
    
    // Check if app rendered
    const appContent = document.querySelector('#__next');
    if (appContent) {
      const hasContent = appContent.innerHTML.length > 100;
      console.log('App rendered:', hasContent);
      if (hasContent) {
        console.log('First 200 chars of app content:', appContent.innerHTML.substring(0, 200) + '...');
      }
    }
    
    // Check for any React root markers
    const reactRoots = document.querySelectorAll('[data-reactroot]');
    console.log('React root elements found:', reactRoots.length);
    
    // Check for OpenCut specific elements
    const editorCanvas = document.querySelector('[data-testid="editor-canvas"]');
    const timeline = document.querySelector('[data-testid="timeline"]');
    console.log('Editor canvas found:', !!editorCanvas);
    console.log('Timeline found:', !!timeline);
    
  }, 3000);
});

console.log('=== ELECTRON DEBUG: Debug script injected ===');