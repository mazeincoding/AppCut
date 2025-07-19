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

// PHASE 3: 拦截 <a> / Link 点击，改写为 app://路径
try {
  // 路径补全函数
  const fixElectronPath = (url) => {
    if (!url || url.startsWith('http') || url.startsWith('app://') || url.startsWith('file://')) {
      return url;
    }
    
    // 对于相对路径，转换为正确的 HTML 文件路径
    if (url.startsWith('/')) {
      // 去掉开头的 /，然后添加正确的文件扩展名
      const cleanPath = url.substring(1);
      return cleanPath ? `file://${window.location.href.substring(0, window.location.href.lastIndexOf('/'))}/${cleanPath}.html` : window.location.href;
    }
    
    // 处理相对路径如 './projects'
    if (url.startsWith('./')) {
      const cleanPath = url.substring(2);
      return cleanPath ? `file://${window.location.href.substring(0, window.location.href.lastIndexOf('/'))}/${cleanPath}.html` : window.location.href;
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
  
  // 对 location.assign/replace 做同样的路径补全
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
  
  // 重载 history.pushState/replaceState，保持单页导航
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(state, title, url) {
    if (url) {
      const fixedUrl = fixElectronPath(url);
      console.log('🔄 [ELECTRON] history.pushState:', url, '→', fixedUrl);
      if (fixedUrl !== url && fixedUrl.startsWith('app://')) {
        // 如果需要跳转到不同的 HTML 文件，直接导航
        window.location.href = fixedUrl;
        return;
      }
    }
    return originalPushState.call(this, state, title, url);
  };
  
  history.replaceState = function(state, title, url) {
    if (url) {
      const fixedUrl = fixElectronPath(url);
      console.log('🔄 [ELECTRON] history.replaceState:', url, '→', fixedUrl);
      if (fixedUrl !== url && fixedUrl.startsWith('app://')) {
        // 如果需要跳转到不同的 HTML 文件，直接导航
        window.location.href = fixedUrl;
        return;
      }
    }
    return originalReplaceState.call(this, state, title, url);
  };
  
  console.log('✅ [ELECTRON] Navigation and history patches applied');
} catch (e) {
  console.warn('⚠️ [ELECTRON] Could not apply navigation patches:', e);
}

// PHASE 4: 拦截链接点击事件
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔗 [ELECTRON] Setting up link interception...');
  
  document.addEventListener('click', (event) => {
    const target = event.target.closest('a');
    if (!target) return;
    
    const href = target.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return; // 忽略锚点和特殊链接
    }
    
    // 拦截内部链接
    if (href.startsWith('/') || (!href.startsWith('http') && !href.startsWith('app://') && !href.startsWith('file://'))) {
      event.preventDefault();
      const fixedUrl = fixElectronPath(href);
      console.log('🔗 [ELECTRON] Link click intercepted:', href, '→', fixedUrl);
      window.location.href = fixedUrl;
    }
  }, true);
  
  console.log('✅ [ELECTRON] Link interception ready');
});

console.log('✅ [ELECTRON] Simplified preload script ready');
console.log('📍 [ELECTRON] Current location:', window.location.href);
console.log('🎯 [ELECTRON] ElectronAPI available:', !!window.electronAPI);