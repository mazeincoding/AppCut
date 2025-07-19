#!/usr/bin/env node

/**
 * Robust Electron Path Fixer
 * 
 * This script fixes absolute paths in Next.js static export for Electron compatibility.
 * It's more robust than previous versions by using proper parsing and targeted fixes.
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '../out');

function fixHtmlFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix absolute paths to relative paths
    // /_next/ -> ./_next/
    const originalContent = content;
    content = content.replace(/(?<![\w/])\/(_next\/[^"'\s>]+)/g, './$1');
    
    // Fix root assets like /logo.svg -> ./logo.svg
    content = content.replace(/(?<![\w/])\/([\w-]+\.(svg|png|jpg|jpeg|gif|ico|webp))(?=["'\s>])/g, './$1');
    
    // Fix manifest and other root files
    content = content.replace(/(?<![\w/])\/(manifest\.json|robots\.txt|sitemap\.xml|favicon\.ico)(?=["'\s>])/g, './$1');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed paths in ${path.basename(filePath)}`);
      modified = true;
    }
    
    return modified;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function fixCssFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    const originalContent = content;
    // Fix font paths in CSS files
    content = content.replace(/url\(["']?\/(_next\/[^"')]+)["']?\)/g, 'url("./$1")');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed CSS paths in ${path.basename(filePath)}`);
      modified = true;
    }
    
    return modified;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function walkDirectory(dir, callback) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      walkDirectory(fullPath, callback);
    } else {
      callback(fullPath);
    }
  }
}

function main() {
  console.log('🔧 [ROBUST FIXER] Starting path fixes for Electron...');
  
  if (!fs.existsSync(OUT_DIR)) {
    console.error(`❌ Output directory not found: ${OUT_DIR}`);
    console.error('   Make sure to run "bun run build:electron" first');
    process.exit(1);
  }
  
  let totalFixed = 0;
  
  walkDirectory(OUT_DIR, (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.html') {
      if (fixHtmlFile(filePath)) totalFixed++;
    } else if (ext === '.css') {
      if (fixCssFile(filePath)) totalFixed++;
    }
  });
  
  console.log(`✅ [ROBUST FIXER] Complete! Fixed ${totalFixed} files`);
  
  if (totalFixed === 0) {
    console.log('ℹ️  No files needed fixing - paths may already be relative');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixHtmlFile, fixCssFile };