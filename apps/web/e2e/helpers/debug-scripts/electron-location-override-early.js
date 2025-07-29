// Early location fix for Electron
// This script must be injected before any Next.js/React code runs

(function() {
  'use strict';
  
  console.log('[ELECTRON LOCATION FIX] Starting location patch...');
  
  // Store original methods
  const originalAssign = window.location.assign;
  const originalReplace = window.location.replace;
  
  // Shared URL handling logic
  function handleUrl(url, method) {
    console.log(`[ELECTRON LOCATION FIX] location.${method} called with:`, url);
    try {
      if (!url) return;
      
      if (url.startsWith('file://') || url.startsWith('http://') || url.startsWith('https://')) {
        // Absolute URL
        window.location.href = url;
      } else if (url.startsWith('/')) {
        // Absolute path
        const base = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        window.location.href = base + url;
      } else {
        // Relative path
        const base = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
        window.location.href = base + '/' + url;
      }
    } catch (e) {
      console.error(`[ELECTRON LOCATION FIX] Error in location.${method}:`, e);
      // Fallback to href
      window.location.href = url;
    }
  }
  
  // Override location.assign
  Object.defineProperty(window.location, 'assign', {
    value: function(url) {
      handleUrl(url, 'assign');
    },
    writable: false,
    enumerable: true,
    configurable: false
  });
  
  // Override location.replace
  Object.defineProperty(window.location, 'replace', {
    value: function(url) {
      handleUrl(url, 'replace');
    },
    writable: false,
    enumerable: true,
    configurable: false
  });
  
  console.log('[ELECTRON LOCATION FIX] Location patch applied successfully');
  
  // Also patch any attempts to redefine these properties
  const defineProperty = Object.defineProperty;
  Object.defineProperty = function(obj, prop, descriptor) {
    if (obj === window.location && (prop === 'assign' || prop === 'replace')) {
      console.warn('[ELECTRON LOCATION FIX] Blocked attempt to redefine location.' + prop);
      return obj;
    }
    return defineProperty.call(this, obj, prop, descriptor);
  };
  
})();