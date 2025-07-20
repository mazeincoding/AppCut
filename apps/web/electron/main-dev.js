const { app, BrowserWindow } = require('electron');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow localhost connections
    }
  });

  console.log('🚀 Loading OpenCut from localhost:3000...');
  
  // Load from localhost - no path issues!
  mainWindow.loadURL('http://localhost:3000');
  
  // Add error handling
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ Failed to load:', errorDescription);
    console.log('💡 Make sure Next.js dev server is running on localhost:3000');
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ OpenCut loaded successfully from localhost!');
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});