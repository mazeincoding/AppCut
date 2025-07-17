const { app, BrowserWindow, ipcMain } = require('electron');
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

  // Try to load built Next.js app - use file:// protocol
  const unpackedPath = path.join(__dirname, '../out/index.html');
  const staticPath = path.join(__dirname, '../electron-app.html');
  
  let startUrl;
  if (fs.existsSync(unpackedPath)) {
    startUrl = `file://${unpackedPath}`;
    console.log('📦 Loading built Next.js app from:', unpackedPath);
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
        'Content-Security-Policy': ['default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' data: file: blob:; img-src \'self\' data: file: blob: https:; media-src \'self\' data: file: blob:; style-src \'self\' \'unsafe-inline\' data: file:; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\';']
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

  // Handle new window requests (open in default browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log('🌐 Opening external URL in browser:', url);
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  // Test IPC
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('🎯 Page loaded - Testing Electron IPC...');
    mainWindow.webContents.executeJavaScript(`
      if (window.electronAPI) {
        window.electronAPI.ping().then(result => {
          console.log('✅ IPC Test successful:', result);
        });
      } else {
        console.log('❌ Electron API not available');
      }
    `);
  });
}

app.whenReady().then(() => {
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