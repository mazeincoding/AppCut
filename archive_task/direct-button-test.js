// Direct button test - run this in the Electron DevTools console

console.log('🧪 DIRECT BUTTON TEST STARTING...');

// Test 1: Find all buttons
console.log('🔍 Test 1: Finding all buttons...');
const allButtons = document.querySelectorAll('button');
console.log(`Found ${allButtons.length} buttons total`);

// Test 2: Find project-related buttons
console.log('🔍 Test 2: Finding project-related buttons...');
const projectButtons = Array.from(allButtons).filter(btn => {
  const text = btn.textContent.toLowerCase();
  return text.includes('new') || text.includes('project') || text.includes('create');
});
console.log(`Found ${projectButtons.length} project-related buttons:`);
projectButtons.forEach((btn, i) => {
  console.log(`  ${i+1}. "${btn.textContent.trim()}" - disabled: ${btn.disabled}`);
});

// Test 3: Check if we're on projects page
console.log('🔍 Test 3: Checking current page...');
console.log(`Current URL: ${window.location.href}`);
console.log(`Page title: ${document.title}`);
console.log(`Body contains "Your Projects": ${document.body.textContent.includes('Your Projects')}`);

// Test 4: Check React state
console.log('🔍 Test 4: Checking React state...');
console.log(`React root exists: ${!!document.querySelector('#__next')}`);
console.log(`Window has React: ${typeof window.React !== 'undefined'}`);

// Test 5: Try to click the button if found
if (projectButtons.length > 0) {
  console.log('🖱️ Test 5: Testing button click...');
  const targetButton = projectButtons[0];
  console.log(`Targeting button: "${targetButton.textContent.trim()}"`);
  
  // Add click listener
  targetButton.addEventListener('click', () => {
    console.log('✅ Button click event fired!');
  });
  
  // Try clicking
  console.log('Clicking button now...');
  targetButton.click();
  
  // Check for navigation after delay
  setTimeout(() => {
    console.log('⏰ After click check:');
    console.log(`  URL changed: ${window.location.href}`);
    console.log(`  Title changed: ${document.title}`);
  }, 2000);
} else {
  console.log('❌ No project buttons found to test!');
}

console.log('🧪 DIRECT BUTTON TEST COMPLETE');