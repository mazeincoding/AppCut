const fs = require('fs');
const path = require('path');

// Function to recursively find all HTML, TXT, CSS, and JS files
function findFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findFiles(fullPath));
    } else if (item.endsWith('.html') || item.endsWith('.txt') || item.endsWith('.css') || item.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Fix paths in HTML and CSS content
function fixPaths(content) {
  return content
    // Fix main _next paths to use app:// protocol
    .replace(/href="\/_next\//g, 'href="app://_next/')
    .replace(/src="\/_next\//g, 'src="app://_next/')
    // Fix root-relative paths to use app:// protocol
    .replace(/href="\/([^\/])/g, 'href="app://$1')
    .replace(/src="\/([^\/])/g, 'src="app://$1')
    // Fix inline JavaScript paths
    .replace(/\\\\\"\/_next\//g, '\\\\"app:\\/\\/_next\\/')
    .replace(/"\/_next\//g, '"app://_next/')
    .replace(/:HL\["\/_next\//g, ':HL["app://_next/')
    // Fix dynamic imports and preload paths
    .replace(/"\/static\//g, '"app://static/')
    .replace(/href="\/static\//g, 'href="app://static/')
    .replace(/src="\/static\//g, 'src="app://static/')
    // Fix CSS background images and font paths
    .replace(/url\(\/static\//g, 'url(app://static/')
    .replace(/url\(\/_next\//g, 'url(app://_next/')
    // Fix font preload paths in HTML
    .replace(/href="\/_next\/static\/media\//g, 'href="app://_next/static/media/')
    // Fix JavaScript fetch/import paths
    .replace(/fetch\("\/([^"]*?)"\)/g, 'fetch("app://$1")')
    .replace(/import\("\/([^"]*?)"\)/g, 'import("app://$1")')
    // Remove external analytics scripts for Electron
    .replace(/<link rel="preload" href="https:\/\/cdn\.databuddy\.cc\/databuddy\.js"[^>]*>/g, '')
    .replace(/<script[^>]*src="https:\/\/cdn\.databuddy\.cc\/databuddy\.js"[^>]*>[\s\S]*?<\/script>/g, '')
    // Remove inline databuddy references in JavaScript
    .replace(/\\"src\\":\\"https:\/\/cdn\.databuddy\.cc\/databuddy\.js\\"/g, '\\"src\\":\\"\\"')
    .replace(/,\\"data-client-id\\":\\"[^"]*\\"/g, '')
    .replace(/,\\"data-track-[^"]*\\":(true|false)/g, '')
    // Fix remaining icon paths  
    .replace(/href="\/favicon/g, 'href="app://favicon')
    .replace(/href="\/icons\//g, 'href="app://icons/')
    .replace(/href="\/manifest\.json"/g, 'href="app://manifest.json"')
    .replace(/href="\/browserconfig\.xml"/g, 'href="app://browserconfig.xml"')
    .replace(/content="\/browserconfig\.xml"/g, 'content="app://browserconfig.xml"')
    // Fix Next.js router paths
    .replace(/"_next\/static\//g, '"app://_next/static/')
    .replace(/'_next\/static\//g, "'app://_next/static/")
    // Fix inline JavaScript chunk references
    .replace(/"static\/chunks\//g, '"app://_next/static/chunks/')
    .replace(/'static\/chunks\//g, "'app://_next/static/chunks/")
    // Enhanced detection patterns for window location assignments
    .replace(/window\.location\.href\s*=\s*["'](?!app:\/\/)\//g, 'window.location.href = "app:///')
    // Fix template literals
    .replace(/`\$\{[^}]*\}\/(?!app:\/\/)/g, '`app://${...}/')
    // Fix dynamic href assignments
    .replace(/\.href\s*=\s*["'](?!app:\/\/)\//g, '.href = "app:///')
    // Fix event handler URLs
    .replace(/onclick\s*=\s*["'][^"']*location\.href\s*=\s*["'](?!app:\/\/)\//g, 'onclick="location.href=\\"app:///')
    // Fix double protocol issues (comprehensive)
    .replace(/app:\/\/[^"']*app:\/\//g, 'app://')
    .replace(/app:\/\/[^"']*\/app:\/\//g, 'app://')
    // Fix specific _next double protocol pattern
    .replace(/app:\/\/_next\/app:\/\//g, 'app://')
    // Fix malformed concatenations
    .replace(/app:\/\/[^\/\s"']*\/app:\/\//g, 'app://')
    // Fix specific pattern: app://_next/app://_next/
    .replace(/app:\/\/_next\/app:\/\/_next\//g, 'app://_next/')
    // Fix any remaining double app:// patterns in embedded JavaScript
    .replace(/"app:\/\/[^"]*app:\/\/[^"]*"/g, function(match) {
      // Extract the last valid app:// URL part
      const lastApp = match.lastIndexOf('app://');
      if (lastApp > 0) {
        return '"' + match.substring(lastApp).replace(/["']$/, '') + '"';
      }
      return match;
    })
    .replace(/'app:\/\/[^']*app:\/\/[^']*'/g, function(match) {
      // Extract the last valid app:// URL part
      const lastApp = match.lastIndexOf('app://');
      if (lastApp > 0) {
        return "'" + match.substring(lastApp).replace(/["']$/, '') + "'";
      }
      return match;
    })
    // Additional patterns found by validation script
    // Fix window.location.href assignments (more comprehensive)
    .replace(/window\.location\.href\s*=\s*["'](?!app:\/\/|https?:\/\/|mailto:|tel:)([^"']*)/g, 'window.location.href = "app://$1')
    // Fix location.href assignments  
    .replace(/location\.href\s*=\s*["'](?!app:\/\/|https?:\/\/|mailto:|tel:)([^"']*)/g, 'location.href = "app://$1')
    // Fix Next.js paths in JavaScript (double quotes)
    .replace(/"(?!app:\/\/|https?:\/\/)\/_next/g, '"app://_next')
    // Fix Next.js paths in JavaScript (single quotes)  
    .replace(/'(?!app:\/\/|https?:\/\/)\/_next/g, "'app://_next")
    // Fix encoded paths and special cases
    .replace(/"(?!app:\/\/|https?:\/\/)\/[^"]*"/g, function(match) {
      if (match.includes('%') || match.includes('\\') || match.includes('svg')) {
        return match; // Skip encoded/escaped content
      }
      return '"app://' + match.slice(2);
    })
    .replace(/'(?!app:\/\/|https?:\/\/)\/[^']*'/g, function(match) {
      if (match.includes('%') || match.includes('\\') || match.includes('svg')) {
        return match; // Skip encoded/escaped content
      }
      return "'app://" + match.slice(2);
    })
    // Fix fetch calls with root-relative paths
    .replace(/fetch\(\s*["'](?!app:\/\/|https?:\/\/)\//g, 'fetch("app:///')
    // Fix additional root-relative href patterns
    .replace(/href\s*=\s*["'](?!app:\/\/|https?:\/\/|mailto:|tel:|#)\//g, 'href="app:///')
    // Fix additional root-relative src patterns  
    .replace(/src\s*=\s*["'](?!app:\/\/|https?:\/\/)\//g, 'src="app:///')
    // Fix CSS url() patterns
    .replace(/url\(\s*["']?(?!app:\/\/|https?:\/\/|data:)\//g, 'url("app:///')
    // Fix import statements with root-relative paths
    .replace(/import\(\s*["'](?!app:\/\/|https?:\/\/)\//g, 'import("app:///')
    // Fix remaining window.location assignments (more comprehensive)
    .replace(/window\.location\.href\s*=\s*["'][^"']*["']/g, function(match) {
      if (match.includes('app://') || match.includes('http://') || match.includes('https://') || match.includes('mailto:') || match.includes('tel:')) {
        return match;
      }
      // Extract the path part
      const pathMatch = match.match(/window\.location\.href\s*=\s*["']([^"']*)/);
      if (pathMatch && pathMatch[1].startsWith('/')) {
        return match.replace(pathMatch[1], 'app://' + pathMatch[1]);
      }
      return match;
    })
    // Fix location.href assignments (more comprehensive)
    .replace(/location\.href\s*=\s*["'][^"']*["']/g, function(match) {
      if (match.includes('app://') || match.includes('http://') || match.includes('https://') || match.includes('mailto:') || match.includes('tel:')) {
        return match;
      }
      // Extract the path part
      const pathMatch = match.match(/location\.href\s*=\s*["']([^"']*)/);
      if (pathMatch && pathMatch[1].startsWith('/')) {
        return match.replace(pathMatch[1], 'app://' + pathMatch[1]);
      }
      return match;
    })
    // Fix single quoted paths more aggressively
    .replace(/'(?!app:\/\/|https?:\/\/|mailto:|tel:|data:|#|javascript:)\/[^']*'/g, function(match) {
      if (match.includes('%') || match.includes('\\') || match.includes('svg') || match.includes('xml')) {
        return match; // Skip encoded/special content
      }
      return "'app://" + match.slice(2);
    })
    // Clean up multiple forward slashes after app:// (comprehensive)
    .replace(/app:\/\/\/+/g, 'app:///')
    .replace(/app:\/\/[^\/\s"']*\/\/+/g, function(match) {
      return match.replace(/\/\/+/g, '/');
    })
    // Final cleanup pass - run at the very end
    .replace(/app:\/\/\/+/g, 'app:///')
    // Fix any remaining relative paths that should use app:// protocol
    .replace(/href="\.\/_next\//g, 'href="app://_next/')
    .replace(/src="\.\/_next\//g, 'src="app://_next/')
    .replace(/href="\.\/([^"]*?)"/g, 'href="app://$1"')
    .replace(/src="\.\/([^"]*?)"/g, 'src="app://$1"');
}

// Main function
function main() {
  const outDir = path.join(__dirname, '../out');

  if (!fs.existsSync(outDir)) {
    console.log('Output directory does not exist:', outDir);
    return;
  }

  const files = findFiles(outDir);
  console.log('Found files to process:', files.length);

  for (const file of files) {
    console.log('Processing:', file);
    const content = fs.readFileSync(file, 'utf8');
    const fixedContent = fixPaths(content);
    fs.writeFileSync(file, fixedContent, 'utf8');
    console.log('Fixed paths in:', file);
  }

  console.log('✅ All files processed successfully');
}

main();