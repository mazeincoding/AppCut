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
      
      // 拦截 <a> / Link 点击，改写为 app://路径
      const handleLinkClick = (event: Event) => {
        const target = event.target as HTMLElement;
        const link = target.closest('a[href]') as HTMLAnchorElement;
        
        if (link && link.href) {
          const href = link.getAttribute('href');
          
          // 处理内部链接（以 / 开头或相对路径）
          if (href && (href.startsWith('/') || (!href.includes('://') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')))) {
            event.preventDefault();
            
            // 转换为 app:// 协议 URL
            const cleanPath = href.startsWith('/') ? href.substring(1) : href;
            const appUrl = cleanPath ? `app://${cleanPath}/index.html` : 'app://index.html';
            
            console.log('🔗 [ELECTRON-ROUTER] Link click intercepted:', href, '→', appUrl);
            window.location.href = appUrl;
          }
        }
      };
      
      document.addEventListener('click', handleLinkClick, true);

      // 重载 history.pushState/replaceState，保持单页导航
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      history.pushState = function(state: any, title: string, url?: string | URL | null) {
        if (url && typeof url === 'string' && url.startsWith('/')) {
          const cleanPath = url.substring(1);
          const appUrl = cleanPath ? `app://${cleanPath}/index.html` : 'app://index.html';
          console.log('🔗 [ELECTRON-ROUTER] History pushState converted to:', appUrl);
          window.location.href = appUrl;
          return;
        }
        return originalPushState.call(this, state, title, url);
      };
      
      history.replaceState = function(state: any, title: string, url?: string | URL | null) {
        if (url && typeof url === 'string' && url.startsWith('/')) {
          const cleanPath = url.substring(1);
          const appUrl = cleanPath ? `app://${cleanPath}/index.html` : 'app://index.html';
          console.log('🔗 [ELECTRON-ROUTER] History replaceState converted to:', appUrl);
          window.location.href = appUrl;
          return;
        }
        return originalReplaceState.call(this, state, title, url);
      };

      console.log('✅ [ELECTRON-ROUTER] Navigation interception enabled');
      
      // 清理函数
      return () => {
        document.removeEventListener('click', handleLinkClick, true);
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;
      };
    }
  }, []);

  return <>{children}</>;
}