// 简单直接的导航修复脚本
// 在页面加载后立即执行，确保所有导航都正确处理

console.log('🔧 [NAV-FIX] Starting navigation fix...');

// 等待 DOM 加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavigationFix);
} else {
  initNavigationFix();
}

function initNavigationFix() {
  console.log('🔧 [NAV-FIX] Initializing navigation fix...');

  // 获取当前目录
  const currentDir = window.location.href.substring(0, window.location.href.lastIndexOf('/'));

  // 修复路径的函数
  function fixPath(url) {
    if (!url || url.startsWith('http') || url.startsWith('file://') && url.includes('.html')) {
      return url;
    }

    // 处理相对路径
    if (url.startsWith('./')) {
      const cleanPath = url.substring(2);
      return `${currentDir}/${cleanPath}.html`;
    }

    // 处理绝对路径
    if (url.startsWith('/')) {
      const cleanPath = url.substring(1);
      return `${currentDir}/${cleanPath}.html`;
    }

    // 处理直接路径名
    if (!url.includes('.') && !url.includes('/')) {
      return `${currentDir}/${url}.html`;
    }

    return url;
  }

  // 拦截所有点击事件
  document.addEventListener('click', function (event) {
    const target = event.target.closest('a, button');
    if (!target) return;

    // 处理链接
    if (target.tagName === 'A') {
      const href = target.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        event.preventDefault();
        const fixedUrl = fixPath(href);
        console.log('🔗 [NAV-FIX] Link click:', href, '→', fixedUrl);
        window.location.href = fixedUrl;
      }
    }

    // 处理按钮（可能有导航逻辑）
    if (target.tagName === 'BUTTON') {
      // 特殊处理 Projects 按钮 - 最高优先级
      if (target.textContent && target.textContent.includes('Projects')) {
        event.preventDefault();
        event.stopPropagation();
        const projectsUrl = `${currentDir}/projects.html`;
        console.log('🎯 [NAV-FIX] Direct Projects button navigation:', projectsUrl);
        window.location.href = projectsUrl;
        return;
      }

      // 检查是否有 data-navigate 属性
      const navigate = target.getAttribute('data-navigate');
      if (navigate) {
        event.preventDefault();
        const fixedUrl = fixPath(navigate);
        console.log('🔗 [NAV-FIX] Button navigate:', navigate, '→', fixedUrl);
        window.location.href = fixedUrl;
      }
    }
  }, true);

  // 重写 location 方法
  const originalAssign = window.location.assign;
  const originalReplace = window.location.replace;

  window.location.assign = function (url) {
    const fixedUrl = fixPath(url);
    console.log('🔗 [NAV-FIX] location.assign:', url, '→', fixedUrl);
    return originalAssign.call(this, fixedUrl);
  };

  window.location.replace = function (url) {
    const fixedUrl = fixPath(url);
    console.log('🔗 [NAV-FIX] location.replace:', url, '→', fixedUrl);
    return originalReplace.call(this, fixedUrl);
  };

  // 重写 history API
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (state, title, url) {
    if (url && typeof url === 'string') {
      const fixedUrl = fixPath(url);
      if (fixedUrl !== url) {
        console.log('🔗 [NAV-FIX] history.pushState:', url, '→', fixedUrl);
        window.location.href = fixedUrl;
        return;
      }
    }
    return originalPushState.call(this, state, title, url);
  };

  history.replaceState = function (state, title, url) {
    if (url && typeof url === 'string') {
      const fixedUrl = fixPath(url);
      if (fixedUrl !== url) {
        console.log('🔗 [NAV-FIX] history.replaceState:', url, '→', fixedUrl);
        window.location.href = fixedUrl;
        return;
      }
    }
    return originalReplaceState.call(this, state, title, url);
  };

  console.log('✅ [NAV-FIX] Navigation fix initialized');
}

// 暴露修复函数到全局，以防其他代码需要
window.fixElectronPath = function (url) {
  const currentDir = window.location.href.substring(0, window.location.href.lastIndexOf('/'));

  if (!url || url.startsWith('http') || url.startsWith('file://') && url.includes('.html')) {
    return url;
  }

  if (url.startsWith('./')) {
    const cleanPath = url.substring(2);
    return `${currentDir}/${cleanPath}.html`;
  }

  if (url.startsWith('/')) {
    const cleanPath = url.substring(1);
    return `${currentDir}/${cleanPath}.html`;
  }

  if (!url.includes('.') && !url.includes('/')) {
    return `${currentDir}/${url}.html`;
  }

  return url;
};

console.log('✅ [NAV-FIX] Navigation fix script loaded');