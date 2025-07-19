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
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:opencut', // Enable localStorage with persistent session
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false
    }
  });

  // Try to load built Next.js app - use custom app:// protocol
  const unpackedPath = path.join(__dirname, '../out/index.html');
  const staticPath = path.join(__dirname, '../electron-app.html');
  
  let startUrl;
  if (fs.existsSync(unpackedPath)) {
    // Use file:// protocol with relative paths (app:// protocol has issues)
    startUrl = `file://${unpackedPath}`;
    console.log('📦 Loading built Next.js app via file:// protocol with relative paths');
    console.log('📁 File path:', unpackedPath);
  } else {
    startUrl = `file://${staticPath}`;
    console.log('📄 Loading static HTML fallback');
  }
  
  console.log('🚀 Loading URL:', startUrl);
  
  // Remove session-level request interceptor for better performance
  // mainWindow.webContents.session.webRequest.onBeforeRequest((details, callback) => {
  //   console.log('🔍 Session request intercepted:', details.url);
  //   callback({});
  // });
  
  // Try to load the URL
  mainWindow.loadURL(startUrl).then(() => {
    console.log('✅ loadURL promise resolved');
  }).catch(error => {
    console.error('❌ loadURL promise rejected:', error);
  });
  
  // Open DevTools for debugging
  mainWindow.webContents.openDevTools();
  
  // Add more debugging events
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('📥 Started loading content...');
  });
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ Failed to load:', errorCode, errorDescription, validatedURL);
    console.error('❌ Error details:', {
      errorCode,
      errorDescription,
      validatedURL,
      currentURL: mainWindow.webContents.getURL()
    });
    // Show window anyway so user can see what happened
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
  });
  

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page finished loading successfully');
    // Inject a simple script to verify JavaScript is running
    mainWindow.webContents.executeJavaScript(`
      console.log('🚀 [ELECTRON INJECT] JavaScript execution test');
      console.log('🚀 [ELECTRON INJECT] Document ready state:', document.readyState);
      console.log('🚀 [ELECTRON INJECT] Body exists:', !!document.body);
      console.log('🚀 [ELECTRON INJECT] Window location:', window.location.href);
      console.log('🚀 [ELECTRON INJECT] Body innerHTML length:', document.body ? document.body.innerHTML.length : 'no body');
      console.log('🚀 [ELECTRON INJECT] Has React root:', !!document.getElementById('__next'));
      console.log('🚀 [ELECTRON INJECT] React root content:', document.getElementById('__next') ? document.getElementById('__next').innerHTML.slice(0, 200) : 'no react root');
    `).then(() => {
      console.log('✅ JavaScript injection successful');
    }).catch(err => {
      console.error('❌ JavaScript injection failed:', err);
    });
  });
  
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER] ${message}`);
  });
  
  // Inject debug scripts for investigation
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('🔧 Page finished loading - injecting debug scripts...');
    
    // Inject simple debug script
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
    
    // Inject hydration debug script
    try {
      const hydrationScript = fs.readFileSync(path.join(__dirname, 'hydration-debug.js'), 'utf8');
      mainWindow.webContents.executeJavaScript(hydrationScript).then(() => {
        console.log('✅ Hydration debug script injected successfully');
      }).catch(err => {
        console.error('❌ Hydration debug script injection failed:', err);
      });
    } catch (error) {
      console.error('❌ Failed to read hydration debug script:', error);
    }
    
    // Navigation test disabled to prevent infinite refresh loops
    console.log('🔍 Process argv:', process.argv);
    if (process.argv.includes('--test-navigation')) {
      console.log('🧪 --test-navigation flag detected, but navigation test is disabled to prevent refresh loops');
      
      // Instead of injecting navigation test, just navigate once if needed
      const targetPage = process.argv.find(arg => arg === 'projects' || arg === 'editor' || arg === 'login');
      if (targetPage) {
        console.log(`📄 Navigating to ${targetPage} page as requested`);
        setTimeout(() => {
          const url = `app://${targetPage}/index.html`;
          console.log(`🔄 Loading: ${url}`);
          mainWindow.loadURL(url);
        }, 1000);
      }
    } else {
      console.log('ℹ️ No --test-navigation flag, using normal navigation');
    }
    
    // If test button is requested, inject button test script
    if (process.argv.includes('--test-button')) {
      console.log('🧪 --test-button flag detected, injecting button test script...');
      try {
        const buttonScriptPath = path.join(__dirname, 'simple-button-test.js');
        console.log('📄 Reading button script from:', buttonScriptPath);
        const buttonScript = fs.readFileSync(buttonScriptPath, 'utf8');
        console.log('📜 Button script loaded, length:', buttonScript.length);
        
        // Wait a bit before injecting to ensure page is ready
        setTimeout(() => {
          mainWindow.webContents.executeJavaScript(buttonScript).then(() => {
            console.log('✅ Button test script injected and executed');
          }).catch(err => {
            console.error('❌ Button test script execution failed:', err);
          });
        }, 2000);
      } catch (error) {
        console.error('❌ Failed to read button test script:', error);
      }
    } else {
      console.log('ℹ️ No --test-button flag, skipping button test');
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
    console.log('🔄 Navigation attempt to:', url);
    
    // Allow navigation to local files and all app:// protocol URLs
    if (url.startsWith('file://') || url.startsWith('app://')) {
      console.log('🔗 Allowing local navigation to:', url);
      try {
        console.log('  - Current URL:', event.sender.getURL());
        console.log('  - Target URL:', url);
      } catch (error) {
        console.log('  - Could not get current URL:', error.message);
      }
    } else {
      console.log('🚫 Blocking external navigation to:', url);
      event.preventDefault();
    }
  });
  
  // Add did-navigate event to track successful navigation
  mainWindow.webContents.on('did-navigate', (event, url) => {
    console.log('✅ Navigation completed to:', url);
  });
  
  // Add did-navigate-in-page for SPA navigation
  mainWindow.webContents.on('did-navigate-in-page', (event, url) => {
    console.log('📍 In-page navigation to:', url);
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

// Register protocol scheme before app is ready
protocol.registerSchemesAsPrivileged([
  { 
    scheme: 'app', 
    privileges: { 
      secure: true, 
      standard: true, 
      supportsFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true
    } 
  }
]);

app.whenReady().then(() => {
  // Register custom protocol to serve static files with comprehensive debugging
  console.log('🔧 Setting up protocol...');
  
  // Test if protocol is already registered
  console.log('🔍 Protocol schemes:', protocol.isProtocolRegistered('app'));
  
  const result = protocol.registerFileProtocol('app', (request, callback) => {
    console.log('\n🔍 === PROTOCOL DEBUG START ===');
    console.log('📥 Raw request URL:', request.url);
    
    // Test if protocol is even being called
    console.log('🚀 PROTOCOL HANDLER CALLED!');
    
    // Fix for relative app:// URLs issue
    // When navigating to subpages, browser may append app:// URLs to current path
    // Example: app://projects/index.html/_next/app://_next/static/...
    // We need to extract the actual app:// URL from these malformed paths
    let url = request.url;
    
    // Check if this is a malformed URL with double app:// protocol
    if (url && url.includes('app://') && !url.startsWith('app://')) {
      console.log('🔧 Detected malformed URL with embedded app://');
      // Extract the actual app:// URL
      const appIndex = url.lastIndexOf('app://');
      url = url.substring(appIndex);
      console.log('🔧 Extracted URL:', url);
    }
    
    // Fix specific pattern: app://_next/app://_next/...
    if (url && url.includes('app://_next/app://')) {
      console.log('🔧 Detected double _next pattern:', url);
      url = url.replace(/app:\/\/_next\/app:\/\//, 'app://');
      console.log('🔧 Fixed _next pattern:', url);
    }
    
    // Fix any remaining double app:// patterns
    if (url && url.match(/app:\/\/.*app:\/\//)) {
      console.log('🔧 Detected remaining double protocol:', url);
      const matches = url.match(/app:\/\/(.*)app:\/\/(.+)/);
      if (matches && matches[2]) {
        url = 'app://' + matches[2];
        console.log('🔧 Fixed to:', url);
      }
    }
    
    // Now process normally
    url = url.substr(6); // Remove 'app://' prefix
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
    
    // Check if file exists or if it's a directory that should serve index.html
    if (!fs.existsSync(normalizedPath)) {
      console.error('❌ File not found!');
      console.error('   Requested URL:', request.url);
      console.error('   Final path:', normalizedPath);
      
      // List directory contents for debugging
      const dirPath = path.dirname(normalizedPath);
      if (fs.existsSync(dirPath)) {
        try {
          const stats = fs.statSync(dirPath);
          if (stats.isDirectory()) {
            const files = fs.readdirSync(dirPath);
            console.error('📂 Directory contents:', files.slice(0, 10)); // Limit output
          } else {
            console.error('📄 Path is not a directory:', dirPath);
          }
        } catch (error) {
          console.error('❌ Error checking directory:', error.message);
        }
      }
      
      callback({ error: -6 }); // FILE_NOT_FOUND
      return;
    }

    // Check if the path is a directory and serve index.html from it
    const stats = fs.statSync(normalizedPath);
    if (stats.isDirectory()) {
      console.log('📁 Directory detected, looking for index.html');
      const indexPath = path.join(normalizedPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        console.log('✅ Found index.html in directory, serving:', indexPath);
        callback({ path: indexPath });
        console.log('🔍 === PROTOCOL DEBUG END ===\n');
        return;
      } else {
        console.error('❌ No index.html found in directory:', normalizedPath);
        callback({ error: -6 }); // FILE_NOT_FOUND
        return;
      }
    }
    
    // Get file stats for debugging (reduced logging)
    const ext = path.extname(normalizedPath).toLowerCase();
    
    // Only log essential info for non-image files
    if (!['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) {
      console.log('✅ Serving file:', url, '(', stats.size, 'bytes )');
    } else {
      console.log('🖼️ Serving image:', url, '(', stats.size, 'bytes )');
    }
    
    console.log('🔍 === PROTOCOL DEBUG END ===\n');
    
    // Use simple file path response - let Electron handle MIME types
    callback({ 
      path: normalizedPath
    });
  });
  
  console.log('✅ Protocol registration result:', result);
  console.log('🔍 Protocol now registered:', protocol.isProtocolRegistered('app'));
  
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