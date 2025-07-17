const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

// Window state management
let windowState = {
  width: 1400,
  height: 1000,
  x: undefined,
  y: undefined,
  isMaximized: false
};

function saveWindowState() {
  if (!mainWindow) return;
  
  const bounds = mainWindow.getBounds();
  windowState = {
    ...bounds,
    isMaximized: mainWindow.isMaximized()
  };
  
  try {
    const configPath = path.join(app.getPath('userData'), 'window-state.json');
    fs.writeFileSync(configPath, JSON.stringify(windowState, null, 2));
  } catch (error) {
    console.log('Failed to save window state:', error);
  }
}

function loadWindowState() {
  try {
    const configPath = path.join(app.getPath('userData'), 'window-state.json');
    if (fs.existsSync(configPath)) {
      const savedState = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      windowState = { ...windowState, ...savedState };
    }
  } catch (error) {
    console.log('Failed to load window state:', error);
  }
}

// Handle GPU issues in headless environments
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--no-sandbox');

let mainWindow;

function createMainWindow() {
  // Load saved window state
  loadWindowState();
  
  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      allowRunningInsecureContent: true,
      webSecurity: false, // Allow local file access
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Try to load built Next.js app - use custom app:// protocol
  const unpackedPath = path.join(__dirname, '../out/index.html');
  const staticPath = path.join(__dirname, '../electron-app.html');
  
  let startUrl;
  if (fs.existsSync(unpackedPath)) {
    startUrl = 'app://index.html';
    console.log('📦 Loading built Next.js app via app:// protocol');
  } else {
    startUrl = `file://${staticPath}`;
    console.log('📄 Loading static HTML fallback');
  }
  
  mainWindow.loadURL(startUrl);

  // Configure CSP and security headers for local file access
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' data: file: blob: https:; img-src \'self\' data: file: blob: https:; media-src \'self\' data: file: blob:; style-src \'self\' \'unsafe-inline\' data: file: https:; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https:; connect-src \'self\' https: ws: wss: http: data: blob:; font-src \'self\' data: file: https:;']
      }
    });
  });

  mainWindow.once('ready-to-show', () => {
    console.log('✅ Electron window ready - OpenCut loaded successfully');
    
    // Restore window state
    if (windowState.isMaximized) {
      mainWindow.maximize();
    }
    
    mainWindow.show();
  });

  // Save window state on close
  mainWindow.on('close', () => {
    saveWindowState();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Save window state on resize/move
  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized()) {
      saveWindowState();
    }
  });

  mainWindow.on('move', () => {
    if (!mainWindow.isMaximized()) {
      saveWindowState();
    }
  });

  // Handle navigation for Next.js router support
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow navigation to local files and same origin
    if (url.startsWith('file://') || url.startsWith(startUrl)) {
      console.log('🔗 Allowing navigation to:', url);
    } else {
      console.log('🚫 Blocking external navigation to:', url);
      event.preventDefault();
    }
  });
  
  // Note: Removed all request interception to allow proper file loading
  // RSC .txt requests will show 404 errors but won't affect functionality

  // Handle new window requests (open in default browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log('🌐 Opening external URL in browser:', url);
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  // Test IPC and storage
  // Forward renderer console logs to main process
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levelStr = ['verbose', 'info', 'warning', 'error'][level] || 'unknown';
    console.log(`[RENDERER ${levelStr.toUpperCase()}] ${message}`);
    if (sourceId) {
      console.log(`  Source: ${sourceId}:${line}`);
    }
  });

  // Capture JavaScript errors
  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('❌ Renderer process crashed:', { killed });
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('❌ Renderer process gone:', details);
  });

  mainWindow.webContents.once('did-finish-load', () => {
    console.log('🎯 Page loaded - Testing Electron IPC and storage...');
    mainWindow.webContents.executeJavaScript(`
      // Set up error capturing first
      window.addEventListener('error', (event) => {
        console.error('❌ JavaScript Error:', event.error);
        console.error('  Message:', event.message);
        console.error('  File:', event.filename);
        console.error('  Line:', event.lineno);
        console.error('  Column:', event.colno);
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        console.error('❌ Unhandled Promise Rejection:', event.reason);
      });
      
      // Check basic React setup
      console.log('🔍 React setup check...');
      console.log('- React:', typeof React !== 'undefined' ? 'available' : 'not available');
      console.log('- ReactDOM:', typeof ReactDOM !== 'undefined' ? 'available' : 'not available');
      console.log('- Next.js:', typeof window.__NEXT_DATA__ !== 'undefined' ? 'available' : 'not available');
      
      if (window.electronAPI) {
        window.electronAPI.ping().then(result => {
          console.log('✅ IPC Test successful:', result);
        });
      } else {
        console.log('❌ Electron API not available');
      }
      
      // Test storage APIs
      console.log('🔍 Storage API availability:');
      console.log('- IndexedDB:', 'indexedDB' in window);
      console.log('- Navigator.storage:', 'storage' in navigator);
      console.log('- OPFS getDirectory:', 'storage' in navigator && 'getDirectory' in navigator.storage);
      
      // Test storage service
      setTimeout(() => {
        console.log('🔍 Storage service initialization test...');
        if (window.storageService) {
          console.log('- Storage service available');
          console.log('- IndexedDB supported:', window.storageService.isIndexedDBSupported());
          console.log('- OPFS supported:', window.storageService.isOPFSSupported());
          console.log('- Fully supported:', window.storageService.isFullySupported());
        } else {
          console.log('❌ Storage service not available');
        }
      }, 2000);
    `);
  });
}

app.whenReady().then(() => {
  // Register custom protocol to serve static files
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.substr(6); // Remove 'app://' prefix
    const filePath = path.join(__dirname, '../out', url);
    
    // Security check - ensure the path is within the out directory
    const normalizedPath = path.normalize(filePath);
    const outDir = path.normalize(path.join(__dirname, '../out'));
    
    if (!normalizedPath.startsWith(outDir)) {
      callback({ error: -6 }); // FILE_NOT_FOUND
      return;
    }
    
    callback({ path: normalizedPath });
  });
  
  createMainWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

// IPC handlers
ipcMain.handle('ping', () => {
  console.log('📡 Received ping from renderer process');
  return 'pong from Electron main process';
});

// User data and preferences
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('get-projects-directory', () => {
  return path.join(app.getPath('documents'), 'OpenCut Projects');
});

ipcMain.handle('get-user-preferences', () => {
  try {
    const preferencesPath = path.join(app.getPath('userData'), 'preferences.json');
    if (fs.existsSync(preferencesPath)) {
      return JSON.parse(fs.readFileSync(preferencesPath, 'utf8'));
    }
    return null;
  } catch (error) {
    console.error('Failed to load user preferences:', error);
    return null;
  }
});

ipcMain.handle('save-user-preferences', (event, preferences) => {
  try {
    const preferencesPath = path.join(app.getPath('userData'), 'preferences.json');
    fs.writeFileSync(preferencesPath, JSON.stringify(preferences, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Failed to save user preferences:', error);
    return { success: false, error: error.message };
  }
});

// Project data management
ipcMain.handle('save-project-data', (event, projectId, data) => {
  try {
    const projectsDir = path.join(app.getPath('documents'), 'OpenCut Projects');
    if (!fs.existsSync(projectsDir)) {
      fs.mkdirSync(projectsDir, { recursive: true });
    }
    
    const projectPath = path.join(projectsDir, `${projectId}.json`);
    fs.writeFileSync(projectPath, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Failed to save project data:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-project-data', (event, projectId) => {
  try {
    const projectPath = path.join(app.getPath('documents'), 'OpenCut Projects', `${projectId}.json`);
    if (fs.existsSync(projectPath)) {
      return JSON.parse(fs.readFileSync(projectPath, 'utf8'));
    }
    return null;
  } catch (error) {
    console.error('Failed to load project data:', error);
    return null;
  }
});

console.log('🚀 Electron app starting...');