const fs = require('fs');
const path = require('path');

// Fix asset paths in generated HTML files for Electron
function fixAssetPaths(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixAssetPaths(filePath);
    } else if (file.endsWith('.html')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace all absolute paths with relative paths
      // CSS and JS files in attributes
      content = content.replace(/href="\/_next\//g, 'href="./_next/');
      content = content.replace(/src="\/_next\//g, 'src="./_next/');
      
      // Images and icons
      content = content.replace(/href="\/favicon/g, 'href="./favicon');
      content = content.replace(/src="\/logo/g, 'src="./logo');
      content = content.replace(/src="\/([^"]*\.(png|jpg|jpeg|gif|svg))/g, 'src="./$1');
      
      // Fix paths in inline scripts and JSON data
      content = content.replace(/"\/_next\//g, '"./_next/');
      content = content.replace(/'\/_next\//g, "'./_next/");
      
      // Fix other asset references
      content = content.replace(/"\/static\//g, '"./static/');
      content = content.replace(/'\/static\//g, "'./static/");
      
      // Fix favicon in JSON data
      content = content.replace(/"href":"\/favicon/g, '"href":"./favicon');
      content = content.replace(/"src":"\/favicon/g, '"src":"./favicon');
      
      // Fix any remaining standalone asset paths
      content = content.replace(/href="\/([^"]*\.(css|js|woff2?|ttf|eot))/g, 'href="./$1"');
      content = content.replace(/src="\/([^"]*\.(js|css|woff2?|ttf|eot))/g, 'src="./$1"');
      
      // Fix paths in Next.js inline JSON data - more comprehensive
      content = content.replace(/"static\/chunks\//g, '"_next/static/chunks/');
      content = content.replace(/,\\"static\/chunks\//g, ',\\"_next/static/chunks/');
      content = content.replace(/\[\"static\/chunks\//g, '["_next/static/chunks/');
      
      // Fix favicon references in JSON metadata
      content = content.replace(/"rel":"icon","href":"\/favicon/g, '"rel":"icon","href":"./favicon');
      content = content.replace(/"href":"\/favicon\.ico"/g, '"href":"./favicon.ico"');
      
      // Fix any script or link tags that might have been missed
      content = content.replace(/<script[^>]+src="\/(?!http)/g, (match) => {
        return match.replace('src="/', 'src="./');
      });
      
      content = content.replace(/<link[^>]+href="\/(?!http)/g, (match) => {
        return match.replace('href="/', 'href="./');
      });
      
      // Fix paths in Next.js build manifest data
      content = content.replace(/\\"\/([^"]*\.(js|css|woff2?|ttf|eot))\\"/g, '\\"./$1\\"');
      content = content.replace(/\\"static\//g, '\\"_next/static/');
      
      fs.writeFileSync(filePath, content);
      console.log(`Fixed paths in ${filePath}`);
    }
  });
}

// Fix paths in the out directory
const outDir = path.join(__dirname, '../web/out');
if (fs.existsSync(outDir)) {
  fixAssetPaths(outDir);
  console.log('Asset path fixing complete!');
} else {
  console.error('Out directory not found:', outDir);
} 