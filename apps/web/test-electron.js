const { spawn } = require('child_process');
const path = require('path');

// Test script to automatically run Electron app and capture console output
async function testElectronApp() {
  console.log('🚀 Starting Electron app test...');
  
  // Try both Linux and Windows executable paths
  const linuxPath = path.join(__dirname, 'dist/linux-unpacked/opencut-desktop');
  const windowsPath = path.join(__dirname, 'dist/win-unpacked/OpenCut Desktop.exe');
  
  const electronPath = linuxPath; // Use Linux executable on WSL
  console.log('📍 Using executable:', electronPath);
  
  return new Promise((resolve, reject) => {
    const electronProcess = spawn(electronPath, ['--no-sandbox', '--disable-gpu', '--enable-logging', '--log-level=0'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' }
    });
    
    let allOutput = '';
    let componentLogs = [];
    let startTime = Date.now();
    
    // Function to process output lines
    const processOutput = (data) => {
      const output = data.toString();
      allOutput += output;
      
      // Look for our specific component logs
      const lines = output.split('\n');
      lines.forEach(line => {
        if (line.includes('🏠 RootLayout: Component rendered') || 
            line.includes('🏡 HomePage: Component rendered') || 
            line.includes('🚀 StorageProvider: Component rendered') || 
            line.includes('🔄 StorageProvider: Starting initialization') ||
            line.includes('✅ StorageProvider: Initialization complete') ||
            line.includes('❌ StorageProvider:')) {
          componentLogs.push(line);
          console.log('📝 COMPONENT LOG:', line);
        }
      });
    };
    
    electronProcess.stdout.on('data', processOutput);
    electronProcess.stderr.on('data', processOutput);
    
    electronProcess.on('close', (code) => {
      const duration = Date.now() - startTime;
      console.log(`\n📊 Test Results (ran for ${duration}ms):`);
      console.log(`Exit code: ${code}`);
      
      // Analyze console output for our debug messages
      const analysis = analyzeOutput(allOutput);
      console.log('\n🔍 Component Rendering Analysis:');
      console.log(analysis);
      
      console.log('\n📝 Component Logs Found:');
      componentLogs.forEach(log => console.log('  -', log));
      
      resolve({ code, allOutput, analysis, componentLogs });
    });
    
    electronProcess.on('error', (err) => {
      console.error('❌ Failed to start Electron:', err);
      reject(err);
    });
    
    // Kill the process after 8 seconds to prevent hanging
    setTimeout(() => {
      console.log('\n⏰ Test timeout - killing process...');
      electronProcess.kill('SIGTERM');
    }, 8000);
  });
}

function analyzeOutput(output) {
  const analysis = {
    reactWorking: false,
    rootLayoutRendered: false,
    homePageRendered: false,
    storageProviderRendered: false,
    storageInitialized: false,
    storageErrors: [],
    otherErrors: [],
    componentLogs: []
  };
  
  const lines = output.split('\n');
  
  lines.forEach(line => {
    // Check for our debug messages
    if (line.includes('🏠 RootLayout: Component rendered')) {
      analysis.rootLayoutRendered = true;
      analysis.reactWorking = true;
      analysis.componentLogs.push('✅ RootLayout rendered');
    }
    
    if (line.includes('🏡 HomePage: Component rendered')) {
      analysis.homePageRendered = true;
      analysis.componentLogs.push('✅ HomePage rendered');
    }
    
    if (line.includes('🚀 StorageProvider: Component rendered')) {
      analysis.storageProviderRendered = true;
      analysis.componentLogs.push('✅ StorageProvider rendered');
    }
    
    if (line.includes('🔄 StorageProvider: Starting initialization')) {
      analysis.componentLogs.push('🔄 StorageProvider initialization started');
    }
    
    if (line.includes('✅ StorageProvider: Initialization complete')) {
      analysis.storageInitialized = true;
      analysis.componentLogs.push('✅ StorageProvider initialization complete');
    }
    
    if (line.includes('❌ StorageProvider:')) {
      analysis.storageErrors.push(line);
    }
    
    // Check for other errors
    if (line.includes('Error:') || line.includes('ERROR') || line.includes('Failed')) {
      if (!line.includes('StorageProvider:')) {
        analysis.otherErrors.push(line);
      }
    }
  });
  
  return analysis;
}

// Run the test
testElectronApp().catch(console.error);