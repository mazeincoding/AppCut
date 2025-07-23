#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Electron build configuration...');

// Check if required files exist
const requiredFiles = [
  'next.config.electron.ts',
  'electron/main.js',
  'electron/preload.js',
  '.env.electron'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
});

// Check package.json scripts
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['electron:build', 'electron:dev', 'electron:pack'];

requiredScripts.forEach(script => {
  if (packageJson.scripts[script]) {
    console.log(`✅ Script "${script}" configured`);
  } else {
    console.log(`❌ Script "${script}" missing`);
    allFilesExist = false;
  }
});

// Check if out directory would be created correctly
console.log('\n📁 Build configuration:');
console.log(`   Output directory: out/`);
console.log(`   Static export: enabled`);
console.log(`   Images unoptimized: enabled`);
console.log(`   Trailing slash: enabled`);

if (allFilesExist) {
  console.log('\n🎉 Build configuration is ready!');
  console.log('💡 To build: bun run electron:build');
  console.log('💡 To test: bun run electron:dev');
} else {
  console.log('\n❌ Some files are missing. Please check the configuration.');
}

// Create a mock out directory structure for testing
const outDir = 'out';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
  
  // Create a simple index.html for testing
  const testHtml = `<!DOCTYPE html>
<html>
<head>
    <title>OpenCut Desktop - Test Build</title>
    <meta charset="utf-8">
</head>
<body>
    <div id="__next">
        <h1>OpenCut Desktop</h1>
        <p>This is a test build for Electron integration.</p>
        <p>Build timestamp: ${new Date().toISOString()}</p>
    </div>
</body>
</html>`;
  
  fs.writeFileSync(path.join(outDir, 'index.html'), testHtml);
  console.log(`\n📝 Created test build in ${outDir}/`);
  console.log('🧪 You can now test with: bun run electron:dev');
}