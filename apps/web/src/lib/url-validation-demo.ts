/**
 * Demo script to test URL validation functionality
 * Run this in the browser console to see validation in action
 */

import { validateAppUrl, sanitizeAppUrl, validateUrlBatch } from './url-validation';

export function runUrlValidationDemo() {
  console.log('🔗 URL Validation Demo - Testing problematic patterns');
  
  // Test cases that match our validation findings
  const testUrls = [
    // Multiple forward slashes (13 instances found)
    'app:///path/to/resource',
    'app:////another/path',
    
    // Protocol not at start
    '/some/path/app://example.com',
    
    // Multiple protocols (found in our validation)
    'app://example.com/app://path',
    
    // Root-relative paths that need app:// protocol
    '/editor/project',
    '/_next/static/css/styles.css',
    
    // Valid URLs (should pass)
    'app://valid.com/path',
    'https://external.com',
    'mailto:test@example.com',
    '#fragment'
  ];

  console.log('\n📊 Individual URL Validation Results:');
  testUrls.forEach((url, index) => {
    const result = validateAppUrl(url, { autoFix: true, logIssues: false });
    console.log(`${index + 1}. ${url}`);
    console.log(`   Valid: ${result.valid ? '✅' : '❌'}`);
    if (!result.valid) {
      console.log(`   Issues: ${result.issues.join(', ')}`);
      console.log(`   Fixed: ${result.correctedUrl}`);
    }
    console.log('');
  });

  // Batch validation test
  console.log('\n🔄 Batch Validation Test:');
  const batchResults = validateUrlBatch(testUrls);
  const validCount = batchResults.filter(r => r.valid).length;
  const invalidCount = batchResults.length - validCount;
  
  console.log(`Total URLs: ${batchResults.length}`);
  console.log(`Valid: ${validCount}`);
  console.log(`Invalid: ${invalidCount}`);

  // Sanitization test
  console.log('\n🛠️ Sanitization Test:');
  const problematicUrls = [
    '/path/to/resource',
    'app:///multiple/slashes',
    'app://example.com/app://duplicate'
  ];
  
  problematicUrls.forEach(url => {
    const sanitized = sanitizeAppUrl(url);
    console.log(`${url} → ${sanitized}`);
  });

  console.log('\n✅ URL Validation Demo Complete');
  
  return {
    totalTested: testUrls.length,
    validUrls: validCount,
    invalidUrls: invalidCount,
    fixableUrls: batchResults.filter(r => r.correctedUrl).length
  };
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).runUrlValidationDemo = runUrlValidationDemo;
}