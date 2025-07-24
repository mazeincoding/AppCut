// Test script to automatically navigate to Projects page
console.log('🧪 Navigation test script loaded');

// Create a visible debug element
const debugDiv = document.createElement('div');
debugDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: yellow; padding: 10px; z-index: 10000; border: 2px solid black;';
debugDiv.textContent = 'Navigation test starting...';
document.body.appendChild(debugDiv);

// Wait for the page to fully load
window.addEventListener('load', () => {
  console.log('📄 Page loaded, waiting before navigation test...');
  debugDiv.textContent = 'Page loaded, waiting 3s...';
  
  // Wait 3 seconds then try to navigate
  setTimeout(() => {
    console.log('🔄 Testing navigation to Projects page...');
    debugDiv.textContent = 'Testing navigation...';
    
    // Check if we're in Electron
    if (window.electronAPI) {
      console.log('✅ Electron environment detected');
      debugDiv.textContent = 'Electron detected!';
      
      // Try to find and click the Projects button
      const projectsButton = document.querySelector('a[href="/projects"]');
      if (projectsButton) {
        console.log('🎯 Found Projects link:', projectsButton);
        console.log('  - Text:', projectsButton.textContent);
        console.log('  - href:', projectsButton.getAttribute('href'));
        console.log('  - outerHTML:', projectsButton.outerHTML);
        
        // Check for event listeners
        const listeners = getEventListeners ? getEventListeners(projectsButton) : null;
        console.log('  - Event listeners:', listeners);
        
        // Try direct navigation first
        console.log('🔄 Attempting direct navigation to projects page...');
        console.log('  - Current location:', window.location.href);
        
        try {
          // Direct navigation using the Electron navigation function if available
          if (window.electronAPI) {
            console.log('🚀 Using Electron navigation to: app://projects/index.html');
            debugDiv.textContent = 'Navigating to projects...';
            debugDiv.style.background = 'lightgreen';
            window.location.href = 'app://projects/index.html';
          } else {
            console.log('🚀 Using standard navigation to: /projects');
            window.location.href = '/projects';
          }
        } catch (error) {
          console.error('❌ Navigation error:', error);
          debugDiv.textContent = 'Navigation error: ' + error.message;
          debugDiv.style.background = 'red';
        }
      } else {
        console.log('❌ Projects button not found!');
        console.log('🔍 Searching for any links with "project" in text...');
        const allLinks = document.querySelectorAll('a');
        allLinks.forEach(link => {
          if (link.textContent.toLowerCase().includes('project')) {
            console.log('  - Found link:', link.textContent, 'href:', link.href);
          }
        });
        
        console.log('🔄 Attempting direct navigation anyway...');
        window.location.href = 'app://projects/index.html';
      }
    } else {
      console.log('❌ Not in Electron environment');
    }
  }, 3000);
});

// Log navigation events
window.addEventListener('beforeunload', (event) => {
  console.log('🚪 Page is about to unload (navigation starting)...');
});

// Monitor location changes
let lastLocation = window.location.href;
setInterval(() => {
  if (window.location.href !== lastLocation) {
    console.log('📍 Location changed!');
    console.log('  - From:', lastLocation);
    console.log('  - To:', window.location.href);
    lastLocation = window.location.href;
  }
}, 500);