const fs = require('fs');
const path = require('path');

// Function to recursively find all HTML, JS, and CSS files
function findFiles(dir, extensions = ['.html', '.js', '.css']) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findFiles(fullPath, extensions));
    } else if (extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

// Fix paths in HTML content
function fixHtmlPaths(content) {
  return content
    // Fix href attributes
    .replace(/href="\/([^"]+)"/g, 'href="app://$1"')
    // Fix src attributes
    .replace(/src="\/([^"]+)"/g, 'src="app://$1"')
    // Fix content attributes for meta tags
    .replace(/content="\/([^"]+)"/g, 'content="app://$1"')
    // Don't touch external URLs
    .replace(/href="app:\/\/https:/g, 'href="https:')
    .replace(/src="app:\/\/https:/g, 'src="https:')
    .replace(/content="app:\/\/https:/g, 'content="https:')
    .replace(/href="app:\/\/http:/g, 'href="http:')
    .replace(/src="app:\/\/http:/g, 'src="http:')
    .replace(/content="app:\/\/http:/g, 'content="http:');
}

// Fix paths in JavaScript content
function fixJsPaths(content) {
  // Fix webpack public path - this is crucial for dynamic imports
  content = content
    // Fix webpack public path variable
    .replace(/r\.p\s*=\s*["']\/(_next\/)?["']/g, 'r.p="app://_next/"')
    // Fix webpack public path in different formats
    .replace(/publicPath\s*:\s*["']\/(_next\/)?["']/g, 'publicPath:"app://_next/"')
    // Fix __webpack_public_path__ assignments
    .replace(/__webpack_public_path__\s*=\s*["']\/(_next\/)?["']/g, '__webpack_public_path__="app://_next/"');

  // Fix CSS imports in JavaScript
  content = content
    // Fix CSS imports that use relative paths
    .replace(/["']\.?\/_next\/static\/css\/([^"']+\.css)["']/g, '"app://_next/static/css/$1"')
    // Fix chunk paths
    .replace(/["']\.?\/_next\/static\/chunks\/([^"']+)["']/g, '"app://_next/static/chunks/$1"')
    // Fix media paths
    .replace(/["']\.?\/_next\/static\/media\/([^"']+)["']/g, '"app://_next/static/media/$1"')
    // Fix font files specifically (woff, woff2, ttf, etc.) without path
    .replace(/["']([a-f0-9]+-[a-z0-9]+\.(?:woff2?|ttf|otf|eot))["']/g, '"app://_next/static/media/$1"')
    // Fix buildManifest paths
    .replace(/["']\.?\/_next\/static\/([^"']+)["']/g, function(match, p1) {
      // Don't double-fix already fixed paths
      if (match.includes('app://')) return match;
      return match.replace(/["']\.?\/_next/, '"app://_next');
    });

  // Fix dynamic imports and require statements
  content = content
    // Fix dynamic CSS loading patterns
    .replace(/\+"\.css"/g, '+".css"')
    .replace(/href:\s*"\/"/g, 'href: "app://"')
    .replace(/href:\s*'\/'/g, "href: 'app://'");

  // Fix font URLs in CSS-in-JS
  content = content
    // Fix url() references in CSS strings
    .replace(/url\(["']?([a-f0-9]+-[a-z0-9]+\.(?:woff2?|ttf|otf|eot))["']?\)/g, 'url(app://_next/static/media/$1)')
    // Fix src: references in @font-face
    .replace(/src:\s*url\(["']?\/([^"')]+\.(?:woff2?|ttf|otf|eot))["']?\)/g, 'src: url(app://$1)');

  return content;
}

// Fix paths in CSS content
function fixCssPaths(content) {
  return content
    // Fix font URLs
    .replace(/url\(["']?([a-f0-9]+-[a-z0-9]+\.(?:woff2?|ttf|otf|eot))["']?\)/g, 'url(app://_next/static/media/$1)')
    // Fix URLs that start with /
    .replace(/url\(["']?\/([^"')]+)["']?\)/g, 'url(app://$1)')
    // Fix relative URLs
    .replace(/url\(["']?\.\.\/([^"')]+)["']?\)/g, 'url(app://_next/$1)');
}

// Main function
function main() {
  const outDir = path.join(__dirname, '../out');

  if (!fs.existsSync(outDir)) {
    console.log('Output directory does not exist:', outDir);
    return;
  }

  // Process HTML files
  const htmlFiles = findFiles(outDir, ['.html']);
  console.log('Found HTML files to process:', htmlFiles.length);

  for (const file of htmlFiles) {
    console.log('Processing HTML:', file);
    const content = fs.readFileSync(file, 'utf8');
    const fixedContent = fixHtmlPaths(content);
    fs.writeFileSync(file, fixedContent, 'utf8');
  }

  // Process JavaScript files in _next/static
  const jsDir = path.join(outDir, '_next', 'static');
  if (fs.existsSync(jsDir)) {
    const jsFiles = findFiles(jsDir, ['.js']);
    console.log('Found JavaScript files to process:', jsFiles.length);

    for (const file of jsFiles) {
      console.log('Processing JS:', file);
      const content = fs.readFileSync(file, 'utf8');
      const fixedContent = fixJsPaths(content);
      if (content !== fixedContent) {
        fs.writeFileSync(file, fixedContent, 'utf8');
        console.log('Fixed paths in:', file);
      }
    }
  }

  // Process CSS files
  const cssDir = path.join(outDir, '_next', 'static', 'css');
  if (fs.existsSync(cssDir)) {
    const cssFiles = findFiles(cssDir, ['.css']);
    console.log('Found CSS files to process:', cssFiles.length);

    for (const file of cssFiles) {
      console.log('Processing CSS:', file);
      const content = fs.readFileSync(file, 'utf8');
      const fixedContent = fixCssPaths(content);
      if (content !== fixedContent) {
        fs.writeFileSync(file, fixedContent, 'utf8');
        console.log('Fixed paths in:', file);
      }
    }
  }

  console.log('✅ All files processed successfully');
}

main();