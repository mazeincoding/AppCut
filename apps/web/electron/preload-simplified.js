const { contextBridge, ipcRenderer } = require('electron');

// === SIMPLE PRELOAD: Minimal blocking for Electron static export ===
console.log('🚀 [ELECTRON] Simplified preload script loading...');

// PHASE 1: Apply minimal patches for Electron compatibility
try {
  // Only block file:// protocol JSON requests that cause errors
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || input.toString();
    
    // Only block problematic file:// JSON requests
    if (url && url.startsWith('file://') && url.includes('.json')) {
      console.log('🚫 [ELECTRON] Blocking file:// JSON request:', url);
      return Promise.reject(new Error('File protocol JSON requests not supported'));
    }
    
    return originalFetch.apply(this, arguments);
  };
  
  console.log('✅ [ELECTRON] Minimal fetch patching applied');
} catch (e) {
  console.warn('⚠️ [ELECTRON] Could not apply fetch patch:', e);
}

// PHASE 2: Set up IPC for Electron communication
contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getProjectsDirectory: () => ipcRenderer.invoke('get-projects-directory'),
  getUserPreferences: () => ipcRenderer.invoke('get-user-preferences'),
  saveUserPreferences: (preferences) => ipcRenderer.invoke('save-user-preferences', preferences),
  saveProjectData: (projectId, data) => ipcRenderer.invoke('save-project-data', projectId, data),
  loadProjectData: (projectId) => ipcRenderer.invoke('load-project-data', projectId),
});

console.log('✅ [ELECTRON] IPC bridge established');

// PHASE 3: Handle location patches for navigation
try {
  const currentHref = window.location.href;
  
  // Create navigation handler
  const handleNavigation = (url) => {
    console.log('🔄 [ELECTRON] Navigation requested to:', url);
    
    // Handle relative paths for static export
    if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('app://')) {
      // For paths like '/projects', we need to append it correctly
      if (url.startsWith('/')) {
        // Get the base directory (remove index.html)
        const base = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
        const rootBase = base.substring(0, base.lastIndexOf('/out') + 4);
        url = rootBase + url + '/index.html';
      } else {
        const base = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
        url = base + '/' + url;
      }
    }
    
    console.log('🔄 [ELECTRON] Resolved navigation URL:', url);
    window.location.href = url;
  };
  
  // Patch location methods
  window._electronAssign = window.location.assign;
  window.location.assign = handleNavigation;
  
  window._electronReplace = window.location.replace;
  window.location.replace = handleNavigation;
  
  console.log('✅ [ELECTRON] Navigation patches applied');
} catch (e) {
  console.warn('⚠️ [ELECTRON] Could not apply navigation patches:', e);
}

console.log('✅ [ELECTRON] Simplified preload script ready');
console.log('📍 [ELECTRON] Current location:', window.location.href);
console.log('🎯 [ELECTRON] ElectronAPI available:', !!window.electronAPI);