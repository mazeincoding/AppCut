const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let nextProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Load from localhost - no path issues!
  mainWindow.loadURL('http://localhost:3000');
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function startNextJS() {
  console.log('🚀 Starting Next.js dev server...');
  
  return new Promise((resolve, reject) => {
    nextProcess = spawn('bun', ['run', 'dev'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });

    nextProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output);
      
      if (output.includes('Local:') || output.includes('localhost:3000')) {
        console.log('✅ Next.js server ready!');
        resolve();
      }
    });

    nextProcess.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    nextProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Next.js process exited with code ${code}`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      resolve(); // Start anyway
    }, 30000);
  });
}

app.whenReady().then(async () => {
  try {
    await startNextJS();
    createWindow();
  } catch (error) {
    console.error('Failed to start Next.js:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (nextProcess) {
    nextProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});