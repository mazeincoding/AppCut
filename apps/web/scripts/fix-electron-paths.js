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
  return content
    .replace(/href="\/_next\//g, 'href="./_next/')
    .replace(/src="\/_next\//g, 'src="./_next/')
    .replace(/href="\/([^\/])/g, 'href="./$1')
    .replace(/src="\/([^\/])/g, 'src="./$1');
}

// Main function
function main() {
  const outDir = path.join(__dirname, '../out');
  
  if (!fs.existsSync(outDir)) {
    console.log('Output directory does not exist:', outDir);
    return;
  }
  
  const htmlFiles = findHtmlFiles(outDir);
  console.log('Found HTML files:', htmlFiles.length);
  
  for (const htmlFile of htmlFiles) {
    console.log('Processing:', htmlFile);
    const content = fs.readFileSync(htmlFile, 'utf8');
    const fixedContent = fixPaths(content);
    fs.writeFileSync(htmlFile, fixedContent, 'utf8');
    console.log('Fixed paths in:', htmlFile);
  }
  
  console.log('✅ All HTML files processed successfully');
}

main();