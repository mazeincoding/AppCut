#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fix absolute paths in Next.js static export for Electron using relative paths
 */
function fixElectronStaticPaths() {
  const outDir = path.join(__dirname, '../out');
  
  console.log('🔧 [FIX-STATIC-PATHS] Starting Electron static path fixes...');
  
  if (!fs.existsSync(outDir)) {
    console.error('❌ Output directory does not exist:', outDir);
    return;
  }
  
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
  
  const htmlFiles = findHtmlFiles(outDir);
  
  htmlFiles.forEach(file => {
    const relativePath = path.relative(outDir, file);
    console.log(`🔧 [FIX-STATIC-PATHS] Processing: ${relativePath}`);
    
    let content = fs.readFileSync(file, 'utf8');
    
    // Calculate relative depth for nested pages
    const depth = relativePath.split(path.sep).length - 1;
    const relativePrefix = depth > 0 ? '../'.repeat(depth) : './';
    
    // Fix Next.js internal asset paths
    content = content.replace(/href="\/_next\//g, `href="${relativePrefix}_next/`);
    content = content.replace(/src="\/_next\//g, `src="${relativePrefix}_next/`);
    
    // Fix favicon and icon paths
    content = content.replace(/href="\/favicon\.ico"/g, `href="${relativePrefix}favicon.ico"`);
    content = content.replace(/href="\/icons\//g, `href="${relativePrefix}icons/`);
    
    // Fix manifest and browserconfig paths
    content = content.replace(/href="\/manifest\.json"/g, `href="${relativePrefix}manifest.json"`);
    content = content.replace(/content="\/browserconfig\.xml"/g, `content="${relativePrefix}browserconfig.xml"`);
    
    // Fix any remaining root-relative static asset paths
    content = content.replace(/href="\/([^"]*\.(css|js|woff2?|ttf|eot|png|jpg|jpeg|gif|svg))"/g, `href="${relativePrefix}$1"`);
    content = content.replace(/src="\/([^"]*\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|gif|svg))"/g, `src="${relativePrefix}$1"`);
    
    fs.writeFileSync(file, content);
    console.log(`✅ [FIX-STATIC-PATHS] Fixed: ${relativePath} (depth: ${depth}, prefix: ${relativePrefix})`);
  });
  
  console.log(`🎯 [FIX-STATIC-PATHS] Processed ${htmlFiles.length} HTML files`);
  console.log('✅ [FIX-STATIC-PATHS] All Electron static path fixes completed!');
}

// Run the fix
fixElectronStaticPaths();