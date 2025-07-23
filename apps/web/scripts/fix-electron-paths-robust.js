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

// Copy navigation-fix.js to out directory
function copyNavigationFix() {
  const sourcePath = path.join(__dirname, '../electron/navigation-fix.js');
  const targetPath = path.join(OUT_DIR, 'electron/navigation-fix.js');
  
  try {
    // Create electron directory if it doesn't exist
    const electronDir = path.dirname(targetPath);
    if (!fs.existsSync(electronDir)) {
      fs.mkdirSync(electronDir, { recursive: true });
    }
    
    // Copy the file
    fs.copyFileSync(sourcePath, targetPath);
    console.log('✅ Copied navigation-fix.js to out directory');
  } catch (error) {
    console.error('❌ Failed to copy navigation-fix.js:', error.message);
  }
}

function fixHtmlFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    const originalContent = content;
    
    // Calculate the depth of the file relative to OUT_DIR
    const relativePath = path.relative(OUT_DIR, filePath);
    const depth = relativePath.split(path.sep).length - 1;
    const pathPrefix = depth > 0 ? '../'.repeat(depth) : './';
    
    // For deeply nested files, we need to go back to root
    if (depth > 0) {
      // Replace all relative paths with correct depth-adjusted paths
      content = content.replace(/href="\.\//g, `href="${pathPrefix}`);
      content = content.replace(/src="\.\//g, `src="${pathPrefix}`);
      content = content.replace(/url\("\.\//g, `url("${pathPrefix}`);
      
      // Fix preload links
      content = content.replace(/rel="preload" href="\.\//g, `rel="preload" href="${pathPrefix}`);
      
      // Fix any absolute paths that might have been missed
      content = content.replace(/href="\/(?!\/)/g, `href="${pathPrefix}`);
      content = content.replace(/src="\/(?!\/)/g, `src="${pathPrefix}`);
    } else {
      // For root level files, keep using ./
      // 正则批量把 /_next/ 等绝对 URL 改成 ./_next/
      content = content.replace(/(?<![\w/])\/(_next\/[^"'\s>]+)/g, './$1');
      
      // 修复根目录资源路径 /logo.svg -> ./logo.svg
      content = content.replace(/(?<![\w/.])(?<!["'=]\.)\/([\w-]+\.(svg|png|jpg|jpeg|gif|ico|webp))(?=["'\s>])/g, './$1');
      
      // 修复 manifest 和其他根文件
      content = content.replace(/(?<![\w/.])(?<!["'=]\.)\/(manifest\.json|robots\.txt|sitemap\.xml|favicon\.ico)(?=["'\s>])/g, './$1');
      
      // 修复所有绝对路径为相对路径（针对 Electron 静态导出）
      content = content.replace(/href="\//g, 'href="./');
      content = content.replace(/src="\//g, 'src="./');
      content = content.replace(/url\("\//g, 'url("./');
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed paths in ${path.basename(filePath)} (depth: ${depth})`);
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
    
    // Fix absolute font paths in CSS files
    content = content.replace(/url\(["']?\/(_next\/[^"')]+)["']?\)/g, 'url("./$1")');
    
    // Fix relative font paths that incorrectly reference _next/static/media from within _next/static/css
    // These need to go up one directory level: ./_next/static/media -> ../media
    content = content.replace(/url\(["']?\.\/_next\/static\/media\/([^"')]+)["']?\)/g, 'url("../media/$1")');
    
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
  
  // Copy navigation-fix.js to out directory
  copyNavigationFix();
  
  if (totalFixed === 0) {
    console.log('ℹ️  No files needed fixing - paths may already be relative');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixHtmlFile, fixCssFile };