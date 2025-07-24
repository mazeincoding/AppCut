// Simple navigation test
console.log('🚀 Simple navigation test starting...');

// Create visible indicator
const indicator = document.createElement('div');
indicator.style.cssText = 'position: fixed; top: 10px; right: 10px; background: yellow; padding: 20px; z-index: 10000; border: 3px solid red; font-size: 16px; font-weight: bold;';
indicator.textContent = 'NAV TEST: Starting...';
document.body.appendChild(indicator);

// Immediate test - don't wait
console.log('🔄 Attempting immediate navigation to projects page...');
indicator.textContent = 'NAV TEST: Navigating NOW!';

try {
  console.log('Current location:', window.location.href);
  console.log('Navigating to: app://projects/index.html');
  
  // Force navigation
  window.location.href = 'app://projects/index.html';
  
  indicator.textContent = 'NAV TEST: Navigation triggered!';
  indicator.style.background = 'lightgreen';
} catch (error) {
  console.error('Navigation error:', error);
  indicator.textContent = 'NAV TEST: ERROR - ' + error.message;
  indicator.style.background = 'red';
  indicator.style.color = 'white';
}