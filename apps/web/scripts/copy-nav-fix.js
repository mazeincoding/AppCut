/**
 * 复制导航修复脚本到输出目录
 * 在构建后自动运行
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 [COPY-NAV-FIX] Copying navigation fix script to output directory...');

// 确保输出目录存在
const outElectronDir = path.join(__dirname, '../out/electron');
if (!fs.existsSync(outElectronDir)) {
  console.log(`📁 Creating directory: ${outElectronDir}`);
  fs.mkdirSync(outElectronDir, { recursive: true });
}

// 复制导航修复脚本
const sourceFile = path.join(__dirname, '../electron/navigation-fix.js');
const destFile = path.join(outElectronDir, 'navigation-fix.js');

try {
  fs.copyFileSync(sourceFile, destFile);
  console.log(`✅ [COPY-NAV-FIX] Successfully copied: ${sourceFile} → ${destFile}`);
} catch (error) {
  console.error(`❌ [COPY-NAV-FIX] Error copying file: ${error.message}`);
  process.exit(1);
}

console.log('✅ [COPY-NAV-FIX] Navigation fix script copied successfully!');