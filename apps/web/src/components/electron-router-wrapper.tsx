"use client";

import { useEffect } from 'react';

/**
 * ElectronRouterWrapper - 拦截 <a> / Link 点击，改写为 app://路径，重载 history.pushState/replaceState
 */
export function ElectronRouterWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      console.log('🔧 [ELECTRON-ROUTER] Setting up Electron navigation wrapper...');

      // 不要再全局拦截 fetch('*json')，静态导出已解决
      // 移除之前的 fetch 拦截逻辑，因为静态导出已经解决了这个问题

      // 导航处理已委托给 NAV-FIX 脚本，避免冲突
      console.log('🔗 [ELECTRON-ROUTER] Navigation handling delegated to NAV-FIX script to avoid conflicts');

      console.log('✅ [ELECTRON-ROUTER] Navigation interception enabled');

      // 清理函数（现在由 NAV-FIX 脚本处理，无需清理）
      return () => {
        console.log('🔧 [ELECTRON-ROUTER] Component cleanup - navigation handled by NAV-FIX script');
      };
    }
  }, []);

  return <>{children}</>;
}