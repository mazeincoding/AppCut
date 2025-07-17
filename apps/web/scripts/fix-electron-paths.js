const fs = require('fs');
const path = require('path');

// Function to recursively find all HTML and TXT files
function findFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findFiles(fullPath));
    } else if (item.endsWith('.html') || item.endsWith('.txt')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Fix paths in HTML content
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