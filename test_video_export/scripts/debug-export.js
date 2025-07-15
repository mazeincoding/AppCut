#!/usr/bin/env node

/**
 * Debug Export Console Log Analyzer
 * Analyzes browser console logs for video export issues
 */

console.log('🔍 Video Export Debug Analyzer');
console.log('===============================');
console.log('');
console.log('📋 Instructions:');
console.log('1. Open Chrome and go to: http://localhost:3000');
console.log('2. Open DevTools (F12) and go to Console tab');
console.log('3. Upload your test video: input/generated_4a2ba290.mp4');
console.log('4. Add video to timeline');
console.log('5. Click Export > Start Export');
console.log('6. Copy ALL console output to a text file');
console.log('7. Run this script with the log file path as argument');
console.log('');
console.log('Example: node debug-export.js /path/to/console-logs.txt');
console.log('');

const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
  console.log('❌ Please provide the console log file path');
  console.log('Usage: node debug-export.js <log-file-path>');
  process.exit(1);
}

const logFilePath = process.argv[2];

if (!fs.existsSync(logFilePath)) {
  console.error(`❌ Log file not found: ${logFilePath}`);
  process.exit(1);
}

console.log(`📄 Reading log file: ${logFilePath}`);
const logContent = fs.readFileSync(logFilePath, 'utf8');

console.log('');
console.log('🔍 Analyzing Export Issues...');
console.log('');

// Analyze duration issues
console.log('📊 DURATION ANALYSIS:');
console.log('=====================');

const durationMatches = logContent.match(/⏰ Duration analysis: (.*)/g);
if (durationMatches) {
  durationMatches.forEach(match => {
    try {
      const dataStr = match.split('⏰ Duration analysis: ')[1];
      const data = JSON.parse(dataStr);
      console.log(`✅ Found duration data:`, data);
      
      if (data.passedDuration > 15) {
        console.log(`🚨 ISSUE: Duration is too long! Expected ~10s, got ${data.passedDuration}s`);
      }
      
      if (data.totalFrames > 300) { // 10s at 30fps = 300 frames
        console.log(`🚨 ISSUE: Too many frames! Expected ~300, got ${data.totalFrames}`);
      }
    } catch (e) {
      console.warn('❌ Could not parse duration data:', match);
    }
  });
} else {
  console.log('❌ No duration analysis found in logs');
}

console.log('');
console.log('📋 TIMELINE ELEMENTS ANALYSIS:');
console.log('===============================');

const timelineMatches = logContent.match(/📋 Timeline elements: (.*)/g);
if (timelineMatches) {
  timelineMatches.forEach(match => {
    try {
      const dataStr = match.split('📋 Timeline elements: ')[1];
      const elements = JSON.parse(dataStr);
      console.log(`✅ Found ${elements.length} timeline elements:`);
      
      elements.forEach((el, i) => {
        console.log(`  ${i + 1}. ID: ${el.id}`);
        console.log(`     Type: ${el.type}`);
        console.log(`     Start: ${el.startTime}s`);
        console.log(`     End: ${el.endTime}s`);
        console.log(`     Duration: ${el.duration}s`);
        console.log(`     Trim Start: ${el.trimStart || 0}s`);
        console.log(`     Trim End: ${el.trimEnd || 0}s`);
        
        // Check for issues
        if (el.duration > 15) {
          console.log(`     🚨 ISSUE: Element duration too long! Expected ~10s, got ${el.duration}s`);
        }
        
        if (el.endTime && (el.endTime - el.startTime) > 15) {
          console.log(`     🚨 ISSUE: Element timeline span too long! Span: ${el.endTime - el.startTime}s`);
        }
        
        console.log('');
      });
      
    } catch (e) {
      console.warn('❌ Could not parse timeline elements:', match);
    }
  });
} else {
  console.log('❌ No timeline elements found in logs');
}

console.log('');
console.log('⚪ WHITE FRAME ANALYSIS:');
console.log('========================');

const whiteFrames = logContent.match(/⚠️ WHITE FRAME DETECTED.*$/gm);
if (whiteFrames) {
  console.log(`🚨 Found ${whiteFrames.length} white frames!`);
  whiteFrames.slice(0, 5).forEach((frame, i) => { // Show first 5
    console.log(`  ${i + 1}. ${frame}`);
  });
  
  if (whiteFrames.length > 5) {
    console.log(`  ... and ${whiteFrames.length - 5} more white frames`);
  }
} else {
  console.log('✅ No white frames detected');
}

console.log('');
console.log('🎬 VIDEO RENDERING ANALYSIS:');
console.log('=============================');

const videoRenderingCount = (logContent.match(/🎬 Using preloaded video/g) || []).length;
const placeholderCount = (logContent.match(/📦 Drew placeholder rectangle/g) || []).length;

console.log(`✅ Video frames rendered: ${videoRenderingCount}`);
console.log(`❌ Placeholder frames: ${placeholderCount}`);

if (placeholderCount > 0) {
  console.log('🚨 ISSUE: Some frames are showing placeholders instead of video!');
}

console.log('');
console.log('🎯 SEEKING ACCURACY ANALYSIS:');
console.log('==============================');

const seekAccuracyMatches = logContent.match(/✅ Video seeked to .*, diff: ([0-9.]+)s/g);
if (seekAccuracyMatches) {
  const diffs = seekAccuracyMatches.map(match => {
    const diffMatch = match.match(/diff: ([0-9.]+)s/);
    return diffMatch ? parseFloat(diffMatch[1]) : 0;
  });
  
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const maxDiff = Math.max(...diffs);
  
  console.log(`✅ Analyzed ${diffs.length} seeking operations`);
  console.log(`📊 Average seeking accuracy: ${avgDiff.toFixed(4)}s`);
  console.log(`📊 Maximum seeking difference: ${maxDiff.toFixed(4)}s`);
  
  if (maxDiff > 0.1) {
    console.log('⚠️ Some seeking operations were inaccurate (>0.1s difference)');
  }
} else {
  console.log('❌ No seeking accuracy data found');
}

console.log('');
console.log('📊 SUMMARY:');
console.log('============');

if (durationMatches) {
  console.log('✅ Duration analysis: Available');
} else {
  console.log('❌ Duration analysis: Missing - check if export was started');
}

if (whiteFrames && whiteFrames.length > 0) {
  console.log(`🚨 White frames: ${whiteFrames.length} detected`);
} else {
  console.log('✅ White frames: None detected');
}

if (placeholderCount > 0) {
  console.log(`🚨 Placeholder frames: ${placeholderCount} detected`);
} else {
  console.log('✅ Placeholder frames: None detected');
}

console.log('');
console.log('💡 NEXT STEPS:');
console.log('===============');
console.log('1. If duration is too long: Check timeline element durations and trim values');
console.log('2. If white frames detected: Check element visibility timing');
console.log('3. If placeholder frames: Check video preloading and seeking accuracy');
console.log('4. Share this analysis output for further diagnosis');