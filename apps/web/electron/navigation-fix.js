// Simple and direct navigation fix script
// Execute immediately after page load to ensure all navigation is handled correctly

console.log('🔧 [NAV-FIX] Starting navigation fix...');

// Wait for DOM to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavigationFix);
} else {
  initNavigationFix();
}

function initNavigationFix() {
  console.log('🔧 [NAV-FIX] Initializing navigation fix...');

  // Get current directory
  const currentDir = window.location.href.substring(0, window.location.href.lastIndexOf('/'));

  // Function to fix paths
  function fixPath(url) {
    if (!url || url.startsWith('http') || (url.startsWith('file://') && url.includes('.html'))) {
      return url;
    }

    console.log('🔧 [NAV-FIX] Fixing path:', url, 'from currentDir:', currentDir);

    // Get app root directory (out directory) - fix path resolution
    let appRoot = currentDir;

    // Normalize path separators
    const normalizedDir = currentDir.replace(/\\/g, '/');

    // Find location of out directory
    if (normalizedDir.includes('/out/')) {
      // Found /out/ directory, get full path to out directory
      const outIndex = normalizedDir.indexOf('/out/');
      appRoot = currentDir.substring(0, outIndex + 4); // +4 包含 '/out'
    } else if (normalizedDir.includes('/out')) {
      // Found /out directory (might be at the end)
      const outIndex = normalizedDir.indexOf('/out');
      appRoot = currentDir.substring(0, outIndex + 4); // +4 包含 '/out'
    } else {
      // If out directory not found, use parent directory of current directory
      appRoot = currentDir.substring(0, currentDir.lastIndexOf('/'));
    }

    console.log('🔧 [NAV-FIX] App root determined as:', appRoot);

    // Handle relative paths
    if (url.startsWith('./')) {
      const cleanPath = url.substring(2);
      const fixedUrl = `${currentDir}/${cleanPath}.html`;
      console.log('🔧 [NAV-FIX] Relative path fixed:', url, '→', fixedUrl);
      return fixedUrl;
    }

    // Handle absolute paths - key fix
    if (url.startsWith('/')) {
      const cleanPath = url.substring(1);

      // Special handling for dynamic routes
      if (cleanPath.startsWith('editor/project/')) {
        // For /editor/project/[id] route, navigate to [project_id].html
        const fixedUrl = `${appRoot}/editor/project/[project_id].html`;
        console.log('🔧 [NAV-FIX] Dynamic route fixed:', url, '→', fixedUrl);
        return fixedUrl;
      }

      // Ensure using app root directory instead of current directory
      const fixedUrl = `${appRoot}/${cleanPath}.html`;
      console.log('🔧 [NAV-FIX] Absolute path fixed:', url, '→', fixedUrl);
      return fixedUrl;
    }

    // Handle direct pathnames
    if (!url.includes('.') && !url.includes('/')) {
      const fixedUrl = `${currentDir}/${url}.html`;
      console.log('🔧 [NAV-FIX] Direct path fixed:', url, '→', fixedUrl);
      return fixedUrl;
    }

    console.log('🔧 [NAV-FIX] Path unchanged:', url);
    return url;
  }

  // Intercept all click events - use highest priority capture
  document.addEventListener('click', function (event) {
    const target = event.target.closest('a, button');
    if (!target) return;

    // Handle links
    if (target.tagName === 'A') {
      const href = target.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        // Completely stop event propagation to prevent other handlers from executing
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const fixedUrl = fixPath(href);
        console.log('🔗 [NAV-FIX] Link click intercepted:', href, '→', fixedUrl);

        // Delay navigation to ensure event is fully consumed
        setTimeout(() => {
          window.location.href = fixedUrl;
        }, 0);
        return false;
      }
    }

    // Handle buttons (may have navigation logic)
    if (target.tagName === 'BUTTON') {
      // Special handling for Projects button - highest priority
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

      // Check for data-navigate attribute
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

  // Override location methods
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

  // Override history API
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

  // Intercept window.location.href setter - use safer method
  let isNavigating = false;

  // Create a proxy to intercept location.href setter
  let locationHrefSetter;

  try {
    // Try to get location.href setter
    const locationDescriptor = Object.getOwnPropertyDescriptor(window.location, 'href') ||
      Object.getOwnPropertyDescriptor(Location.prototype, 'href');

    if (locationDescriptor && locationDescriptor.set) {
      locationHrefSetter = locationDescriptor.set;

      // Override location.href setter
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

  // Intercept Next.js Router if exists
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

  // Listen to popstate event and fix
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

// Expose fix function globally in case other code needs it
window.fixElectronPath = function (url) {
  const currentDir = window.location.href.substring(0, window.location.href.lastIndexOf('/'));

  if (!url || url.startsWith('http') || (url.startsWith('file://') && url.includes('.html'))) {
    return url;
  }

  // Get app root directory (out directory) - use improved path resolution
  let appRoot = currentDir;

  // Normalize path separators
  const normalizedDir = currentDir.replace(/\\/g, '/');

  // Find location of out directory
  if (normalizedDir.includes('/out/')) {
    // Found /out/ directory, get full path to out directory
    const outIndex = normalizedDir.indexOf('/out/');
    appRoot = currentDir.substring(0, outIndex + 4); // +4 包含 '/out'
  } else if (normalizedDir.includes('/out')) {
    // Found /out directory (might be at the end)
    const outIndex = normalizedDir.indexOf('/out');
    appRoot = currentDir.substring(0, outIndex + 4); // +4 包含 '/out'
  } else {
    // If out directory not found, use parent directory of current directory
    appRoot = currentDir.substring(0, currentDir.lastIndexOf('/'));
  }

  if (url.startsWith('./')) {
    const cleanPath = url.substring(2);
    return `${currentDir}/${cleanPath}.html`;
  }

  if (url.startsWith('/')) {
    const cleanPath = url.substring(1);

    // Special handling for dynamic routes
    if (cleanPath.startsWith('editor/project/')) {
      // For /editor/project/[id] route, navigate to [project_id].html
      return `${appRoot}/editor/project/[project_id].html`;
    }

    // Ensure using app root directory instead of current directory
    return `${appRoot}/${cleanPath}.html`;
  }

  if (!url.includes('.') && !url.includes('/')) {
    return `${currentDir}/${url}.html`;
  }

  return url;
};

console.log('✅ [NAV-FIX] Navigation fix script loaded');