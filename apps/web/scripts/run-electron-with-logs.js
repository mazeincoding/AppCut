const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Generate timestamp for log filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const logFile = path.join(process.cwd(), `electron-logs-${timestamp}.md`);

// Create markdown header
const header = `# Electron App Logs

**Date**: ${new Date().toLocaleString()}
**Command**: \`bunx electron electron/main-simple.js\`
**Working Directory**: \`${process.cwd()}\`

## Console Output

\`\`\`console
`;

fs.writeFileSync(logFile, header, 'utf8');

console.log(`🚀 Starting Electron with logging to ${logFile}...`);
console.log('Press Ctrl+C to stop and save logs.\n');

// Start Electron process
const electronProcess = spawn('bunx', ['electron', 'electron/main-simple.js'], {
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe']
});

// Create write stream for logging
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Format and write log entry
function writeLog(type, data) {
  const timestamp = new Date().toISOString().slice(11, 19);
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    const formattedLine = `[${timestamp}] ${type}: ${line}\n`;
    
    // Write to console with color
    if (type === 'ERROR') {
      process.stderr.write(`\x1b[31m${formattedLine}\x1b[0m`);
    } else {
      process.stdout.write(formattedLine);
    }
    
    // Write to log file
    logStream.write(formattedLine);
  });
}

// Handle stdout
electronProcess.stdout.on('data', (data) => {
  writeLog('LOG', data);
});

// Handle stderr
electronProcess.stderr.on('data', (data) => {
  writeLog('ERROR', data);
});

// Handle process exit
electronProcess.on('close', (code) => {
  const footer = `\`\`\`

## Summary

**End Time**: ${new Date().toLocaleString()}
**Exit Code**: ${code}
**Log File**: \`${path.basename(logFile)}\`

### Log Statistics
- Total lines: ${fs.readFileSync(logFile, 'utf8').split('\n').length}
- File size: ${(fs.statSync(logFile).size / 1024).toFixed(2)} KB

### Common Issues Found
`;

  logStream.write(footer);
  
  // Analyze logs for common issues
  const logContent = fs.readFileSync(logFile, 'utf8');
  const issues = [];
  
  if (logContent.includes('Failed to load project')) {
    issues.push('- ⚠️ Project loading failed');
  }
  if (logContent.includes('Loading editor...') && !logContent.includes('Editor content made visible')) {
    issues.push('- ⚠️ Editor stuck on loading screen');
  }
  if (logContent.includes('navigation to:')) {
    const navCount = (logContent.match(/navigation to:/g) || []).length;
    issues.push(`- ✅ ${navCount} successful navigations`);
  }
  if (logContent.includes('ERROR')) {
    const errorCount = (logContent.match(/ERROR/g) || []).length;
    issues.push(`- ❌ ${errorCount} errors detected`);
  }
  
  if (issues.length === 0) {
    issues.push('- ✅ No major issues detected');
  }
  
  logStream.write(issues.join('\n'));
  logStream.end();
  
  console.log(`\n✅ Electron closed with code ${code}`);
  console.log(`📄 Logs saved to: ${logFile}`);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping Electron...');
  electronProcess.kill('SIGTERM');
});