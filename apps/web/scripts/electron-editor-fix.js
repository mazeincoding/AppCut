// Electron Editor Fix Script
// This script fixes the editor loading issue in Electron builds

const fs = require('fs');
const path = require('path');

console.log('🔧 [ELECTRON-EDITOR-FIX] Starting editor fix...');

// Read the editor HTML file
const editorHtmlPath = path.join(__dirname, '../out/editor/project/[project_id].html');

if (!fs.existsSync(editorHtmlPath)) {
  console.error('❌ Editor HTML file not found:', editorHtmlPath);
  process.exit(1);
}

let html = fs.readFileSync(editorHtmlPath, 'utf8');

// Add a comprehensive fix script right before the closing body tag
const editorFixScript = `
<script>
// ELECTRON EDITOR FIX: Comprehensive initialization fix
(function() {
  console.log('🚀 [ELECTRON-EDITOR-FIX] Editor fix script loaded');
  
  // Wait for React and stores to be ready
  let initAttempts = 0;
  const maxAttempts = 20;
  
  function tryInitializeEditor() {
    initAttempts++;
    console.log('🔧 [ELECTRON-EDITOR-FIX] Initialization attempt', initAttempts);
    
    // Check if React is ready
    const reactRoot = document.getElementById('__next');
    if (!reactRoot || !reactRoot.children.length) {
      if (initAttempts < maxAttempts) {
        setTimeout(tryInitializeEditor, 500);
      }
      return;
    }
    
    // Force hide loading screen after React mounts
    setTimeout(function() {
      const loadingScreens = document.querySelectorAll('.h-screen.w-screen.flex.items-center.justify-center');
      loadingScreens.forEach(function(screen) {
        const hasLoader = screen.querySelector('.animate-spin');
        const hasLoadingText = screen.textContent && screen.textContent.includes('Loading editor');
        
        if (hasLoader || hasLoadingText) {
          console.log('🔧 [ELECTRON-EDITOR-FIX] Hiding loading screen');
          screen.style.display = 'none';
          
          // Find the actual editor content
          const editorContent = document.querySelector('.editor-layout, [data-editor-content], main:not(.loading)');
          if (editorContent) {
            editorContent.style.opacity = '1';
            editorContent.style.visibility = 'visible';
            editorContent.style.display = 'block';
            console.log('✅ [ELECTRON-EDITOR-FIX] Editor content made visible');
          }
        }
      });
      
      // Force visibility on all potentially hidden elements
      const hiddenElements = document.querySelectorAll('[style*="opacity: 0"], [style*="visibility: hidden"]');
      hiddenElements.forEach(function(el) {
        if (!el.classList.contains('animate-spin') && !el.closest('.animate-spin')) {
          el.style.opacity = '1';
          el.style.visibility = 'visible';
        }
      });
      
      // Dispatch custom event to notify app
      window.dispatchEvent(new Event('electron-editor-ready'));
      console.log('✅ [ELECTRON-EDITOR-FIX] Editor initialization complete');
    }, 1500);
  }
  
  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInitializeEditor);
  } else {
    tryInitializeEditor();
  }
  
  // Also listen for React mount events
  window.addEventListener('load', function() {
    setTimeout(tryInitializeEditor, 1000);
  });
})();
</script>
`;

// Insert the script before closing body tag
html = html.replace('</body>', editorFixScript + '</body>');

// Write the fixed HTML back
fs.writeFileSync(editorHtmlPath, html, 'utf8');

console.log('✅ [ELECTRON-EDITOR-FIX] Editor HTML fixed successfully');