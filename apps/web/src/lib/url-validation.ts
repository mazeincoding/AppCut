/**
 * URL Validation Middleware for Electron App Protocol
 * 
 * Provides runtime validation for app:// URLs to catch malformed patterns
 * that could cause navigation failures in Electron environments.
 */

export interface UrlValidationResult {
  valid: boolean;
  issues: string[];
  originalUrl: string;
  correctedUrl?: string;
}

export interface UrlValidationOptions {
  autoFix?: boolean;
  logIssues?: boolean;
  throwOnInvalid?: boolean;
}

/**
 * Validates and optionally fixes app:// URLs
 */
export function validateAppUrl(
  url: string, 
  options: UrlValidationOptions = {}
): UrlValidationResult {
  const { autoFix = true, logIssues = true, throwOnInvalid = false } = options;
  const issues: string[] = [];
  let correctedUrl = url;

  // Skip validation for external URLs and special schemes
  if (isExternalUrl(url) || isSpecialScheme(url)) {
    return { valid: true, issues: [], originalUrl: url };
  }

  // Check 1: Protocol not at start
  if (url.includes('app://') && !url.startsWith('app://')) {
    issues.push('Protocol not at start of URL');
    if (autoFix) {
      // Extract the app:// part and move it to the start
      const appIndex = url.indexOf('app://');
      correctedUrl = 'app://' + url.substring(appIndex + 6);
    }
  }

  // Check 2: Multiple protocols
  const protocolMatches = (url.match(/app:\/\//g) || []);
  if (protocolMatches.length > 1) {
    issues.push(`Multiple protocols found (${protocolMatches.length} instances)`);
    if (autoFix) {
      // Keep only the first protocol and clean up the rest
      correctedUrl = correctedUrl.replace(/app:\/\/.*?app:\/\//g, 'app://');
    }
  }

  // Check 3: Protocol in path (e.g., /app://)
  if (url.includes('/app://')) {
    issues.push('Protocol found in path');
    if (autoFix) {
      // Replace /app:// with app://
      correctedUrl = correctedUrl.replace(/\/app:\/\//g, 'app://');
    }
  }

  // Check 4: Multiple forward slashes after protocol
  if (url.includes('app:///')) {
    issues.push('Multiple forward slashes after protocol');
    if (autoFix) {
      // Normalize to single slash
      correctedUrl = correctedUrl.replace(/app:\/\/\/+/g, 'app:///');
    }
  }

  // Check 5: Double slashes in path
  if (/app:\/\/[^\/]*\/\//.test(url)) {
    issues.push('Double slashes found in URL path');
    if (autoFix) {
      // Replace double slashes with single slashes (except after protocol)
      correctedUrl = correctedUrl.replace(/(app:\/\/[^\/]*?)\/\/+/g, '$1/');
    }
  }

  // Check 6: Root-relative path without protocol
  if (url.startsWith('/') && !url.startsWith('app://')) {
    issues.push('Root-relative path should use app:// protocol');
    if (autoFix) {
      correctedUrl = 'app://' + url;
    }
  }

  const isValid = issues.length === 0;

  // Logging
  if (!isValid && logIssues) {
    console.warn('[URL Validation]', {
      originalUrl: url,
      issues,
      correctedUrl: autoFix ? correctedUrl : undefined
    });
  }

  // Error handling
  if (!isValid && throwOnInvalid) {
    throw new Error(`Invalid app:// URL: ${url}. Issues: ${issues.join(', ')}`);
  }

  return {
    valid: isValid,
    issues,
    originalUrl: url,
    correctedUrl: autoFix && !isValid ? correctedUrl : undefined
  };
}

/**
 * Validates and auto-fixes URLs, returning the corrected URL
 */
export function sanitizeAppUrl(url: string): string {
  const result = validateAppUrl(url, { autoFix: true, logIssues: false });
  return result.correctedUrl || url;
}

/**
 * Middleware function for intercepting navigation and fixing URLs
 */
export function createUrlValidationMiddleware(options: UrlValidationOptions = {}) {
  return function validateUrl(url: string): string {
    const result = validateAppUrl(url, options);
    return result.correctedUrl || url;
  };
}

/**
 * React hook for URL validation in components
 */
export function useUrlValidation(url: string, options?: UrlValidationOptions) {
  const result = validateAppUrl(url, options);
  return {
    isValid: result.valid,
    issues: result.issues,
    validatedUrl: result.correctedUrl || url,
    originalUrl: url
  };
}

/**
 * Patches window.location assignment to validate URLs (Electron-safe)
 */
export function patchLocationAssignment() {
  if (typeof window === 'undefined') return;

  try {
    const originalAssign = window.location.assign.bind(window.location);
    const originalReplace = window.location.replace.bind(window.location);
    
    // Try to patch window.location.assign (may fail in Electron)
    try {
      Object.defineProperty(window.location, 'assign', {
        value: function(url: string) {
          const sanitized = sanitizeAppUrl(url);
          return originalAssign(sanitized);
        },
        writable: false,
        configurable: false
      });
    } catch (e) {
      console.warn('[URL Validation] Cannot patch location.assign in Electron, using fallback');
      // Fallback: Create a global navigation helper
      (window as any).__urlValidationNavigate = function(url: string) {
        const sanitized = sanitizeAppUrl(url);
        try {
          window.location.href = sanitized;
        } catch (navError) {
          console.warn('[URL Validation] Navigation fallback failed:', navError);
        }
      };
    }

    // Try to patch window.location.replace (may fail in Electron)
    try {
      Object.defineProperty(window.location, 'replace', {
        value: function(url: string) {
          const sanitized = sanitizeAppUrl(url);
          return originalReplace(sanitized);
        },
        writable: false,
        configurable: false
      });
    } catch (e) {
      console.warn('[URL Validation] Cannot patch location.replace in Electron');
    }

    // Try to patch href setter (may fail in Electron)
    try {
      let hrefValue = window.location.href;
      Object.defineProperty(window.location, 'href', {
        get() { return hrefValue; },
        set(url: string) {
          const sanitized = sanitizeAppUrl(url);
          hrefValue = sanitized;
          try {
            originalAssign(sanitized);
          } catch (e) {
            console.warn('[URL Validation] href assignment failed:', e);
          }
        },
        configurable: false
      });
    } catch (e) {
      console.warn('[URL Validation] Cannot patch location.href in Electron');
    }
  } catch (e) {
    console.warn('[URL Validation] Location patching failed completely:', e);
  }
}

/**
 * Helper functions
 */
function isExternalUrl(url: string): boolean {
  return /^https?:\/\//.test(url) || /^mailto:/.test(url) || /^tel:/.test(url);
}

function isSpecialScheme(url: string): boolean {
  return /^(data:|blob:|javascript:|#)/.test(url);
}

/**
 * Electron-specific URL validation
 */
export function isValidElectronUrl(url: string): boolean {
  // Allow app:// protocol URLs
  if (url.startsWith('app://')) {
    return !validateAppUrl(url, { logIssues: false }).issues.length;
  }
  
  // Allow external URLs
  if (isExternalUrl(url) || isSpecialScheme(url)) {
    return true;
  }
  
  // Reject other protocols
  return false;
}

/**
 * Batch validate multiple URLs
 */
export function validateUrlBatch(urls: string[], options?: UrlValidationOptions) {
  return urls.map(url => validateAppUrl(url, options));
}

/**
 * Development helper - logs all URL validation issues
 */
export function enableUrlValidationDebug() {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.log('[URL Validation] Debug mode enabled');
  
  // Intercept fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input.toString();
    validateAppUrl(url, { logIssues: true });
    return originalFetch(input, init);
  };
}