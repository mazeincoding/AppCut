#!/usr/bin/env node

/**
 * Video Info Checker
 * Displays information about the test video file
 */

const fs = require('fs');
const path = require('path');

const VIDEO_PATH = path.join(__dirname, '../input/generated_4a2ba290.mp4');

console.log('📹 Video File Information');
console.log('========================');

if (!fs.existsSync(VIDEO_PATH)) {
  console.error(`❌ Video file not found: ${VIDEO_PATH}`);
  process.exit(1);
}

const stats = fs.statSync(VIDEO_PATH);
const fileName = path.basename(VIDEO_PATH);
const fileExt = path.extname(VIDEO_PATH);
const fileSize = stats.size;
const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

console.log(`✅ File: ${fileName}`);
console.log(`📁 Path: ${VIDEO_PATH}`);
console.log(`📦 Size: ${fileSizeMB} MB (${fileSize} bytes)`);
console.log(`🎬 Format: ${fileExt.toUpperCase()}`);
console.log(`📅 Modified: ${stats.mtime.toISOString()}`);

// Check if file is readable
try {
  fs.accessSync(VIDEO_PATH, fs.constants.R_OK);
  console.log('✅ File is readable');
} catch (error) {
  console.error('❌ File is not readable:', error.message);
}

// Basic file validation
if (fileSize < 1000) {
  console.warn('⚠️  File seems very small (< 1KB) - might be corrupted');
} else if (fileSize > 100 * 1024 * 1024) {
  console.warn('⚠️  File is very large (> 100MB) - might take long to process');
} else {
  console.log('✅ File size looks reasonable for testing');
}

if (fileExt.toLowerCase() !== '.mp4') {
  console.warn('⚠️  File is not MP4 format - OpenCut may have compatibility issues');
} else {
  console.log('✅ MP4 format - should be compatible with OpenCut');
}

console.log('\n🎯 Video is ready for testing with OpenCut!');
console.log('\nNext steps:');
console.log('1. Run: ./quick-test.sh');
console.log('2. Or follow: MANUAL_TEST_INSTRUCTIONS.md');
console.log('3. Upload this video to OpenCut and test export');