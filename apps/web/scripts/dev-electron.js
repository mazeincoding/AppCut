#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Electron development mode...');

// Set environment variable for Electron mode
process.env.NEXT_PUBLIC_ELECTRON = 'true';

// Build static files for Electron
console.log('📦 Building static files...');
const buildProcess = spawn('npm', ['run', 'export:electron'], {
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Build failed');
    process.exit(1);
  }
  
  console.log('✅ Build completed');
  
  // Check if index.html exists
  const indexPath = path.join(__dirname, '..', 'out', 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ index.html not found in out/ directory');
    process.exit(1);
  }
  
  console.log('✅ Static files ready');
  console.log('🖥️  Starting Electron...');
  
  // Start Electron
  const electronProcess = spawn('electron', ['electron/main-simple.js'], {
    stdio: 'inherit',
    shell: true
  });
  
  electronProcess.on('close', (code) => {
    console.log(`Electron exited with code ${code}`);
  });
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});