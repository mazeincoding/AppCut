const fs = require('fs');
const path = require('path');

// Test script to verify image file integrity
const imagePath = path.join(__dirname, 'apps/web/out/landing-page-bg.png');

console.log('🔍 Testing image file integrity...');
console.log('Image path:', imagePath);

// Check if file exists
if (!fs.existsSync(imagePath)) {
  console.error('❌ Image file not found!');
  process.exit(1);
}

// Get file stats
const stats = fs.statSync(imagePath);
console.log('📊 File size:', stats.size, 'bytes');
console.log('📅 Modified:', stats.mtime);

// Read first few bytes to check PNG header
const buffer = fs.readFileSync(imagePath);
const header = buffer.slice(0, 8);
const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

console.log('🔍 File header (first 8 bytes):', Array.from(header).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
console.log('🔍 Expected PNG header:     ', Array.from(pngHeader).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));

if (buffer.slice(0, 8).equals(pngHeader)) {
  console.log('✅ PNG header is valid');
} else {
  console.log('❌ PNG header is invalid - file may be corrupted');
}

// Check if it's a valid image by looking for IEND chunk at the end
const iendChunk = Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
const endBytes = buffer.slice(-8);

console.log('🔍 File end (last 8 bytes): ', Array.from(endBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
console.log('🔍 Expected IEND chunk:    ', Array.from(iendChunk).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));

if (buffer.slice(-8).equals(iendChunk)) {
  console.log('✅ PNG end chunk is valid');
} else {
  console.log('❌ PNG end chunk is invalid - file may be truncated');
}

console.log('\n📋 Summary:');
console.log('- File exists:', fs.existsSync(imagePath));
console.log('- File size:', stats.size, 'bytes');
console.log('- Valid PNG header:', buffer.slice(0, 8).equals(pngHeader));
console.log('- Valid PNG ending:', buffer.slice(-8).equals(iendChunk));

if (buffer.slice(0, 8).equals(pngHeader) && buffer.slice(-8).equals(iendChunk)) {
  console.log('✅ Image file appears to be valid PNG');
} else {
  console.log('❌ Image file appears to be corrupted');
}