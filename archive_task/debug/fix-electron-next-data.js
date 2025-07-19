#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 [FIX-NEXT-DATA] Starting __NEXT_DATA__ fixes for Electron...');

const outDir = path.join(__dirname, '..', 'out');

// Find all HTML files
const htmlFiles = glob.sync('**/*.html', { cwd: outDir });

let totalFiles = 0;
let totalFixed = 0;

htmlFiles.forEach(file => {
  const filePath = path.join(outDir, file);
  console.log(`🔧 [FIX-NEXT-DATA] Processing: ${file}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace the __NEXT_DATA__ script with a static version that preserves the correct page path
  const nextDataMatch = content.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
  
  if (nextDataMatch) {
    try {
      // Parse the existing __NEXT_DATA__ to extract the page path
      const existingData = JSON.parse(nextDataMatch[1]);
      const pagePath = existingData.page || '/';
      
      // Create static version with correct page path
      const staticNextData = `<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}},"page":"${pagePath}","query":{},"buildId":"electron-static","nextExport":true,"autoExport":true,"isFallback":false,"scriptLoader":[]}</script>`;
      
      content = content.replace(nextDataMatch[0], staticNextData);
      modified = true;
      console.log(`✅ [FIX-NEXT-DATA] Fixed __NEXT_DATA__ in: ${file} (page: ${pagePath})`);
    } catch (e) {
      console.log(`⚠️ [FIX-NEXT-DATA] Could not parse existing __NEXT_DATA__ in: ${file}, using fallback`);
      
      // Fallback to basic replacement if parsing fails
      const staticNextData = `<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{}},"page":"/","query":{},"buildId":"electron-static","nextExport":true,"autoExport":true,"isFallback":false,"scriptLoader":[]}</script>`;
      content = content.replace(nextDataMatch[0], staticNextData);
      modified = true;
    }
  }
  
  // Also fix any font preloads that might be absolute
  const fontPreloadRegex = /href="\/(_next\/static\/media\/[^"]+\.woff2?)"/g;
  content = content.replace(fontPreloadRegex, 'href="./$1"');
  if (fontPreloadRegex.test(content)) {
    modified = true;
    console.log(`✅ [FIX-NEXT-DATA] Fixed font preloads in: ${file}`);
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    totalFixed++;
  }
  
  totalFiles++;
});

console.log(`🎯 [FIX-NEXT-DATA] Processed ${totalFiles} HTML files`);
console.log(`✅ [FIX-NEXT-DATA] Fixed __NEXT_DATA__ in ${totalFixed} files`);
console.log('✅ [FIX-NEXT-DATA] All Electron __NEXT_DATA__ fixes completed!');