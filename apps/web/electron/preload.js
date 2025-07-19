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

console.log('Electron preload script loaded');

// Fix for location.assign error in Electron
// Since we can't override location.assign directly, we'll monkey-patch any code that tries to use it
(() => {
  // Store the original href setter
  const originalHref = Object.getOwnPropertyDescriptor(window.location, 'href').set;
  
  // Create wrapper functions that use href instead
  window.__electronLocationAssign = function(url) {
    console.log('[ELECTRON] location.assign redirected to href:', url);
    if (!url) return;
    
    if (url.startsWith('file://') || url.startsWith('http://') || url.startsWith('https://')) {
      originalHref.call(window.location, url);
    } else if (url.startsWith('/')) {
      const base = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
      originalHref.call(window.location, base + url);
    } else {
      const base = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
      originalHref.call(window.location, base + '/' + url);
    }
  };
  
  window.__electronLocationReplace = window.__electronLocationAssign;
  
  // Patch any code that tries to access location.assign
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      // Override location.assign attempts
      const descriptor = Object.getOwnPropertyDescriptor(window.location, 'assign');
      if (!descriptor || descriptor.configurable !== false) {
        try {
          Object.defineProperty(window.location, 'assign', {
            value: window.__electronLocationAssign,
            writable: false,
            enumerable: true,
            configurable: false
          });
          Object.defineProperty(window.location, 'replace', {
            value: window.__electronLocationReplace,
            writable: false,
            enumerable: true,
            configurable: false
          });
        } catch (e) {
          // If that fails, at least make the functions available
          window.location.assign = window.__electronLocationAssign;
          window.location.replace = window.__electronLocationReplace;
        }
      }
    })();
  `;
  
  // Inject this as early as possible
  if (document.head) {
    document.head.insertBefore(script, document.head.firstChild);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.head.insertBefore(script, document.head.firstChild);
    });
  }
  
  console.log('[ELECTRON] Location patch prepared');
})();

// Add debugging to check when React loads
window.addEventListener('DOMContentLoaded', () => {
  console.log('🔍 DOM Content Loaded - Initial check:');
  console.log('- window.React:', typeof window.React);
  console.log('- window.ReactDOM:', typeof window.ReactDOM);
  console.log('- window.next:', typeof window.next);
  
  // Check again after a delay to see if bundles load
  setTimeout(() => {
    console.log('🔍 After delay check (2s):');
    console.log('- window.React:', typeof window.React);
    console.log('- window.ReactDOM:', typeof window.ReactDOM);
    console.log('- window.next:', typeof window.next);
    console.log('- document.querySelector("#__next"):', !!document.querySelector('#__next'));
    
    // Check if app actually rendered
    const appContent = document.querySelector('#__next');
    if (appContent && appContent.children.length > 0) {
      console.log('✅ Next.js app appears to be rendered');
      console.log('- Child elements:', appContent.children.length);
    } else {
      console.log('❌ Next.js app not rendered');
    }
  }, 2000);
});