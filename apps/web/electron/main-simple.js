const { app, BrowserWindow, ipcMain, protocol, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Window state management
let windowState = {
  width: 1400,
  height: 1000,
  x: 100, // Force position on screen
  y: 100,
  isMaximized: false
};

function resetWindowState() {
  try {
    const configPath = path.join(app.getPath('userData'), 'window-state.json');
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      console.log('🗑️ Deleted problematic window state file');
    }
  } catch (error) {
    console.log('Failed to delete window state:', error);
  }
}

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

function ensureWindowOnScreen(windowState) {
  // Get primary display bounds
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const { x: screenX, y: screenY } = primaryDisplay.workArea;
  
  console.log('🖥️ Screen bounds:', { screenWidth, screenHeight, screenX, screenY });
  console.log('🪟 Window state before validation:', windowState);
  
  // Ensure window is not off-screen
  if (windowState.x < screenX || windowState.x > screenX + screenWidth - 200) {
    console.log('⚠️ Window X position off-screen, resetting to center');
    windowState.x = Math.max(screenX, Math.floor((screenWidth - windowState.width) / 2));
  }
  
  if (windowState.y < screenY || windowState.y > screenY + screenHeight - 100) {
    console.log('⚠️ Window Y position off-screen, resetting to center');
    windowState.y = Math.max(screenY, Math.floor((screenHeight - windowState.height) / 2));
  }
  
  // Ensure window dimensions are reasonable
  if (windowState.width > screenWidth) {
    windowState.width = Math.floor(screenWidth * 0.9);
  }
  
  if (windowState.height > screenHeight) {
    windowState.height = Math.floor(screenHeight * 0.9);
  }
  
  console.log('✅ Window state after validation:', windowState);
  return windowState;
}

// Handle GPU issues in headless environments
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--no-sandbox');

let mainWindow;

function createMainWindow() {
  // Check if we should reset window state (for debugging off-screen issues)
  if (process.argv.includes('--reset-window')) {
    console.log('🔄 Resetting window state due to --reset-window flag');
    resetWindowState();
  }
  
  // Load saved window state and ensure it's on screen
  loadWindowState();
  const validatedState = ensureWindowOnScreen(windowState);
  
  console.log('🚀 Creating window with state:', validatedState);
  
  mainWindow = new BrowserWindow({
    width: validatedState.width,
    height: validatedState.height,
    x: validatedState.x,
    y: validatedState.y,
    show: true, // Show immediately for debugging
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
  
  console.log('🚀 Loading URL:', startUrl);
  mainWindow.loadURL(startUrl);
  
  // Add more debugging events
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('📥 Started loading content...');
  });
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ Failed to load:', errorCode, errorDescription, validatedURL);
    // Show window anyway so user can see what happened
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
  });
  
  // Inject simple debug script for image investigation
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('🔧 Page finished loading - injecting simple debug script...');
    try {
      const debugScript = fs.readFileSync(path.join(__dirname, 'simple-debug.js'), 'utf8');
      mainWindow.webContents.executeJavaScript(debugScript).then(() => {
        console.log('✅ Simple debug script injected successfully');
      }).catch(err => {
        console.error('❌ Simple debug script injection failed:', err);
      });
    } catch (error) {
      console.error('❌ Failed to read simple debug script:', error);
    }
  });

  // Configure CSP and security headers for local file access with app:// protocol
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ['default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' data: file: blob: https: app:; img-src \'self\' data: file: blob: https: app:; media-src \'self\' data: file: blob: app:; style-src \'self\' \'unsafe-inline\' data: file: https: app:; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https: app:; connect-src \'self\' https: ws: wss: http: data: blob: app:; font-src \'self\' data: file: https: app:; manifest-src \'self\' app:;']
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
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setAlwaysOnTop(false); // Bring to front then allow normal behavior
  });

  // Fallback: Show window after 3 seconds even if ready-to-show doesn't fire
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('⚠️ Window not visible after 3s, forcing show...');
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setAlwaysOnTop(false);
    }
  }, 3000);

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
  // Register custom protocol to serve static files with comprehensive debugging
  protocol.registerFileProtocol('app', (request, callback) => {
    console.log('\n🔍 === PROTOCOL DEBUG START ===');
    console.log('📥 Raw request URL:', request.url);
    
    let url = request.url.substr(6); // Remove 'app://' prefix
    console.log('🔧 URL after prefix removal:', url);
    
    // Handle root requests
    if (url === '' || url === '/') {
      url = 'index.html';
      console.log('🏠 Root request, redirecting to:', url);
    }
    
    // Decode URL to handle special characters
    const decodedUrl = decodeURIComponent(url);
    console.log('🔓 URL after decoding:', decodedUrl);
    url = decodedUrl;
    
    // Remove leading slash if present
    if (url.startsWith('/')) {
      url = url.substr(1);
      console.log('✂️ URL after slash removal:', url);
    }
    
    const filePath = path.join(__dirname, '../out', url);
    console.log('📁 Constructed file path:', filePath);
    
    // Security check - ensure the path is within the out directory
    const normalizedPath = path.normalize(filePath);
    const outDir = path.normalize(path.join(__dirname, '../out'));
    console.log('🔒 Normalized path:', normalizedPath);
    console.log('🔒 Out directory:', outDir);
    
    if (!normalizedPath.startsWith(outDir)) {
      console.error('🚫 Security check failed!');
      console.error('   Path:', normalizedPath);
      console.error('   Expected prefix:', outDir);
      callback({ error: -6 }); // FILE_NOT_FOUND
      return;
    }
    
    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      console.error('❌ File not found!');
      console.error('   Requested URL:', request.url);
      console.error('   Final path:', normalizedPath);
      
      // List directory contents for debugging
      const dirPath = path.dirname(normalizedPath);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        console.error('📂 Directory contents:', files);
      }
      
      callback({ error: -6 }); // FILE_NOT_FOUND
      return;
    }
    
    // Get file stats for debugging
    const stats = fs.statSync(normalizedPath);
    const ext = path.extname(normalizedPath).toLowerCase();
    
    console.log('📊 File stats:');
    console.log('   - Size:', stats.size, 'bytes');
    console.log('   - Extension:', ext);
    console.log('   - Modified:', stats.mtime.toISOString());
    
    // Special debugging for image files
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) {
      console.log('🖼️ IMAGE FILE DETECTED:');
      console.log('   - File:', url);
      console.log('   - Size:', stats.size, 'bytes');
      
      // Read first few bytes to verify image header
      const buffer = fs.readFileSync(normalizedPath);
      const header = buffer.slice(0, 8);
      console.log('   - Header bytes:', Array.from(header).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
      
      if (ext === '.png') {
        const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        console.log('   - PNG header valid:', buffer.slice(0, 8).equals(pngHeader));
      }
    }
    
    console.log('✅ Serving file successfully');
    console.log('🔍 === PROTOCOL DEBUG END ===\n');
    
    // Use simple file path response - let Electron handle MIME types
    callback({ 
      path: normalizedPath
    });
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