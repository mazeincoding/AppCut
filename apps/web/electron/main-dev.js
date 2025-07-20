const { app, BrowserWindow } = require('electron');

let mainWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow localhost connections
    }
  });

  console.log('🚀 Loading OpenCut from localhost...');
  
  // Check if a specific port was provided as argument
  const args = process.argv.slice(2);
  const portArg = args.find(arg => arg.startsWith('--port='));
  const specificPort = portArg ? parseInt(portArg.replace('--port=', '')) : null;
  
  // Try specific port first, then common ports that Next.js uses
  const ports = specificPort ? [specificPort] : [3000, 3001, 3002, 3003, 3004, 3005];
  
  for (const port of ports) {
    try {
      console.log(`Trying port ${port}...`);
      await mainWindow.loadURL(`http://localhost:${port}`);
      console.log(`✅ Connected to Next.js dev server on port ${port}`);
      break;
    } catch (error) {
      console.log(`⚠️ Port ${port} not available - ${error.message}`);
      if (port === ports[ports.length - 1]) {
        console.error('❌ Could not connect to any Next.js dev server');
        console.log('💡 Make sure "bun run dev" is running in normal mode (not export mode)');
      }
    }
  }
  
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

app.whenReady().then(async () => {
  await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});