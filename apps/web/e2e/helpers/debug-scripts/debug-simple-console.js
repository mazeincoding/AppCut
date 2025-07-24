// Simple Console Debug Script - Copy this into browser console
// This is a shorter version for quick debugging
// Wrapped in IIFE to avoid variable conflicts

(function() {
  console.log('🔍 QUICK REACT DEBUG:');
  console.log('React:', typeof React, window.React);
  console.log('ReactDOM:', typeof ReactDOM, window.ReactDOM);

  // Check if React is mounted
  const fiber = Object.keys(document.documentElement).find(k => k.startsWith('__reactFiber'));
  console.log('React mounted:', !!fiber);

  // Check Next.js root
  const nextRoot = document.getElementById('__next');
  console.log('Next.js root:', !!nextRoot);
  if (nextRoot) {
    const nextFiber = Object.keys(nextRoot).find(k => k.startsWith('__reactFiber'));
    console.log('Next.js root has React:', !!nextFiber);
  }

  // Check buttons
  const buttons = document.querySelectorAll('button');
  console.log('Buttons found:', buttons.length);
  buttons.forEach((btn, i) => {
    const reactProps = Object.keys(btn).find(k => k.startsWith('__reactProps'));
    console.log(`Button ${i}: "${btn.textContent?.trim()}" - React props: ${!!reactProps}`);
  });

  // Check scripts
  const scripts = document.querySelectorAll('script[src*="_next"], script[src*="react"], script[src*="chunks"]');
  console.log('React/Next.js scripts:', scripts.length);

  // Test React availability
  if (window.React && window.ReactDOM) {
    console.log('✅ React available - trying manual render...');
    try {
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;top:10px;right:10px;background:green;color:white;padding:5px;z-index:9999;';
      document.body.appendChild(div);
      ReactDOM.render(React.createElement('span', {}, 'React works!'), div);
      setTimeout(() => div.remove(), 3000);
    } catch (e) {
      console.log('❌ React render failed:', e.message);
    }
  } else {
    console.log('❌ React not available');
  }

  console.log('Done! Check results above.');
})();