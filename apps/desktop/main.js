const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      // Allow loading local content
      webSecurity: false,
    },
    show: false, // Don't show until ready
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Load from the web directory in the app bundle
    const indexPath = path.join(__dirname, 'web', 'index.html');
    console.log('Loading file from:', indexPath);
    
    // Set up proper base URL for relative assets
    const webDir = path.join(__dirname, 'web');
    
    // Ensure proper MIME types for assets
    mainWindow.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      if (details.url.startsWith('file://')) {
        // Handle file requests properly
        callback({});
      } else {
        callback({});
      }
    });
    
    mainWindow.loadFile(indexPath, {
      // This helps with resolving relative paths
      query: {},
      hash: ''
    });
    
    // Open DevTools in production to debug
    mainWindow.webContents.openDevTools();
    
    // Log any console errors
    mainWindow.webContents.on('console-message', (event, level, message) => {
      console.log(`Console [${level}]:`, message);
    });
    
    // Log when page fails to load
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
    });
    
    // Handle navigation to ensure proper path resolution
    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
        event.preventDefault();
      }
    });
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register file protocol for better asset handling
app.whenReady().then(() => {
  // Register a custom protocol to handle file loading
  protocol.registerFileProtocol('file', (request, callback) => {
    const pathname = decodeURI(request.url.replace('file:///', ''));
    callback(pathname);
  });

  createWindow();

  // macOS specific - re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});
