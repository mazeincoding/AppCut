const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Handle GPU issues in headless environments
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-software-rasterizer');

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Allow loading local resources
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false
  });

  // Load the Next.js app
  const startUrl = isDev 
    ? 'http://localhost:3002' 
    : `file://${path.join(__dirname, '../out/index.html')}`;
  
  // ROOT CAUSE DEBUG: Intercept ALL network requests at Electron main process level
  console.log('🔧 [MAIN PROCESS] Setting up comprehensive network request interception...');
  
  mainWindow.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    
    // Log only JSON/data requests for debugging (reduce noise)
    if (url && (url.includes('.json') || url.includes('_next/data'))) {
      console.log('🔍 [MAIN PROCESS] JSON request intercepted:', {
        id: details.id,
        url: url,
        method: details.method,
        resourceType: details.resourceType
      });
    }
    
    // Block ANY .json or _next/data requests - ENHANCED LOGIC
    const shouldBlock = url && (
      url.includes('.json') || 
      url.includes('_next/data') || 
      url.includes('.html.json') ||
      url.includes('electron-static')
    );
    
    if (shouldBlock) {
      console.error('🚫 [MAIN PROCESS BLOCK] JSON/Data request BLOCKED:');
      console.error('URL:', url);
      console.error('Method:', details.method);
      console.error('Resource Type:', details.resourceType);
      console.error('Referrer:', details.referrer);
      console.error('Should block check:', {
        hasJSON: url.includes('.json'),
        hasNextData: url.includes('_next/data'),
        hasHTMLJSON: url.includes('.html.json'),
        hasElectronStatic: url.includes('electron-static'),
        shouldBlock: shouldBlock
      });
      console.error('=================================');
      
      // Block the request by redirecting to a successful empty JSON response
      callback({ redirectURL: 'data:application/json,{"blocked":true,"success":true}' });
      return;
    }
    
    // Allow all other requests
    callback({});
  });
  
  // Also intercept completed requests to see what got through
  mainWindow.webContents.session.webRequest.onCompleted((details) => {
    const url = details.url;
    if (url && (url.includes('.json') || url.includes('_next/data') || url.includes('.html.json'))) {
      console.error('🚨 [MAIN PROCESS] JSON request completed (should have been blocked):');
      console.error('URL:', url);
      console.error('Status:', details.statusCode);
      console.error('=================================');
    }
  });
  
  // Intercept errors to see failed requests
  mainWindow.webContents.session.webRequest.onErrorOccurred((details) => {
    const url = details.url;
    if (url && (url.includes('.json') || url.includes('_next/data') || url.includes('.html.json'))) {
      console.error('🔥 [MAIN PROCESS] JSON request FAILED:');
      console.error('URL:', url);
      console.error('Error:', details.error);
      console.error('=================================');
    }
  });

  // Configure CSP for Electron
  if (!isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: file: blob: https:; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
            "style-src 'self' 'unsafe-inline' https:; " +
            "img-src 'self' data: file: blob: https:; " +
            "font-src 'self' data: file: https:; " +
            "connect-src 'self' https: ws: wss:; " +
            "media-src 'self' data: file: blob:;"
          ]
        }
      });
    });
  }

  mainWindow.loadURL(startUrl);

  // Suppress console errors for blocked JSON requests
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // Hide errors for blocked JSON/data requests
    if (message.includes('Failed to load resource') && 
        (message.includes('.json') || message.includes('_next/data') || message.includes('electron-static'))) {
      console.log('🤫 [SUPPRESSED] Hiding blocked request error:', message);
      return; // Don't log to console
    }
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Basic IPC for testing
ipcMain.handle('ping', () => {
  console.log('Received ping from renderer');
  return 'pong';
});

// Prevent app from quitting when all windows are closed on macOS
app.on('before-quit', () => {
  app.isQuiting = true;
});
