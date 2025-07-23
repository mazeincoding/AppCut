// =================== ELECTRON FONT FIX ===================
// This module fixes Next.js font optimization for Electron static exports
// by converting absolute font paths to relative paths at runtime

export function fixElectronFontPaths() {
  if (typeof window === 'undefined' || !window.electronAPI) {
    return;
  }

  console.log('🔧 [ELECTRON-FONT-FIX] Starting runtime font path fixing...');

  // Function to fix font paths in style elements
  const fixStyleElement = (styleElement: HTMLStyleElement) => {
    try {
      let cssText = styleElement.textContent || styleElement.innerHTML || '';
      let modified = false;

      // Fix @font-face src URLs with absolute paths
      const fontFaceRegex = /@font-face\s*{[^}]*}/g;
      cssText = cssText.replace(fontFaceRegex, (fontFaceBlock) => {
        return fontFaceBlock.replace(
          /src:\s*url\(["']?\/(.*?)["']?\)/g,
          (match, path) => {
            modified = true;
            console.log(`  🎯 [ELECTRON-FONT-FIX] Fixed font path: /${path} → ${path}`);
            return `src: url("${path}")`;
          }
        );
      });

      // Fix any other absolute URL references to font files
      cssText = cssText.replace(
        /url\(["']?\/(.*?\.(woff2?|ttf|eot|otf))["']?\)/g,
        (match, path) => {
          modified = true;
          console.log(`  🎯 [ELECTRON-FONT-FIX] Fixed font URL: /${path} → ./${path}`);
          return `url("./${path}")`;
        }
      );
      
      // Fix _next/static font paths specifically
      cssText = cssText.replace(
        /url\(["']?\/_next\/static\/media\/(.*?\.(woff2?|ttf|eot|otf))["']?\)/g,
        (match, filename) => {
          modified = true;
          console.log(`  🎯 [ELECTRON-FONT-FIX] Fixed _next font: /_next/static/media/${filename} → ./_next/static/media/${filename}`);
          return `url("./_next/static/media/${filename}")`;
        }
      );

      if (modified) {
        styleElement.textContent = cssText;
        console.log('  ✅ [ELECTRON-FONT-FIX] Style element updated');
      }
    } catch (error) {
      console.error('  ❌ [ELECTRON-FONT-FIX] Error fixing style element:', error);
    }
  };

  // Function to fix font preload links
  const fixFontPreloadLinks = () => {
    const fontLinks = document.querySelectorAll('link[rel="preload"][as="font"]');
    let fixedCount = 0;

    fontLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/')) {
        link.setAttribute('href', href.substring(1));
        fixedCount++;
        console.log(`  🎯 [ELECTRON-FONT-FIX] Fixed preload link: ${href} → ${href.substring(1)}`);
      }
    });

    if (fixedCount > 0) {
      console.log(`  ✅ [ELECTRON-FONT-FIX] Fixed ${fixedCount} font preload links`);
    }
  };

  // Fix existing style elements
  const styleElements = document.querySelectorAll('style');
  console.log(`📄 [ELECTRON-FONT-FIX] Found ${styleElements.length} style elements to check`);
  
  styleElements.forEach((style, index) => {
    if (style.textContent && style.textContent.includes('@font-face')) {
      console.log(`  🔍 [ELECTRON-FONT-FIX] Processing style element ${index + 1} with @font-face rules`);
      fixStyleElement(style as HTMLStyleElement);
    }
  });

  // Fix font preload links
  fixFontPreloadLinks();

  // Watch for new style elements added dynamically
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === 'STYLE') {
          const styleElement = node as HTMLStyleElement;
          if (styleElement.textContent && styleElement.textContent.includes('@font-face')) {
            console.log('  🔍 [ELECTRON-FONT-FIX] New style element detected with @font-face');
            fixStyleElement(styleElement);
          }
        } else if (node.nodeName === 'LINK') {
          const linkElement = node as HTMLLinkElement;
          if (linkElement.rel === 'preload' && linkElement.as === 'font') {
            const href = linkElement.getAttribute('href');
            if (href && href.startsWith('/')) {
              linkElement.setAttribute('href', href.substring(1));
              console.log(`  🎯 [ELECTRON-FONT-FIX] Fixed new preload link: ${href} → ${href.substring(1)}`);
            }
          }
        }
      });
    });
  });

  observer.observe(document.head, {
    childList: true,
    subtree: true
  });

  console.log('✅ [ELECTRON-FONT-FIX] Runtime font path fixing initialized');
  console.log('👀 [ELECTRON-FONT-FIX] Watching for new style elements...');

  // Return cleanup function
  return () => {
    observer.disconnect();
    console.log('🛑 [ELECTRON-FONT-FIX] Font path observer disconnected');
  };
}

// Auto-initialize if in Electron environment
if (typeof window !== 'undefined' && window.electronAPI) {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixElectronFontPaths);
  } else {
    // DOM is already ready
    fixElectronFontPaths();
  }
}