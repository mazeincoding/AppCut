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

// Fix paths in HTML content - much simpler approach
function fixPaths(content) {
  // Only fix src and href attributes that start with / or ./
  return content
    // Fix href attributes
    .replace(/href="\/([^"]+)"/g, 'href="app://$1"')
    .replace(/href="\.\/([^"]+)"/g, 'href="app://$1"')
    // Fix src attributes
    .replace(/src="\/([^"]+)"/g, 'src="app://$1"')
    .replace(/src="\.\/([^"]+)"/g, 'src="app://$1"')
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
}

main();