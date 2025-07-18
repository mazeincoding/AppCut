// Comprehensive React Hydration Debug Script
// Copy and paste this entire script into the browser console

console.log('🔍 === REACT HYDRATION DEBUG ANALYSIS ===');

// 1. Check React/ReactDOM availability
console.log('\n📦 MODULE AVAILABILITY CHECK:');
console.log('typeof React:', typeof React);
console.log('typeof ReactDOM:', typeof ReactDOM);
console.log('window.React:', window.React);
console.log('window.ReactDOM:', window.ReactDOM);

// Try to access React from global scope
try {
  console.log('React from global:', globalThis.React);
  console.log('ReactDOM from global:', globalThis.ReactDOM);
} catch (e) {
  console.log('Error accessing React from global:', e.message);
}

// 2. Check for React Fiber (internal React structure)
console.log('\n🧬 REACT FIBER ANALYSIS:');
const reactFiberKey = Object.keys(document.documentElement).find(key => key.startsWith('__reactFiber'));
const reactPropsKey = Object.keys(document.documentElement).find(key => key.startsWith('__reactProps'));

console.log('React Fiber key found:', reactFiberKey);
console.log('React Props key found:', reactPropsKey);

if (reactFiberKey) {
  console.log('React Fiber exists - React is mounted');
  const fiber = document.documentElement[reactFiberKey];
  console.log('Fiber root:', fiber);
} else {
  console.log('❌ No React Fiber found - React not mounted');
}

// 3. Check DOM for React roots
console.log('\n🌳 REACT ROOT DETECTION:');
const possibleRoots = document.querySelectorAll('[data-reactroot], #__next, [id*="react"], [class*="react"]');
console.log('Possible React roots found:', possibleRoots.length);
possibleRoots.forEach((root, index) => {
  console.log(`Root ${index}:`, root.tagName, root.id, root.className);
  const fiberKey = Object.keys(root).find(key => key.startsWith('__reactFiber'));
  console.log(`  Has Fiber: ${!!fiberKey}`);
});

// 4. Check Next.js specific elements
console.log('\n⚡ NEXT.JS DETECTION:');
const nextRoot = document.getElementById('__next');
console.log('Next.js root element:', nextRoot);
if (nextRoot) {
  const nextFiber = Object.keys(nextRoot).find(key => key.startsWith('__reactFiber'));
  console.log('Next.js root has Fiber:', !!nextFiber);
  console.log('Next.js root children:', nextRoot.children.length);
}

// 5. Check for JavaScript bundles
console.log('\n📜 SCRIPT BUNDLE ANALYSIS:');
const scripts = document.querySelectorAll('script[src]');
console.log('Total scripts with src:', scripts.length);

const nextScripts = Array.from(scripts).filter(script => 
  script.src.includes('_next') || script.src.includes('react') || script.src.includes('chunks')
);
console.log('Next.js/React scripts:', nextScripts.length);

nextScripts.forEach((script, index) => {
  console.log(`Script ${index}:`, script.src);
  console.log(`  Loaded: ${script.readyState || 'unknown'}`);
  console.log(`  Async: ${script.async}`);
  console.log(`  Defer: ${script.defer}`);
});

// 6. Test module loading
console.log('\n🔧 MODULE LOADING TEST:');
try {
  // Try to import React dynamically
  console.log('Attempting dynamic import of React...');
  import('react').then(React => {
    console.log('✅ React imported successfully:', React);
  }).catch(err => {
    console.log('❌ React import failed:', err.message);
  });
} catch (e) {
  console.log('❌ Dynamic import not supported or failed:', e.message);
}

// 7. Check for hydration errors
console.log('\n⚠️ HYDRATION ERROR CHECK:');
const checkHydrationErrors = () => {
  const errors = [];
  
  // Check console for hydration warnings
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = function(...args) {
    if (args.some(arg => typeof arg === 'string' && (
      arg.includes('hydration') || 
      arg.includes('client') || 
      arg.includes('server') ||
      arg.includes('mismatch')
    ))) {
      errors.push(['ERROR', ...args]);
    }
    originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    if (args.some(arg => typeof arg === 'string' && (
      arg.includes('hydration') || 
      arg.includes('client') || 
      arg.includes('server') ||
      arg.includes('mismatch')
    ))) {
      errors.push(['WARN', ...args]);
    }
    originalWarn.apply(console, args);
  };
  
  setTimeout(() => {
    console.error = originalError;
    console.warn = originalWarn;
    console.log('Hydration errors collected:', errors);
  }, 5000);
};

checkHydrationErrors();

// 8. Button interaction test
console.log('\n🔘 BUTTON INTERACTION TEST:');
const buttons = document.querySelectorAll('button');
console.log('Total buttons found:', buttons.length);

buttons.forEach((button, index) => {
  console.log(`Button ${index}:`, button.textContent?.trim());
  console.log(`  Has onClick: ${!!button.onclick}`);
  console.log(`  Has event listeners: ${!!button.getEventListeners ? Object.keys(button.getEventListeners()).length : 'unknown'}`);
  
  // Check for React event handlers
  const reactKey = Object.keys(button).find(key => key.startsWith('__reactProps'));
  if (reactKey) {
    console.log(`  React props:`, button[reactKey]);
  }
});

// 9. Manual React mounting test
console.log('\n🚀 MANUAL REACT MOUNTING TEST:');
const testReactMount = () => {
  // Create a test container
  const testContainer = document.createElement('div');
  testContainer.id = 'react-test-container';
  testContainer.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999; background: red; color: white; padding: 10px;';
  document.body.appendChild(testContainer);
  
  // Try to render a simple React component
  if (window.React && window.ReactDOM) {
    console.log('Attempting manual React render...');
    try {
      const TestComponent = React.createElement('div', {}, 'React is working!');
      ReactDOM.render(TestComponent, testContainer);
      console.log('✅ Manual React render successful');
    } catch (e) {
      console.log('❌ Manual React render failed:', e.message);
      testContainer.innerHTML = 'React render failed';
    }
  } else {
    console.log('❌ React/ReactDOM not available for manual test');
    testContainer.innerHTML = 'React not available';
  }
  
  // Remove test container after 5 seconds
  setTimeout(() => {
    testContainer.remove();
  }, 5000);
};

testReactMount();

// 10. Environment summary
console.log('\n📊 ENVIRONMENT SUMMARY:');
console.log('User Agent:', navigator.userAgent);
console.log('Location:', window.location.href);
console.log('Document ready state:', document.readyState);
console.log('Electron detected:', !!(window.electronAPI || document.body.getAttribute('data-electron')));

// 11. DOM mutation observer for React changes
console.log('\n👀 DOM MUTATION OBSERVER:');
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName?.startsWith('data-react')) {
      console.log('React attribute change detected:', mutation.target, mutation.attributeName);
    }
  });
});

observer.observe(document.body, {
  attributes: true,
  subtree: true,
  attributeFilter: ['data-reactroot', 'data-react-helmet']
});

// Stop observer after 10 seconds
setTimeout(() => {
  observer.disconnect();
  console.log('DOM mutation observer stopped');
}, 10000);

console.log('\n✅ Debug script completed. Results logged above.');
console.log('💡 Copy this entire script and paste into the browser console while on the problematic page.');