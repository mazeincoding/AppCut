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

// Fix paths in HTML content
function fixPaths(content) {
  // First pass: Fix all href and src attributes
  content = content
    // Fix href attributes with root paths
    .replace(/href="\/(_next|icons|manifest|browserconfig|favicon)/g, 'href="app://$1')
    // Fix src attributes with root paths
    .replace(/src="\/(_next|logo|landing)/g, 'src="app://$1')
    // Fix content attributes for meta tags
    .replace(/content="\/(_next|icons|browserconfig)/g, 'content="app://$1');

  // Second pass: Fix paths in inline JavaScript
  // This is needed for Next.js script chunks
  content = content
    // Fix static chunk paths in inline scripts
    .replace(/"static\/chunks\//g, '"app://_next/static/chunks/')
    .replace(/'static\/chunks\//g, "'app://_next/static/chunks/")
    // Fix _next paths in inline scripts
    .replace(/"\/_next\/static\//g, '"app://_next/static/')
    .replace(/'\/_next\/static\//g, "'app://_next/static/")
    // Fix CSS paths in inline scripts
    .replace(/\["\/_next\/static\/css\//g, '["app://_next/static/css/')
    .replace(/HL\["\/_next\/static\/css\//g, 'HL["app://_next/static/css/');

  return content;
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