// Hydration debug script for Electron
console.log('🔍 [HYDRATION DEBUG] Starting hydration analysis...');

// Check if React is loaded
console.log('🔍 [HYDRATION DEBUG] React status:', {
  React: typeof React !== 'undefined' ? 'loaded' : 'not loaded',
  ReactDOM: typeof ReactDOM !== 'undefined' ? 'loaded' : 'not loaded',
  NextJS: typeof window.__NEXT_DATA__ !== 'undefined' ? 'loaded' : 'not loaded'
});

// Check DOM elements
console.log('🔍 [HYDRATION DEBUG] DOM elements:');
const nextRoot = document.querySelector('#__next');
console.log('- #__next element:', nextRoot ? 'found' : 'not found');

const hiddenDiv = document.querySelector('div[hidden]');
console.log('- hidden div:', hiddenDiv ? 'found' : 'not found');

const body = document.querySelector('body');
console.log('- body classes:', body ? body.className : 'no body');

// Check for React components
setTimeout(() => {
  console.log('🔍 [HYDRATION DEBUG] Checking for React components after delay...');
  
  const buttons = document.querySelectorAll('button');
  console.log('- Total buttons found:', buttons.length);
  
  buttons.forEach((button, index) => {
    console.log(`- Button ${index}: "${button.textContent?.trim()}" (${button.className})`);
  });
  
  // Check for Next.js hydration
  if (typeof window !== 'undefined' && window.__NEXT_DATA__) {
    console.log('🔍 [HYDRATION DEBUG] Next.js data:', window.__NEXT_DATA__);
  }
  
  // Check for React Fiber
  const reactFiber = document.querySelector('[data-reactroot]') || document.querySelector('#__next');
  if (reactFiber) {
    console.log('🔍 [HYDRATION DEBUG] React Fiber found:', reactFiber);
  } else {
    console.log('🔍 [HYDRATION DEBUG] No React Fiber found');
  }
}, 3000);

// Add click listener to debug button interactions
document.addEventListener('click', function(e) {
  if (e.target.textContent && e.target.textContent.includes('New project')) {
    console.log('🔍 [HYDRATION DEBUG] New project button clicked!');
    console.log('- Target:', e.target);
    console.log('- Event type:', e.type);
    console.log('- Is React event?', e.isTrusted);
  }
});