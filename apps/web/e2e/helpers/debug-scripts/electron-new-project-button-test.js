// Button Click Test Script for Electron
console.log('🧪 [BUTTON TEST] Starting New Project button test...');

function testNewProjectButton() {
  console.log('🔍 [BUTTON TEST] Looking for New Project button...');
  
  // Find all buttons with "New project" text
  const buttons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('New project') || 
    btn.textContent.includes('New Project') ||
    btn.textContent.includes('Create')
  );
  
  console.log('🔍 [BUTTON TEST] Found buttons:', buttons.length);
  buttons.forEach((btn, index) => {
    console.log(`  ${index + 1}. "${btn.textContent.trim()}" - disabled: ${btn.disabled}, visible: ${btn.style.display !== 'none'}`);
  });
  
  if (buttons.length === 0) {
    console.log('❌ [BUTTON TEST] No New Project buttons found!');
    return;
  }
  
  const newProjectButton = buttons[0];
  console.log('🎯 [BUTTON TEST] Targeting button:', newProjectButton.textContent.trim());
  
  // Check if button is clickable
  if (newProjectButton.disabled) {
    console.log('❌ [BUTTON TEST] Button is disabled!');
    return;
  }
  
  // Check if React store is available
  console.log('🔍 [BUTTON TEST] Checking React state...');
  const reactRoot = document.querySelector('#__next');
  console.log('🔍 [BUTTON TEST] React root found:', !!reactRoot);
  
  // Add click listener to monitor what happens
  console.log('👂 [BUTTON TEST] Adding click listener...');
  newProjectButton.addEventListener('click', (e) => {
    console.log('🖱️ [BUTTON TEST] Button clicked!', e);
    console.log('🖱️ [BUTTON TEST] Event target:', e.target);
    console.log('🖱️ [BUTTON TEST] Event prevented:', e.defaultPrevented);
  });
  
  // Test the click
  console.log('🖱️ [BUTTON TEST] Simulating button click...');
  try {
    newProjectButton.click();
    console.log('✅ [BUTTON TEST] Click executed successfully');
    
    // Wait and check for navigation or state changes
    setTimeout(() => {
      console.log('⏰ [BUTTON TEST] Checking after 1 second...');
      console.log('  Current URL:', window.location.href);
      console.log('  Page title:', document.title);
      console.log('  React root still exists:', !!document.querySelector('#__next'));
    }, 1000);
    
    setTimeout(() => {
      console.log('⏰ [BUTTON TEST] Checking after 3 seconds...');
      console.log('  Current URL:', window.location.href);
      console.log('  Page title:', document.title);
      console.log('  React root still exists:', !!document.querySelector('#__next'));
    }, 3000);
    
  } catch (error) {
    console.error('❌ [BUTTON TEST] Click failed:', error);
  }
}

// Wait for DOM and React to be ready
function waitForReact() {
  console.log('⏳ [BUTTON TEST] Waiting for React to be ready...');
  
  const checkInterval = setInterval(() => {
    const reactRoot = document.querySelector('#__next');
    const buttons = document.querySelectorAll('button');
    
    if (reactRoot && buttons.length > 0) {
      console.log('✅ [BUTTON TEST] React is ready, starting test...');
      clearInterval(checkInterval);
      setTimeout(testNewProjectButton, 500); // Small delay to ensure everything is loaded
    }
  }, 100);
  
  // Timeout after 10 seconds
  setTimeout(() => {
    clearInterval(checkInterval);
    console.log('⏱️ [BUTTON TEST] Timeout waiting for React');
  }, 10000);
}

// Start the test
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForReact);
} else {
  waitForReact();
}