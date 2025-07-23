#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Building OpenCut for Electron...');

// Set environment variables for Electron build
process.env.NODE_ENV = 'production';
process.env.NEXT_PUBLIC_ELECTRON = 'true';
process.env.NEXT_PUBLIC_DISABLE_AUTH = 'true'; // Skip auth for desktop

try {
  // Clean previous build
  console.log('🧹 Cleaning previous build...');
  if (fs.existsSync('out')) {
    fs.rmSync('out', { recursive: true, force: true });
  }

  // Build with Electron-specific config
  console.log('📦 Building Next.js app for static export...');
  execSync('next build -c next.config.electron.ts', { 
    stdio: 'inherit',
    env: { ...process.env }
  });

  // Verify build output
  const indexPath = path.join('out', 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log('✅ Static build successful!');
    console.log(`📁 Output directory: ${path.resolve('out')}`);
    
    // Show build stats
    const stats = fs.statSync('out');
    console.log(`📊 Build completed at: ${stats.mtime}`);
    
    // List key files
    const files = fs.readdirSync('out');
    console.log('📋 Generated files:', files.slice(0, 10).join(', '));
    if (files.length > 10) {
      console.log(`   ... and ${files.length - 10} more files`);
    }
  } else {
    throw new Error('Build failed - index.html not found');
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('🎉 Electron build ready!');
console.log('💡 Next: Run "bun run electron:dev" to test the desktop app');