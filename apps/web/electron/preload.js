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