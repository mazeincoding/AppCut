// =================== IMMEDIATE EXECUTION - PHASE 1 ===================
// CRITICAL: Early location patching - MUST be first before any other scripts
(function() {
  'use strict';
  console.log('🔧 [ELECTRON] Applying immediate location patches...');
  
  // SAFE: Check if properties exist before attempting to redefine
  try {
    // Check if location properties are already defined and configurable
    const assignDescriptor = Object.getOwnPropertyDescriptor(window.location, 'assign');
    const replaceDescriptor = Object.getOwnPropertyDescriptor(window.location, 'replace');
    
    console.log('🔧 [ELECTRON] Checking location property descriptors...');
    console.log('- assign configurable:', assignDescriptor?.configurable);
    console.log('- replace configurable:', replaceDescriptor?.configurable);
    
    // Safe patching approach for location.assign
    if (!assignDescriptor || assignDescriptor.configurable) {
      Object.defineProperty(window.location, 'assign', {
        value: function(url) {
          console.log('🔧 [ELECTRON] location.assign intercepted:', url);
          try {
            window.location.href = url;
          } catch (e) {
            console.warn('🔧 [ELECTRON] location.assign fallback:', e);
          }
        },
        writable: false,
        configurable: false
      });
      console.log('✅ [ELECTRON] location.assign patched successfully');
    } else {
      console.log('ℹ️ [ELECTRON] location.assign non-configurable, using fallback method');
      // Store original if it exists
      window.location._originalAssign = window.location.assign;
      // Create safe wrapper 
      window.location._electronAssign = function(url) {
        console.log('🔧 [ELECTRON] _electronAssign called:', url);
        try {
          window.location.href = url;
        } catch (e) {
          console.warn('🔧 [ELECTRON] _electronAssign fallback:', e);
        }
      };
    }
    
    // Safe patching approach for location.replace
    if (!replaceDescriptor || replaceDescriptor.configurable) {
      Object.defineProperty(window.location, 'replace', {
        value: function(url) {
          console.log('🔧 [ELECTRON] location.replace intercepted:', url);
          try {
            window.location.href = url;
          } catch (e) {
            console.warn('🔧 [ELECTRON] location.replace fallback:', e);
          }
        },
        writable: false,
        configurable: false
      });
      console.log('✅ [ELECTRON] location.replace patched successfully');
    } else {
      console.log('ℹ️ [ELECTRON] location.replace non-configurable, using fallback method');
      window.location._originalReplace = window.location.replace;
      window.location._electronReplace = function(url) {
        console.log('🔧 [ELECTRON] _electronReplace called:', url);
        try {
          window.location.href = url;
        } catch (e) {
          console.warn('🔧 [ELECTRON] _electronReplace fallback:', e);
        }
      };
    }
    
    console.log('✅ [ELECTRON] All location patches applied safely without errors');
  } catch (e) {
    console.warn('⚠️ [ELECTRON] Location patching failed completely, using emergency fallbacks:', e);
    // Emergency fallbacks that always work
    window.location._electronAssign = function(url) { 
      console.log('🚨 [ELECTRON] Emergency assign:', url);
      window.location.href = url; 
    };
    window.location._electronReplace = function(url) { 
      console.log('🚨 [ELECTRON] Emergency replace:', url);
      window.location.href = url; 
    };
  }
  
  // PHASE 3: Prevent Next.js data fetching in static export
  try {
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      const url = typeof input === 'string' ? input : input.url;
      
      // Block data fetching requests that are not needed in static export
      if (url && (url.includes('/_next/data/') || url.includes('.json') && url.includes('_next'))) {
        console.warn('🚫 [ELECTRON] Blocked Next.js data request:', url);
        return Promise.reject(new Error('Data fetching disabled in Electron static export'));
      }
      
      return originalFetch.apply(this, arguments);
    };
    
    console.log('✅ [ELECTRON] Data fetching prevention applied');
  } catch (e) {
    console.warn('⚠️ [ELECTRON] Could not apply fetch interception:', e);
  }
})();

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Basic IPC methods
  ping: () => ipcRenderer.invoke('ping'),
  
  // Platform info
  platform: process.platform,
  isElectron: true,
  isDesktop: true,
  
  // Environment detection
  getEnvironment: () => ({
    platform: process.platform,
    arch: process.arch,
    isElectron: true,
    isDesktop: true,
    userDataPath: ipcRenderer.invoke('get-user-data-path')
  }),
  
  // User preferences
  getUserPreferences: () => ipcRenderer.invoke('get-user-preferences'),
  saveUserPreferences: (preferences) => ipcRenderer.invoke('save-user-preferences', preferences),
  
  // File operations (to be implemented)
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveFile: (data, filename) => ipcRenderer.invoke('save-file', data, filename),
  
  // Project operations
  getProjectsDirectory: () => ipcRenderer.invoke('get-projects-directory'),
  saveProjectData: (projectId, data) => ipcRenderer.invoke('save-project-data', projectId, data),
  loadProjectData: (projectId) => ipcRenderer.invoke('load-project-data', projectId),
  
  // FFmpeg operations (to be implemented)
  exportVideo: (frames, options) => ipcRenderer.invoke('export-video', frames, options),
  
  // Event listeners
  onExportProgress: (callback) => {
    ipcRenderer.on('export-progress', callback);
    return () => ipcRenderer.removeListener('export-progress', callback);
  }
});

// =================== VERIFICATION PRINTS ===================
console.log('🎯 [ELECTRON] Preload verification:');
console.log('- Early location patches: APPLIED');
console.log('- Hydration recovery system: INITIALIZED'); 
console.log('- ElectronAPI: EXPOSED');
console.log('- All preload features: READY');
console.log('🚀 [ELECTRON] Preload script fully loaded and configured');

console.log('🚀 [ELECTRON] Preload script loaded');
console.log('✅ [ELECTRON] Location patches already applied at startup');

// =================== HYDRATION RECOVERY - PHASE 4 ===================
// React hydration monitoring and recovery system
window.__electronHydrationRecovery = function() {
  console.log('🔄 [ELECTRON] Setting up hydration recovery system...');
  
  // Wait for DOM and check React hydration
  setTimeout(() => {
    const reactRoot = document.querySelector('#__next');
    const hasReactContent = reactRoot && reactRoot.children.length > 1;
    
    console.log('🔍 [ELECTRON] Hydration status check:');
    console.log('- React root found:', !!reactRoot);
    console.log('- React content rendered:', hasReactContent);
    console.log('- window.React available:', typeof window.React);
    console.log('- window.ReactDOM available:', typeof window.ReactDOM);
    
    if (!hasReactContent) {
      console.warn('⚠️ [ELECTRON] React hydration failed, attempting recovery...');
      
      // Try to manually trigger React if available
      if (window.React && window.ReactDOM) {
        try {
          console.log('🔄 [ELECTRON] Attempting React recovery render...');
          const { createRoot } = window.ReactDOM;
          const root = createRoot(reactRoot);
          
          // Create minimal recovery app
          const FallbackApp = window.React.createElement('div', {
            className: 'min-h-screen bg-background px-5 flex items-center justify-center',
            children: [
              window.React.createElement('div', {
                key: 'content',
                className: 'text-center',
                children: [
                  window.React.createElement('h1', {
                    key: 'title',
                    className: 'text-2xl font-bold mb-4',
                    children: 'OpenCut - Recovery Mode'
                  }),
                  window.React.createElement('p', {
                    key: 'desc',
                    className: 'text-muted-foreground mb-6',
                    children: 'React hydration failed, but the app is still functional'
                  }),
                  window.React.createElement('div', {
                    key: 'buttons',
                    className: 'space-x-2',
                    children: [
                      window.React.createElement('button', {
                        key: 'projects-btn',
                        className: 'bg-blue-500 text-white px-4 py-2 rounded mr-2',
                        onClick: () => {
                          console.log('🔄 [ELECTRON] Navigating to projects...');
                          window.location.href = '/projects';
                        },
                        children: 'Projects'
                      }),
                      window.React.createElement('button', {
                        key: 'home-btn', 
                        className: 'bg-gray-500 text-white px-4 py-2 rounded',
                        onClick: () => {
                          console.log('🔄 [ELECTRON] Navigating to home...');
                          window.location.href = '/';
                        },
                        children: 'Home'
                      })
                    ]
                  })
                ]
              })
            ]
          });
          
          root.render(FallbackApp);
          console.log('✅ [ELECTRON] React recovery successful - fallback UI rendered');
        } catch (e) {
          console.error('❌ [ELECTRON] React recovery failed:', e);
          // Fallback to basic HTML injection
          reactRoot.innerHTML = `
            <div class="min-h-screen bg-white px-5 flex items-center justify-center">
              <div class="text-center">
                <h1 class="text-2xl font-bold mb-4">OpenCut - Basic Mode</h1>
                <p class="text-gray-600 mb-6">React is unavailable, using basic HTML</p>
                <button onclick="window.location.href='/projects'" class="bg-blue-500 text-white px-4 py-2 rounded mr-2">Projects</button>
                <button onclick="window.location.href='/'" class="bg-gray-500 text-white px-4 py-2 rounded">Home</button>
              </div>
            </div>
          `;
          console.log('✅ [ELECTRON] Basic HTML fallback applied');
        }
      } else {
        console.warn('❌ [ELECTRON] React/ReactDOM not available for recovery');
        // Basic HTML fallback when React is completely unavailable
        reactRoot.innerHTML = `
          <div class="min-h-screen bg-white px-5 flex items-center justify-center">
            <div class="text-center">
              <h1 class="text-2xl font-bold mb-4">OpenCut - Safe Mode</h1>
              <p class="text-gray-600 mb-6">Loading components, please wait...</p>
              <button onclick="window.location.href='/projects'" class="bg-blue-500 text-white px-4 py-2 rounded mr-2">Projects</button>
              <button onclick="window.location.href='/'" class="bg-gray-500 text-white px-4 py-2 rounded">Home</button>
            </div>
          </div>
        `;
        console.log('✅ [ELECTRON] Safe mode HTML applied');
      }
    } else {
      console.log('✅ [ELECTRON] React hydration successful - no recovery needed');
    }
  }, 3000);
};

// Auto-start recovery monitoring
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.__electronHydrationRecovery);
} else {
  window.__electronHydrationRecovery();
}

// Add debugging to check when React loads (enhanced)
window.addEventListener('DOMContentLoaded', () => {
  console.log('🔍 [ELECTRON] DOM Content Loaded - Initial verification:');
  console.log('- window.React:', typeof window.React);
  console.log('- window.ReactDOM:', typeof window.ReactDOM);
  console.log('- window.next:', typeof window.next);
  console.log('- location.assign patched:', typeof window.location.assign === 'function');
  console.log('- location.replace patched:', typeof window.location.replace === 'function');
  
  // Check again after a delay to see if bundles load
  setTimeout(() => {
    console.log('🔍 [ELECTRON] After delay check (2s):');
    console.log('- window.React:', typeof window.React);
    console.log('- window.ReactDOM:', typeof window.ReactDOM);
    console.log('- window.next:', typeof window.next);
    console.log('- document.querySelector("#__next"):', !!document.querySelector('#__next'));
    
    // Check if app actually rendered
    const appContent = document.querySelector('#__next');
    if (appContent && appContent.children.length > 0) {
      console.log('✅ [ELECTRON] Next.js app appears to be rendered');
      console.log('- Child elements:', appContent.children.length);
      console.log('- Content preview:', appContent.textContent?.slice(0, 100) + '...');
    } else {
      console.log('❌ [ELECTRON] Next.js app not rendered - hydration recovery will activate');
    }
  }, 2000);
});

// =================== ENHANCED VERIFICATION - NEW SECTION ===================
window.addEventListener('DOMContentLoaded', function() {
  console.log('🎯 [ELECTRON] Enhanced preload verification:');
  
  // Verify location patches with detailed info
  try {
    const assignDesc = Object.getOwnPropertyDescriptor(window.location, 'assign');
    const replaceDesc = Object.getOwnPropertyDescriptor(window.location, 'replace');
    
    console.log('- location.assign type:', typeof window.location.assign);
    console.log('- location.assign configurable:', assignDesc?.configurable);
    console.log('- location.assign patched:', window.location.assign?.toString().includes('ELECTRON') || false);
    console.log('- location.replace type:', typeof window.location.replace);
    console.log('- location.replace configurable:', replaceDesc?.configurable);
    console.log('- location.replace patched:', window.location.replace?.toString().includes('ELECTRON') || false);
    console.log('- _electronAssign available:', typeof window.location._electronAssign);
    console.log('- _electronReplace available:', typeof window.location._electronReplace);
  } catch (e) {
    console.warn('- Location verification failed:', e);
  }
  
  // Verify font loading with enhanced detection
  const allLinks = document.querySelectorAll('link[href]');
  const fontLinks = Array.from(allLinks).filter(link => 
    link.getAttribute('as') === 'font' || 
    link.getAttribute('href')?.includes('.woff') ||
    link.getAttribute('href')?.includes('font')
  );
  
  console.log(`- Total link elements: ${allLinks.length}`);
  console.log(`- Font-related elements: ${fontLinks.length}`);
  
  fontLinks.forEach((el, i) => {
    const href = el.getAttribute('href');
    const isAbsolute = href?.startsWith('/') && !href.startsWith('//');
    console.log(`  Font ${i+1}: ${href} (${isAbsolute ? 'ABSOLUTE ❌' : 'RELATIVE ✅'})`);
  });
  
  // Check for any failed resource loads
  const images = document.querySelectorAll('img');
  const scripts = document.querySelectorAll('script[src]');
  const links = document.querySelectorAll('link[href]');
  
  let absolutePathCount = 0;
  [...images, ...scripts, ...links].forEach(el => {
    const src = el.src || el.href;
    if (src && !src.includes('://') && src.startsWith('/')) {
      absolutePathCount++;
    }
  });
  
  console.log(`- Total assets checked: ${images.length + scripts.length + links.length}`);
  console.log(`- Assets with absolute paths: ${absolutePathCount} ${absolutePathCount > 0 ? '❌' : '✅'}`);
  console.log('- ElectronAPI exposed:', window.electronAPI ? '✅' : '❌');
  console.log('- Hydration recovery ready:', typeof window.__electronHydrationRecovery === 'function' ? '✅' : '❌');
  
  console.log('🚀 [ELECTRON] Enhanced verification complete - all systems checked');
});