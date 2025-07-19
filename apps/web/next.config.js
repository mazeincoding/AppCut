// next.config.js - 简化的静态导出配置
const isElectron = process.env.NEXT_PUBLIC_ELECTRON === 'true';

module.exports = {
  output: 'export',
  // 不设置 assetPrefix 以避免 next/font 错误，改用后处理脚本修复路径
  assetPrefix: isElectron ? undefined : undefined,
  trailingSlash: false,
  images: {
    unoptimized: true
  },
  distDir: 'out'
};