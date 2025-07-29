// Simple debug script that runs immediately
console.log('🚀 SIMPLE DEBUG STARTING...');

// Check images immediately
function checkImagesNow() {
  console.log('\n🖼️ === IMMEDIATE IMAGE CHECK ===');
  
  const allImages = document.querySelectorAll('img');
  console.log('Total images found:', allImages.length);
  
  allImages.forEach((img, index) => {
    console.log(`Image ${index + 1}:`);
    console.log('  - Src:', img.src);
    console.log('  - Natural size:', img.naturalWidth + 'x' + img.naturalHeight);
    console.log('  - Display size:', img.width + 'x' + img.height);
    console.log('  - Complete:', img.complete);
    console.log('  - Classes:', img.className);
    
    if (img.src.includes('landing-page-bg')) {
      console.log('🎯 FOUND BACKGROUND IMAGE!');
      console.log('  - Parent element:', img.parentElement?.tagName);
      console.log('  - Parent classes:', img.parentElement?.className);
      console.log('  - Computed styles:');
      const computed = window.getComputedStyle(img);
      console.log('    - Object fit:', computed.objectFit);
      console.log('    - Object position:', computed.objectPosition);
      console.log('    - Width:', computed.width);
      console.log('    - Height:', computed.height);
      console.log('    - Z-index:', computed.zIndex);
      console.log('    - Position:', computed.position);
    }
  });
}

// Check CSS background images immediately
function checkBackgroundsNow() {
  console.log('\n🎨 === IMMEDIATE BACKGROUND CHECK ===');
  
  const allElements = document.querySelectorAll('*');
  let bgCount = 0;
  
  allElements.forEach(element => {
    const computed = window.getComputedStyle(element);
    const bgImage = computed.backgroundImage;
    
    if (bgImage && bgImage !== 'none') {
      bgCount++;
      console.log(`Background ${bgCount}:`);
      console.log('  - Element:', element.tagName, element.className);
      console.log('  - Background image:', bgImage);
      console.log('  - Background size:', computed.backgroundSize);
      console.log('  - Background position:', computed.backgroundPosition);
      
      if (bgImage.includes('landing-page-bg')) {
        console.log('🎯 FOUND BACKGROUND CSS!');
        console.log('  - Full background:', bgImage);
        console.log('  - Element details:', {
          tag: element.tagName,
          id: element.id,
          classes: element.className,
          innerHTML: element.innerHTML.substring(0, 200) + '...'
        });
      }
    }
  });
  
  console.log('Total background images:', bgCount);
}

// Run immediately if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded - running immediate checks...');
    checkImagesNow();
    checkBackgroundsNow();
  });
} else {
  console.log('📄 DOM already ready - running immediate checks...');
  checkImagesNow();
  checkBackgroundsNow();
}

// Also run after delays to catch dynamic content
setTimeout(() => {
  console.log('\n⏰ TIMEOUT CHECK (1s)');
  checkImagesNow();
  checkBackgroundsNow();
}, 1000);

setTimeout(() => {
  console.log('\n⏰ TIMEOUT CHECK (3s)');
  checkImagesNow();
  checkBackgroundsNow();
  
  // Check for content visibility issues
  console.log('\n🔍 === CONTENT VISIBILITY CHECK ===');
  
  const body = document.body;
  const bodyText = body.textContent.trim();
  const visibleElements = document.querySelectorAll('*:not(script):not(style)').length;
  const hiddenElements = document.querySelectorAll('[style*="opacity: 0"], [style*="opacity:0"]');
  const mainContent = document.querySelector('main, .hero, h1');
  
  console.log('Body text length:', bodyText.length);
  console.log('Visible elements count:', visibleElements);
  console.log('Hidden elements (opacity:0):', hiddenElements.length);
  console.log('Main content found:', !!mainContent);
  console.log('Body text preview:', bodyText.substring(0, 200) + '...');
  
  // Check for Electron detection
  console.log('Window.electronAPI exists:', !!window.electronAPI);
  console.log('Body data-electron attribute:', document.body.getAttribute('data-electron'));
  console.log('Body has data-electron class/attribute:', document.body.hasAttribute('data-electron'));
  
  // Force set the attribute if running in Electron and it's not set
  if (window.electronAPI && !document.body.hasAttribute('data-electron')) {
    console.log('🔧 Manually setting data-electron attribute...');
    document.body.setAttribute('data-electron', 'true');
    console.log('✅ data-electron attribute set to:', document.body.getAttribute('data-electron'));
  }
  
  // Check for React hydration issues
  console.log('React available:', typeof window.React);
  console.log('ReactDOM available:', typeof window.ReactDOM);
  
  // Check for elements that should be visible
  const heroText = document.querySelector('h1');
  const heroButton = document.querySelector('button');
  const heroForm = document.querySelector('form');
  
  console.log('Hero text (h1) found:', !!heroText);
  console.log('Hero button found:', !!heroButton);
  console.log('Hero form found:', !!heroForm);
  
  if (heroText) {
    const heroStyle = window.getComputedStyle(heroText);
    console.log('Hero text styles:');
    console.log('  - Opacity:', heroStyle.opacity);
    console.log('  - Visibility:', heroStyle.visibility);
    console.log('  - Display:', heroStyle.display);
    console.log('  - Color:', heroStyle.color);
  }
  
  // Log any hydration errors and fix them if in Electron
  hiddenElements.forEach((el, index) => {
    if (index < 3) { // Only log first 3 to avoid spam
      console.log(`Hidden element ${index + 1}:`, el.tagName, el.className);
    }
    
    // If we're in Electron, force all hidden elements to be visible
    if (window.electronAPI) {
      console.log(`🔧 Fixing opacity for hidden element ${index + 1}...`);
      el.style.opacity = '1';
      el.style.transform = 'none';
      console.log(`✅ Element ${index + 1} opacity set to:`, el.style.opacity);
    }
  });
  
  // Extra aggressive fix for Electron - force visibility on common motion containers
  if (window.electronAPI) {
    console.log('🔧 Applying aggressive Electron fixes...');
    
    // Fix main content container
    const mainContainer = document.querySelector('.max-w-3xl.mx-auto.w-full.flex-1.flex.flex-col.justify-center');
    if (mainContainer) {
      mainContainer.style.opacity = '1';
      console.log('✅ Fixed main container opacity');
    }
    
    // Fix footer
    const footer = document.querySelector('footer[style*="opacity:0"]');
    if (footer) {
      footer.style.opacity = '1';
      console.log('✅ Fixed footer opacity');
    }
    
    // Fix any divs with transform styles
    const transformElements = document.querySelectorAll('div[style*="transform:"]');
    transformElements.forEach((el, index) => {
      el.style.transform = 'none';
      console.log(`✅ Fixed transform for element ${index + 1}`);
    });
    
    // Force visibility on all elements with opacity: 0
    const allHiddenElements = document.querySelectorAll('*[style*="opacity:0"], *[style*="opacity: 0"]');
    allHiddenElements.forEach((el, index) => {
      el.style.opacity = '1';
      console.log(`✅ Force-fixed opacity for element ${index + 1}`);
    });
    
    console.log('🎉 All Electron visibility fixes applied!');
  }
  
}, 3000);

console.log('🚀 SIMPLE DEBUG SETUP COMPLETE');