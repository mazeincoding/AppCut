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
    if (!url || url.startsWith('http') || (url.startsWith('file://') && url.includes('.html'))) {
      return url;
    }

    console.log('🔧 [NAV-FIX] Fixing path:', url, 'from currentDir:', currentDir);

    // 获取应用根目录（out目录）- 修复路径解析
    let appRoot = currentDir;

    // 标准化路径分隔符
    const normalizedDir = currentDir.replace(/\\/g, '/');

    // 查找 out 目录的位置
    if (normalizedDir.includes('/out/')) {
      // 找到 /out/ 目录，获取到 out 目录的完整路径
      const outIndex = normalizedDir.indexOf('/out/');
      appRoot = currentDir.substring(0, outIndex + 4); // +4 包含 '/out'
    } else if (normalizedDir.includes('/out')) {
      // 找到 /out 目录（可能在末尾）
      const outIndex = normalizedDir.indexOf('/out');
      appRoot = currentDir.substring(0, outIndex + 4); // +4 包含 '/out'
    } else {
      // 如果没有找到out目录，使用当前目录的父目录
      appRoot = currentDir.substring(0, currentDir.lastIndexOf('/'));
    }

    console.log('🔧 [NAV-FIX] App root determined as:', appRoot);

    // 处理相对路径
    if (url.startsWith('./')) {
      const cleanPath = url.substring(2);
      const fixedUrl = `${currentDir}/${cleanPath}.html`;
      console.log('🔧 [NAV-FIX] Relative path fixed:', url, '→', fixedUrl);
      return fixedUrl;
    }

    // 处理绝对路径 - 关键修复
    if (url.startsWith('/')) {
      const cleanPath = url.substring(1);

      // 特殊处理动态路由
      if (cleanPath.startsWith('editor/project/')) {
        // 对于 /editor/project/[id] 路由，导航到 [project_id].html
        const fixedUrl = `${appRoot}/editor/project/[project_id].html`;
        console.log('🔧 [NAV-FIX] Dynamic route fixed:', url, '→', fixedUrl);
        return fixedUrl;
      }

      // 确保使用应用根目录而不是当前目录
      const fixedUrl = `${appRoot}/${cleanPath}.html`;
      console.log('🔧 [NAV-FIX] Absolute path fixed:', url, '→', fixedUrl);
      return fixedUrl;
    }

    // 处理直接路径名
    if (!url.includes('.') && !url.includes('/')) {
      const fixedUrl = `${currentDir}/${url}.html`;
      console.log('🔧 [NAV-FIX] Direct path fixed:', url, '→', fixedUrl);
      return fixedUrl;
    }

    console.log('🔧 [NAV-FIX] Path unchanged:', url);
    return url;
  }

  // 拦截所有点击事件 - 使用最高优先级捕获
  document.addEventListener('click', function (event) {
    const target = event.target.closest('a, button');
    if (!target) return;

    // 处理链接
    if (target.tagName === 'A') {
      const href = target.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        // 完全阻止事件传播，防止其他处理器执行
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const fixedUrl = fixPath(href);
        console.log('🔗 [NAV-FIX] Link click intercepted:', href, '→', fixedUrl);

        // 延迟导航以确保事件完全被消费
        setTimeout(() => {
          window.location.href = fixedUrl;
        }, 0);
        return false;
      }
    }

    // 处理按钮（可能有导航逻辑）
    if (target.tagName === 'BUTTON') {
      // 特殊处理 Projects 按钮 - 最高优先级
      if (target.textContent && target.textContent.includes('Projects')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const projectsUrl = `${currentDir}/projects.html`;
        console.log('🎯 [NAV-FIX] Direct Projects button navigation:', projectsUrl);

        setTimeout(() => {
          window.location.href = projectsUrl;
        }, 0);
        return false;
      }

      // 检查是否有 data-navigate 属性
      const navigate = target.getAttribute('data-navigate');
      if (navigate) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const fixedUrl = fixPath(navigate);
        console.log('🔗 [NAV-FIX] Button navigate intercepted:', navigate, '→', fixedUrl);

        setTimeout(() => {
          window.location.href = fixedUrl;
        }, 0);
        return false;
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
        console.log('🔗 [NAV-FIX] history.pushState intercepted:', url, '→', fixedUrl);
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
        console.log('🔗 [NAV-FIX] history.replaceState intercepted:', url, '→', fixedUrl);
        window.location.href = fixedUrl;
        return;
      }
    }
    return originalReplaceState.call(this, state, title, url);
  };

  // 拦截 window.location.href 设置 - 使用更安全的方法
  let isNavigating = false;

  // 创建一个代理来拦截 location.href 的设置
  let locationHrefSetter;

  try {
    // 尝试获取 location.href 的 setter
    const locationDescriptor = Object.getOwnPropertyDescriptor(window.location, 'href') ||
      Object.getOwnPropertyDescriptor(Location.prototype, 'href');

    if (locationDescriptor && locationDescriptor.set) {
      locationHrefSetter = locationDescriptor.set;

      // 重写 location.href setter
      Object.defineProperty(window.location, 'href', {
        get: locationDescriptor.get,
        set: function (url) {
          if (isNavigating) {
            return locationHrefSetter.call(this, url);
          }

          const fixedUrl = fixPath(url);
          if (fixedUrl !== url) {
            console.log('🔗 [NAV-FIX] location.href intercepted:', url, '→', fixedUrl);
            isNavigating = true;
            locationHrefSetter.call(this, fixedUrl);
            isNavigating = false;
          } else {
            locationHrefSetter.call(this, url);
          }
        },
        configurable: true
      });
    }
  } catch (error) {
    console.log('🔧 [NAV-FIX] Could not intercept location.href:', error.message);
  }

  // 拦截 Next.js Router 如果存在
  if (window.next && window.next.router) {
    const originalPush = window.next.router.push;
    const originalReplace = window.next.router.replace;

    window.next.router.push = function (url, as, options) {
      const fixedUrl = fixPath(url);
      if (fixedUrl !== url) {
        console.log('🔗 [NAV-FIX] Next.js router.push intercepted:', url, '→', fixedUrl);
        window.location.href = fixedUrl;
        return;
      }
      return originalPush.call(this, url, as, options);
    };

    window.next.router.replace = function (url, as, options) {
      const fixedUrl = fixPath(url);
      if (fixedUrl !== url) {
        console.log('🔗 [NAV-FIX] Next.js router.replace intercepted:', url, '→', fixedUrl);
        window.location.href = fixedUrl;
        return;
      }
      return originalReplace.call(this, url, as, options);
    };
  }

  // 监听 popstate 事件并修复
  window.addEventListener('popstate', function (event) {
    const currentUrl = window.location.href;
    const fixedUrl = fixPath(currentUrl);
    if (fixedUrl !== currentUrl && !currentUrl.includes('.html')) {
      console.log('🔗 [NAV-FIX] popstate intercepted:', currentUrl, '→', fixedUrl);
      event.preventDefault();
      window.location.href = fixedUrl;
    }
  }, true);

  console.log('✅ [NAV-FIX] Navigation fix initialized');
}

// 暴露修复函数到全局，以防其他代码需要
window.fixElectronPath = function (url) {
  const currentDir = window.location.href.substring(0, window.location.href.lastIndexOf('/'));

  if (!url || url.startsWith('http') || (url.startsWith('file://') && url.includes('.html'))) {
    return url;
  }

  // 获取应用根目录（out目录）- 使用改进的路径解析
  let appRoot = currentDir;

  // 标准化路径分隔符
  const normalizedDir = currentDir.replace(/\\/g, '/');

  // 查找 out 目录的位置
  if (normalizedDir.includes('/out/')) {
    // 找到 /out/ 目录，获取到 out 目录的完整路径
    const outIndex = normalizedDir.indexOf('/out/');
    appRoot = currentDir.substring(0, outIndex + 4); // +4 包含 '/out'
  } else if (normalizedDir.includes('/out')) {
    // 找到 /out 目录（可能在末尾）
    const outIndex = normalizedDir.indexOf('/out');
    appRoot = currentDir.substring(0, outIndex + 4); // +4 包含 '/out'
  } else {
    // 如果没有找到out目录，使用当前目录的父目录
    appRoot = currentDir.substring(0, currentDir.lastIndexOf('/'));
  }

  if (url.startsWith('./')) {
    const cleanPath = url.substring(2);
    return `${currentDir}/${cleanPath}.html`;
  }

  if (url.startsWith('/')) {
    const cleanPath = url.substring(1);

    // 特殊处理动态路由
    if (cleanPath.startsWith('editor/project/')) {
      // 对于 /editor/project/[id] 路由，导航到 [project_id].html
      return `${appRoot}/editor/project/[project_id].html`;
    }

    // 确保使用应用根目录而不是当前目录
    return `${appRoot}/${cleanPath}.html`;
  }

  if (!url.includes('.') && !url.includes('/')) {
    return `${currentDir}/${url}.html`;
  }

  return url;
};

console.log('✅ [NAV-FIX] Navigation fix script loaded');