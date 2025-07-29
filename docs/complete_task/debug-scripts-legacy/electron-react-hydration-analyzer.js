// Hydration debug script for Electron
// Starting hydration analysis...

// Check if React is loaded
const reactStatus = {
  React: typeof React !== 'undefined' ? 'loaded' : 'not loaded',
  ReactDOM: typeof ReactDOM !== 'undefined' ? 'loaded' : 'not loaded',
  NextJS: typeof window.__NEXT_DATA__ !== 'undefined' ? 'loaded' : 'not loaded'
};

// Check DOM elements
const nextRoot = document.querySelector('#__next');
const nextRootStatus = nextRoot ? 'found' : 'not found';

const hiddenDiv = document.querySelector('div[hidden]');
const hiddenDivStatus = hiddenDiv ? 'found' : 'not found';

const body = document.querySelector('body');
const bodyClasses = body ? body.className : 'no body';

// Check for React components
setTimeout(() => {
  // Checking for React components after delay...
  
  const buttons = document.querySelectorAll('button');
  const buttonCount = buttons.length;
  
  const buttonInfo = [];
  buttons.forEach((button, index) => {
    buttonInfo.push({
      index,
      text: button.textContent?.trim(),
      className: button.className
    });
  });
  
  // Check for Next.js hydration
  let nextJSData = null;
  if (typeof window !== 'undefined' && window.__NEXT_DATA__) {
    nextJSData = window.__NEXT_DATA__;
  }
  
  // Check for React Fiber
  const reactFiber = document.querySelector('[data-reactroot]') || document.querySelector('#__next');
  const reactFiberStatus = reactFiber ? 'found' : 'not found';
}, 3000);

// Add click listener to debug button interactions
document.addEventListener('click', function(e) {
  if (e.target.textContent && e.target.textContent.includes('New project')) {
    // New project button clicked - store debug info
    const clickDebugInfo = {
      target: e.target,
      eventType: e.type,
      isTrusted: e.isTrusted,
      timestamp: Date.now()
    };
    
    // Debug info is stored in clickDebugInfo variable for analysis
  }
});