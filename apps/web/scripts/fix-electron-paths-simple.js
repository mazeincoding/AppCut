const fs = require('fs');
const path = require('path');

// Function to recursively find all HTML files
function findHtmlFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findHtmlFiles(fullPath));
    } else if (item.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Fix paths in HTML content - use relative paths for file:// protocol
function fixPaths(content) {
  // Only fix src and href attributes that start with / or ./
  return content
    // Fix href attributes - use relative paths
    .replace(/href="\/([^"]+)"/g, 'href="$1"')
    .replace(/href="\.\/([^"]+)"/g, 'href="$1"')
    // Fix src attributes - use relative paths
    .replace(/src="\/([^"]+)"/g, 'src="$1"')
    .replace(/src="\.\/([^"]+)"/g, 'src="$1"')
    // Fix content attributes for meta tags - keep some as app:// for manifest/icons
    .replace(/content="\/([^"]+)"/g, function(match, p1) {
      // Keep manifest and icon paths as app:// for Electron compatibility
      if (p1.includes('manifest') || p1.includes('icon') || p1.includes('favicon')) {
        return 'content="app://' + p1 + '"';
      }
      return 'content="' + p1 + '"';
    })
    // Don't touch external URLs
    .replace(/href="https:/g, 'href="https:')
    .replace(/src="https:/g, 'src="https:')
    .replace(/content="https:/g, 'content="https:')
    .replace(/href="http:/g, 'href="http:')
    .replace(/src="http:/g, 'src="http:')
    .replace(/content="http:/g, 'content="http:');
}

// Main function
function main() {
  const outDir = path.join(__dirname, '../out');

  if (!fs.existsSync(outDir)) {
    console.log('Output directory does not exist:', outDir);
    return;
  }

  const files = findHtmlFiles(outDir);
  console.log('Found HTML files to process:', files.length);

  for (const file of files) {
    console.log('Processing:', file);
    const content = fs.readFileSync(file, 'utf8');
    const fixedContent = fixPaths(content);
    fs.writeFileSync(file, fixedContent, 'utf8');
    console.log('Fixed paths in:', file);
  }

  console.log('✅ All files processed successfully');
  
  // Now patch JavaScript files to fix location.assign issue
  patchJavaScriptFiles();
}

// Function to patch JavaScript files for Electron compatibility
function patchJavaScriptFiles() {
  console.log('\n🔧 Patching JavaScript files for Electron compatibility...');
  
  const chunksDir = path.join(__dirname, '../out/_next/static/chunks');
  
  if (!fs.existsSync(chunksDir)) {
    console.log('Chunks directory does not exist:', chunksDir);
    return;
  }
  
  let patchedCount = 0;
  
  // Function to patch a single JS file
  function patchJsFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Replace location.assign calls with a safe wrapper
      // This regex finds location.assign(arg) and replaces with wrapper(arg)
      content = content.replace(
        /location\.assign\s*\(/g,
        '(function(url){try{location.href=url}catch(e){console.warn("location navigation failed:",e)}})('
      );
      
      // Also handle cases where assign might be accessed as a property
      content = content.replace(
        /location\["assign"\]\s*\(/g,
        '(function(url){try{location.href=url}catch(e){console.warn("location navigation failed:",e)}})('
      );
      
      // Handle location.replace similarly  
      content = content.replace(
        /location\.replace\s*\(/g,
        '(function(url){try{location.href=url}catch(e){console.warn("location navigation failed:",e)}})('
      );
      
      content = content.replace(
        /location\["replace"\]\s*\(/g,
        '(function(url){try{location.href=url}catch(e){console.warn("location navigation failed:",e)}})('
      );
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Patched ${path.basename(filePath)}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Error patching ${filePath}:`, error.message);
      return false;
    }
  }
  
  // Walk through all JS files
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (file.endsWith('.js') && !file.endsWith('.map')) {
        if (patchJsFile(fullPath)) {
          patchedCount++;
        }
      }
    }
  }
  
  walkDir(chunksDir);
  
  console.log(`✅ Patched ${patchedCount} JavaScript files for Electron compatibility`);
}

main();