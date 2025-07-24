const fs = require('fs');
const path = require('path');

// =================== ENHANCED PATH FIXING - PHASE 3 ===================
// Comprehensive file type detection
const fileTypes = {
  html: ['.html'],
  css: ['.css'],
  js: ['.js', '.mjs'],
  json: ['.json'],
  assets: ['.woff2', '.woff', '.ttf', '.svg', '.png', '.jpg', '.jpeg']
};

console.log('🚀 [PATH-FIX] Enhanced Electron path fixing script started');
console.log('🔧 [PATH-FIX] Features: comprehensive validation + location patching');

// =================== FILE DISCOVERY - ENHANCED ===================
// Find files by type with comprehensive patterns
function findFilesByType(dir, extensions) {
  const files = [];
  
  function walkDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walkDir(dir);
  return files;
}

// Legacy function for backward compatibility
function findHtmlFiles(dir) {
  return findFilesByType(dir, ['.html']);
}

// =================== VALIDATION FUNCTION - PHASE 3 ===================
// Comprehensive path validation
function validatePaths(content, filename) {
  const issues = [];
  
  // Check for remaining absolute paths
  const absolutePathRegex = /(?:href|src|url)=["']\/((?!http)[^"']+)["']/g;
  let match;
  while ((match = absolutePathRegex.exec(content)) !== null) {
    issues.push(`Absolute path found: /${match[1]}`);
  }
  
  if (issues.length > 0) {
    console.warn(`⚠️ [PATH-FIX] ${filename} has ${issues.length} path issues:`);
    issues.forEach(issue => console.warn(`  - ${issue}`));
  }
  
  return issues.length === 0;
}

// NEW: Enhanced font-specific validation function
function validateFontPaths(content, filename) {
  const fontIssues = [];
  
  // Check for remaining absolute font paths
  const absoluteFontRegex = /(?:href|src|url)=?['"]?\/[^'"]*\.(woff2?|ttf|eot|otf)[^'"]*['"]?/g;
  let match;
  while ((match = absoluteFontRegex.exec(content)) !== null) {
    fontIssues.push(`Absolute font path found: ${match[0]}`);
  }
  
  // Check for CSS font-face issues
  if (filename.endsWith('.css')) {
    const cssUrlRegex = /url\(['"]?\/[^'"]*\.(woff2?|ttf|eot|otf)[^'")]*['"]?\)/g;
    while ((match = cssUrlRegex.exec(content)) !== null) {
      fontIssues.push(`CSS absolute font URL: ${match[0]}`);
    }
  }
  
  if (fontIssues.length > 0) {
    console.warn(`⚠️ [FONT-FIX] ${filename} has ${fontIssues.length} font path issues:`);
    fontIssues.forEach(issue => console.warn(`  - ${issue}`));
  } else {
    console.log(`✅ [FONT-FIX] ${filename} - all font paths are relative`);
  }
  
  return fontIssues.length === 0;
}

// =================== ENHANCED PATH FIXING + LOCATION PATCHING ===================
// Combined path fixing and location patching
function fixElectronPaths(content, filename) {
  let fixedContent = content;
  let changeCount = 0;
  
  console.log(`📄 [PATH-FIX] Processing ${path.basename(filename)}...`);
  
  // PHASE 3: Fix href attributes (links, stylesheets, fonts)
  fixedContent = fixedContent.replace(/href="\/([^"]+)"/g, (match, path) => {
    changeCount++;
    return `href="${path}"`;
  });
  
  // PHASE 3: Fix src attributes (scripts, images)
  fixedContent = fixedContent.replace(/src="\/([^"]+)"/g, (match, path) => {
    changeCount++;
    return `src="${path}"`;
  });
  
  // PHASE 3: Fix CSS url() references
  fixedContent = fixedContent.replace(/url\(["']?\/([^"')]+)["']?\)/g, (match, path) => {
    changeCount++;
    return `url("${path}")`;
  });
  
  // REPLACE/ENHANCE LINES 95-109 WITH COMPREHENSIVE FONT FIXING:
  // Fix preload href for fonts and assets (comprehensive) - ENHANCED
  fixedContent = fixedContent.replace(/href="\/([^"]*_next\/static\/[^"]+)"/g, (match, path) => {
    changeCount++;
    console.log(`  🎯 [PATH-FIX] Fixed _next static href: /${path} → ${path}`);
    return `href="${path}"`;
  });

  // NEW: Fix CSS @font-face src paths in CSS files
  if (filename.endsWith('.css')) {
    fixedContent = fixedContent.replace(/src:\s*url\(['"]?\/([^'"]+\.woff2?[^'")]*?)['"]?\)/g, (match, path) => {
      changeCount++;
      console.log(`  🎯 [PATH-FIX] Fixed CSS font src: /${path} → ${path}`);
      return `src: url("${path}")`;
    });
    
    // Fix any font-face url() references in CSS
    fixedContent = fixedContent.replace(/url\(['"]?\/([^'"]*\.(woff2?|ttf|eot|otf)[^'")]*?)['"]?\)/g, (match, path) => {
      changeCount++;
      console.log(`  🎯 [PATH-FIX] Fixed CSS font url: /${path} → ${path}`);
      return `url("${path}")`;
    });
  }

  // NEW: Fix link rel="preload" as="font" specifically in HTML
  if (filename.endsWith('.html')) {
    fixedContent = fixedContent.replace(/(<link[^>]*rel=["']preload["'][^>]*as=["']font["'][^>]*href=["'])\/([^"']+)(["'][^>]*>)/g, (match, before, path, after) => {
      changeCount++;
      console.log(`  🎯 [PATH-FIX] Fixed HTML font preload: /${path} → ${path}`);
      return `${before}${path}${after}`;
    });
    
    // Fix any remaining font file references in link tags
    fixedContent = fixedContent.replace(/(<link[^>]*href=["'])\/([^"']*\.(woff2?|ttf|eot|otf)[^"']*)(["'][^>]*>)/g, (match, before, path, after) => {
      changeCount++;
      console.log(`  🎯 [PATH-FIX] Fixed HTML font link: /${path} → ${path}`);
      return `${before}${path}${after}`;
    });
  }

  // NEW: Fix any remaining font file references (catch-all)
  fixedContent = fixedContent.replace(/"\/([^"]*\.(woff2?|ttf|eot|otf)[^"]*)"/g, (match, path) => {
    changeCount++;
    console.log(`  🎯 [PATH-FIX] Fixed general font reference: /${path} → ${path}`);
    return `"${path}"`;
  });

  // NEW: Fix Next.js font optimization paths
  fixedContent = fixedContent.replace(/href="\/([^"]*\/_next\/static\/[^"]*\.(woff2?|ttf)[^"]*)"/g, (match, path) => {
    changeCount++;
    console.log(`  🎯 [PATH-FIX] Fixed Next.js optimized font: /${path} → ${path}`);
    return `href="${path}"`;
  });
  
  // PHASE 3: Fix any remaining absolute _next references
  fixedContent = fixedContent.replace(/["']\/(_next\/[^"']+)["']/g, (match, path) => {
    changeCount++;
    return `"${path}"`;
  });
  
  // PHASE 3: Fix JSON references in scripts
  fixedContent = fixedContent.replace(/["']\/(_next\/[^"']+\.json)["']/g, (match, path) => {
    changeCount++;
    return `"${path}"`;
  });
  
  // PHASE 1: Enhanced location patching for JS files
  if (filename.endsWith('.js')) {
    if (fixedContent.includes('location.assign') || fixedContent.includes('location.replace')) {
      console.log(`  🔧 [PATH-FIX] Patching location calls in ${path.basename(filename)}`);
      
      // Patch location.assign calls
      fixedContent = fixedContent.replace(
        /location\.assign\s*\(/g,
        '(function(url){try{window.location.href=url}catch(e){console.warn("location assign failed:",e)}})('
      );
      
      // Patch location.replace calls  
      fixedContent = fixedContent.replace(
        /location\.replace\s*\(/g,
        '(function(url){try{window.location.href=url}catch(e){console.warn("location replace failed:",e)}})('
      );
      
      // Handle property access patterns
      fixedContent = fixedContent.replace(
        /location\[['\"](assign|replace)['"]\]\s*\(/g,
        '(function(url){try{window.location.href=url}catch(e){console.warn("location $1 failed:",e)}})('
      );
      
      changeCount++;
    }
  }
  
  // Fix content attributes for meta tags (keep some as app:// for manifest/icons)
  fixedContent = fixedContent.replace(/content="\/([^"]+)"/g, function(match, p1) {
    if (p1.includes('manifest') || p1.includes('icon') || p1.includes('favicon')) {
      return 'content="app://' + p1 + '"';
    }
    changeCount++;
    return 'content="' + p1 + '"';
  });
  
  // Clean up double-fixes
  fixedContent = fixedContent.replace(/href="\.\/([^"]+)"/g, 'href="$1"');
  fixedContent = fixedContent.replace(/src="\.\/([^"]+)"/g, 'src="$1"');
  
  // Don't touch external URLs - restore them if accidentally modified
  fixedContent = fixedContent.replace(/href="https:/g, 'href="https:');
  fixedContent = fixedContent.replace(/src="https:/g, 'src="https:');
  fixedContent = fixedContent.replace(/content="https:/g, 'content="https:');
  fixedContent = fixedContent.replace(/href="http:/g, 'href="http:');
  fixedContent = fixedContent.replace(/src="http:/g, 'src="http:');
  fixedContent = fixedContent.replace(/content="http:/g, 'content="http:');
  
  if (changeCount > 0) {
    console.log(`  ✅ [PATH-FIX] Fixed ${changeCount} paths in ${path.basename(filename)}`);
  }
  
  // PHASE 3: Validate the fixed content
  const isValid = validatePaths(fixedContent, path.basename(filename));
  if (isValid) {
    console.log(`  ✅ [PATH-FIX] All paths validated for ${path.basename(filename)}`);
  }
  
  // NEW: Validate font paths specifically
  const fontValid = validateFontPaths(fixedContent, path.basename(filename));
  if (!fontValid) {
    console.warn(`  ⚠️ [PATH-FIX] Font path issues detected in ${path.basename(filename)}`);
  }
  
  return fixedContent;
}

// =================== MAIN FUNCTION - ENHANCED ===================
function main() {
  console.log('\n🚀 [PATH-FIX] Starting comprehensive Electron path fixing...');
  
  const outDir = path.join(__dirname, '../out');

  if (!fs.existsSync(outDir)) {
    console.error('❌ [PATH-FIX] Output directory does not exist:', outDir);
    return;
  }

  console.log('📁 [PATH-FIX] Working directory:', outDir);

  // Process HTML files first
  const htmlFiles = findHtmlFiles(outDir);
  console.log(`📄 [PATH-FIX] Found ${htmlFiles.length} HTML files to process`);

  let processedCount = 0;
  for (const file of htmlFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const fixedContent = fixElectronPaths(content, file);
      fs.writeFileSync(file, fixedContent, 'utf8');
      processedCount++;
    } catch (error) {
      console.error(`❌ [PATH-FIX] Error processing ${file}:`, error.message);
    }
  }

  console.log(`\n✅ [PATH-FIX] Processed ${processedCount}/${htmlFiles.length} HTML files successfully`);
  
  // Process CSS files for font path fixing
  const cssFiles = findFilesByType(outDir, ['.css']);
  console.log(`📄 [PATH-FIX] Found ${cssFiles.length} CSS files to process`);

  let cssProcessedCount = 0;
  for (const file of cssFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const fixedContent = fixElectronPaths(content, file);
      fs.writeFileSync(file, fixedContent, 'utf8');
      cssProcessedCount++;
    } catch (error) {
      console.error(`❌ [PATH-FIX] Error processing ${file}:`, error.message);
    }
  }

  console.log(`\n✅ [PATH-FIX] Processed ${cssProcessedCount}/${cssFiles.length} CSS files successfully`);
  
  // Process JavaScript files for location patching
  patchJavaScriptFiles();
  
  // Run comprehensive verification
  verifyResourcePaths();
}

// =================== ENHANCED JAVASCRIPT PATCHING ===================
function patchJavaScriptFiles() {
  console.log('\n🔧 [PATH-FIX] Enhanced JavaScript patching for Electron compatibility...');
  
  const outDir = path.join(__dirname, '../out');
  
  // Find all JS files, not just in chunks directory
  const jsFiles = findFilesByType(outDir, ['.js']);
  const filteredJsFiles = jsFiles.filter(file => !file.endsWith('.map'));
  
  console.log(`📄 [PATH-FIX] Found ${filteredJsFiles.length} JavaScript files to scan`);
  
  let patchedCount = 0;
  let scannedCount = 0;
  
  for (const filePath of filteredJsFiles) {
    try {
      scannedCount++;
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Only patch if file contains location methods
      if (content.includes('location.assign') || content.includes('location.replace') || 
          content.includes('location["assign"]') || content.includes('location[\'assign\']') ||
          content.includes('location["replace"]') || content.includes('location[\'replace\']')) {
        
        console.log(`  🔧 [PATH-FIX] Patching location calls in ${path.basename(filePath)}`);
        
        // Use the enhanced patching from fixElectronPaths
        content = fixElectronPaths(content, filePath);
        
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`  ✅ [PATH-FIX] Successfully patched ${path.basename(filePath)}`);
          patchedCount++;
        }
      }
    } catch (error) {
      console.error(`  ❌ [PATH-FIX] Error patching ${filePath}:`, error.message);
    }
  }
  
  console.log(`\n✅ [PATH-FIX] Scanned ${scannedCount} JS files, patched ${patchedCount} files with location methods`);
}

// =================== BUILD-TIME VERIFICATION ===================
function verifyResourcePaths() {
  console.log('\n🔍 [PATH-FIX] Verifying all resource paths...');
  
  const outDir = path.join(__dirname, '../out');
  const allHtmlFiles = findFilesByType(outDir, ['.html']);
  
  let totalIssues = 0;
  let validFiles = 0;
  
  allHtmlFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const isValid = validatePaths(content, path.basename(file));
      if (isValid) {
        validFiles++;
      } else {
        totalIssues++;
      }
    } catch (error) {
      console.error(`❌ [PATH-FIX] Error reading ${file}:`, error.message);
      totalIssues++;
    }
  });
  
  console.log('\n📊 [PATH-FIX] Verification Summary:');
  console.log(`  - Total HTML files: ${allHtmlFiles.length}`);
  console.log(`  - Valid files: ${validFiles}`);
  console.log(`  - Files with issues: ${totalIssues}`);
  
  if (totalIssues === 0) {
    console.log('  ✅ [PATH-FIX] All resource paths are valid!');
  } else {
    console.warn(`  ⚠️ [PATH-FIX] Found issues in ${totalIssues} files`);
  }
  
  console.log('\n🎯 [PATH-FIX] Verification complete');
}

// =================== VERIFICATION PRINTS ===================
console.log('🎯 [PATH-FIX] Script verification:');
console.log('- Enhanced path fixing: LOADED');
console.log('- Location patching: LOADED');
console.log('- Comprehensive validation: LOADED');
console.log('- Multi-file type support: LOADED');
console.log('🚀 [PATH-FIX] All features ready, starting execution...\n');

// Start the main process
main();

// Export functions for potential external use
module.exports = { 
  fixElectronPaths, 
  verifyResourcePaths, 
  validatePaths,
  findFilesByType,
  patchJavaScriptFiles
};