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

// Detect patterns that could cause issues in Electron
function validateUrls(content, filePath) {
  const issues = [];
  
  // Define problematic patterns
  const problematicPatterns = [
    {
      pattern: /app:\/\/[^\/\s"']*\/app:\/\//g,
      description: 'Double protocol detected'
    },
    {
      pattern: /app:\/\/_next\/app:\/\//g,
      description: 'Double protocol in _next paths'
    },
    {
      pattern: /app:\/\/[^\/\s"']*index\.html\/app:\/\//g,
      description: 'Path concatenation with index.html detected'
    },
    {
      pattern: /window\.location\.href\s*=\s*["'][^"']*(?<!app:\/\/)\//g,
      description: 'Relative path assignment in window.location.href'
    },
    {
      pattern: /location\.href\s*=\s*["'][^"']*(?<!app:\/\/)\//g,
      description: 'Relative path assignment in location.href'
    },
    {
      pattern: /href\s*=\s*["']\/[^"']*(?<!app:\/\/)/g,
      description: 'Root-relative href without app:// protocol'
    },
    {
      pattern: /src\s*=\s*["']\/[^"']*(?<!app:\/\/)/g,
      description: 'Root-relative src without app:// protocol'
    },
    {
      pattern: /url\(\/[^)]*(?<!app:\/\/)/g,
      description: 'CSS url() with root-relative path'
    },
    {
      pattern: /fetch\(["']\/[^"']*(?<!app:\/\/)/g,
      description: 'Fetch with root-relative path'
    },
    {
      pattern: /import\(["']\/[^"']*(?<!app:\/\/)/g,
      description: 'Dynamic import with root-relative path'
    },
    {
      pattern: /"\/(?!app:\/\/)[^"]*_next/g,
      description: 'Next.js path without app:// protocol'
    },
    {
      pattern: /'\/(?!app:\/\/)[^']*_next/g,
      description: 'Next.js path without app:// protocol (single quotes)'
    },
    {
      pattern: /app:\/\/\/+/g,
      description: 'Multiple forward slashes after app:// protocol'
    },
    {
      pattern: /app:\/\/[^\/\s"']*\/{2,}/g,
      description: 'Multiple consecutive slashes in app:// URL'
    }
  ];

  // Check each pattern
  problematicPatterns.forEach(({ pattern, description }) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const lineStart = content.lastIndexOf('\n', match.index) + 1;
      const lineEnd = content.indexOf('\n', match.index);
      const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
      
      issues.push({
        file: filePath,
        line: lineNumber,
        description,
        match: match[0],
        context: line.trim()
      });
    }
  });

  return issues;
}

// Main validation function
function main() {
  const outDir = path.join(__dirname, '../out');

  if (!fs.existsSync(outDir)) {
    console.log('❌ Output directory does not exist:', outDir);
    return;
  }

  const files = findFiles(outDir);
  console.log(`🔍 Scanning ${files.length} files for URL issues...`);

  let totalIssues = 0;
  const issuesByType = {};

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const issues = validateUrls(content, file);
      
      if (issues.length > 0) {
        console.log(`\n⚠️  Issues found in: ${path.relative(outDir, file)}`);
        
        issues.forEach(issue => {
          console.log(`   Line ${issue.line}: ${issue.description}`);
          console.log(`   Match: "${issue.match}"`);
          console.log(`   Context: ${issue.context}`);
          console.log('');
          
          // Count issues by type
          issuesByType[issue.description] = (issuesByType[issue.description] || 0) + 1;
          totalIssues++;
        });
      }
    } catch (error) {
      console.log(`❌ Error reading file ${file}:`, error.message);
    }
  }

  // Summary
  console.log('\n📊 Validation Summary:');
  console.log(`   Files scanned: ${files.length}`);
  console.log(`   Total issues: ${totalIssues}`);
  
  if (totalIssues > 0) {
    console.log('\n📈 Issues by type:');
    Object.entries(issuesByType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    console.log('\n❌ URL validation failed - issues found that may cause Electron navigation problems');
    process.exit(1);
  } else {
    console.log('✅ All URLs validated successfully - no issues found');
  }
}

main();