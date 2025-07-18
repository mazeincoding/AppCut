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
}, 3000);

console.log('🚀 SIMPLE DEBUG SETUP COMPLETE');