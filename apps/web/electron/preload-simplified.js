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
  selectFile: () => ipcRenderer.invoke('select-file'),
  exportVideo: (data) => ipcRenderer.invoke('export-video', data),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getProjectsDirectory: () => ipcRenderer.invoke('get-projects-directory'),
  getUserPreferences: () => ipcRenderer.invoke('get-user-preferences'),
  saveUserPreferences: (preferences) => ipcRenderer.invoke('save-user-preferences', preferences),
  saveProjectData: (projectId, data) => ipcRenderer.invoke('save-project-data', projectId, data),
  loadProjectData: (projectId) => ipcRenderer.invoke('load-project-data', projectId),
});

console.log('✅ [ELECTRON] IPC bridge established');

// PHASE 3: Intercept <a> / Link clicks, rewrite to app:// paths
try {
  // Path completion function - fix navigation to correct HTML files
  const fixElectronPath = (url) => {
    if (!url || url.startsWith('http') || url.startsWith('app://')) {
      return url;
    }
    
    // Get base path of current directory
    const currentDir = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
    
    // Handle absolute paths /projects -> projects.html
    if (url.startsWith('/')) {
      const cleanPath = url.substring(1);
      return cleanPath ? `${currentDir}/${cleanPath}.html` : window.location.href;
    }
    
    // Handle relative paths ./projects -> projects.html
    if (url.startsWith('./')) {
      const cleanPath = url.substring(2);
      return cleanPath ? `${currentDir}/${cleanPath}.html` : window.location.href;
    }
    
    // Handle direct paths projects -> projects.html
    if (!url.includes('.') && !url.includes('/')) {
      return `${currentDir}/${url}.html`;
    }
    
    return url;
  };

  // Create navigation handler with path completion
  const handleNavigation = (url) => {
    console.log('🔄 [ELECTRON] Navigation requested to:', url);
    const fixedUrl = fixElectronPath(url);
    console.log('🔄 [ELECTRON] Fixed navigation URL:', fixedUrl);
    window.location.href = fixedUrl;
  };
  
  // Apply same path completion to location.assign/replace
  const originalAssign = window.location.assign;
  const originalReplace = window.location.replace;
  
  window.location.assign = function(url) {
    const fixedUrl = fixElectronPath(url);
    console.log('🔄 [ELECTRON] location.assign:', url, '→', fixedUrl);
    return originalAssign.call(this, fixedUrl);
  };
  
  window.location.replace = function(url) {
    const fixedUrl = fixElectronPath(url);
    console.log('🔄 [ELECTRON] location.replace:', url, '→', fixedUrl);
    return originalReplace.call(this, fixedUrl);
  };
  
  // Note: history API override moved to NAV-FIX script to avoid conflicts
  console.log('🔄 [ELECTRON] History API handling delegated to NAV-FIX script');
  
  console.log('✅ [ELECTRON] Navigation and history patches applied');
} catch (e) {
  console.warn('⚠️ [ELECTRON] Could not apply navigation patches:', e);
}

// PHASE 4: Setup navigation fix
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔗 [ELECTRON] Setting up navigation fix...');
  
  // Always use inline navigation fix to avoid path resolution issues
  // The external script loading was unreliable due to complex path calculations
  setupInlineNavigationFix();
});

// Inline navigation fix as fallback
function setupInlineNavigationFix() {
  console.log('🔗 [ELECTRON] Setting up inline navigation fix...');
  
  const currentDir = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
  
  function fixPath(url) {
    if (!url || url.startsWith('http') || (url.startsWith('file://') && url.includes('.html'))) {
      return url;
    }
    
    if (url.startsWith('./')) {
      const cleanPath = url.substring(2);
      return `${currentDir}/${cleanPath}.html`;
    }
    
    if (url.startsWith('/')) {
      const cleanPath = url.substring(1);
      return `${currentDir}/${cleanPath}.html`;
    }
    
    if (!url.includes('.') && !url.includes('/')) {
      return `${currentDir}/${url}.html`;
    }
    
    return url;
  }
  
  // Intercept click events
  document.addEventListener('click', (event) => {
    const target = event.target.closest('a');
    if (!target) return;
    
    const href = target.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }
    
    if (href.startsWith('/') || href.startsWith('./') || (!href.includes('://') && !href.includes('.'))) {
      event.preventDefault();
      const fixedUrl = fixPath(href);
      console.log('🔗 [ELECTRON] Link click intercepted:', href, '→', fixedUrl);
      window.location.href = fixedUrl;
    }
  }, true);
  
  // Expose fix function
  window.fixElectronPath = fixPath;
  
  console.log('✅ [ELECTRON] Inline navigation fix ready');
}

console.log('✅ [ELECTRON] Simplified preload script ready');
console.log('📍 [ELECTRON] Current location:', window.location.href);
console.log('🎯 [ELECTRON] ElectronAPI available:', !!window.electronAPI);