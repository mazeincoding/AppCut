# Task 27: Final Electron Location.assign and Font Loading Fixes

## Current Issues Analysis

Based on console output, there are 2 remaining issues preventing full Electron functionality:

### Issue 1: location.assign Property Redefinition Error ❌ CRITICAL
**Error**: `TypeError: Cannot redefine property: assign` in preload script
**Location**: `apps/web/electron/preload.js:10-12`
**Root Cause**: Attempting to redefine already-defined non-configurable property
**Impact**: Prevents proper location patching, could cause navigation issues

### Issue 2: Font Resource Loading Failure ❌ BLOCKING
**Error**: `e4af272ccee01ff0-s.p.woff2:1 Failed to load resource: net::ERR_FILE_NOT_FOUND`
**Root Cause**: Font file path not properly converted to relative in static build
**Impact**: UI rendering issues, missing fonts

### Issue 3: Next.js Data Fetching (Non-blocking) ⚠️ MINOR
**Error**: Multiple `/_next/data/electron-static-build/*.json` 404 errors
**Root Cause**: Next.js still attempting SSR data fetching in static export
**Impact**: Console noise, but app functions normally

## Relevant Files Analysis

### Primary Fix Files:
- **`apps/web/electron/preload.js`** - Preload script with location patching (lines 1-60)
- **`apps/web/scripts/fix-electron-paths-simple.js`** - Build script for path fixing (lines 70-150)
- **`apps/web/out/`** - Static export directory (runtime generated)

### Related Files:
- **`apps/web/next.config.ts`** - Next.js configuration for static export
- **`apps/web/src/components/electron-error-boundary.tsx`** - Error boundary component
- **`apps/web/electron/main.js`** - Electron main process

## ⚠️ CRITICAL: Combined File Modifications Plan

**OVERLAPPING FILE MODIFICATIONS DETECTED:**
1. **`apps/web/electron/preload.js`** - Modified by Steps 1 & 3 
2. **`apps/web/scripts/fix-electron-paths-simple.js`** - Modified by Step 2

## Implementation Plan - COMBINED FIXES

### Step 1: COMBINED Preload.js Modifications ❌ CRITICAL
**File**: `apps/web/electron/preload.js` 
**Lines affected**: 8-20 (existing), 250+ (new verification)

**⚠️ PRESERVE EXISTING FUNCTIONALITY:**
- ✅ Keep existing contextBridge.exposeInMainWorld (lines 66-105)
- ✅ Keep existing hydration recovery system (lines 118-200+)
- ✅ Keep existing fetch interception (lines 41-59)
- ✅ Keep existing verification prints (lines 107-116)

**MODIFICATION STRATEGY**: Replace problematic Object.defineProperty calls (lines 8-39) with safe detection:

```javascript
// REPLACE LINES 8-39 WITH SAFE PROPERTY DETECTION:
try {
  // Check if location properties are already defined and configurable
  const assignDescriptor = Object.getOwnPropertyDescriptor(window.location, 'assign');
  const replaceDescriptor = Object.getOwnPropertyDescriptor(window.location, 'replace');
  
  console.log('🔧 [ELECTRON] Checking location property descriptors...');
  console.log('- assign configurable:', assignDescriptor?.configurable);
  console.log('- replace configurable:', replaceDescriptor?.configurable);
  
  // Safe patching approach
  if (!assignDescriptor || assignDescriptor.configurable) {
    Object.defineProperty(window.location, 'assign', {
      value: function(url) {
        console.log('🔧 [ELECTRON] location.assign intercepted:', url);
        try {
          window.location.href = url;
        } catch (e) {
          console.warn('🔧 [ELECTRON] location.assign fallback:', e);
        }
      },
      writable: false,
      configurable: false
    });
    console.log('✅ [ELECTRON] location.assign patched successfully');
  } else {
    console.log('ℹ️ [ELECTRON] location.assign non-configurable, using fallback method');
    // Store original if it exists
    window.location._originalAssign = window.location.assign;
    // Create safe wrapper 
    window.location._electronAssign = function(url) {
      console.log('🔧 [ELECTRON] _electronAssign called:', url);
      try {
        window.location.href = url;
      } catch (e) {
        console.warn('🔧 [ELECTRON] _electronAssign fallback:', e);
      }
    };
  }
  
  if (!replaceDescriptor || replaceDescriptor.configurable) {
    Object.defineProperty(window.location, 'replace', {
      value: function(url) {
        console.log('🔧 [ELECTRON] location.replace intercepted:', url);
        try {
          window.location.href = url;
        } catch (e) {
          console.warn('🔧 [ELECTRON] location.replace fallback:', e);
        }
      },
      writable: false,
      configurable: false
    });
    console.log('✅ [ELECTRON] location.replace patched successfully');
  } else {
    console.log('ℹ️ [ELECTRON] location.replace non-configurable, using fallback method');
    window.location._originalReplace = window.location.replace;
    window.location._electronReplace = function(url) {
      console.log('🔧 [ELECTRON] _electronReplace called:', url);
      try {
        window.location.href = url;
      } catch (e) {
        console.warn('🔧 [ELECTRON] _electronReplace fallback:', e);
      }
    };
  }
  
  console.log('✅ [ELECTRON] All location patches applied safely without errors');
} catch (e) {
  console.warn('⚠️ [ELECTRON] Location patching failed completely, using emergency fallbacks:', e);
  // Emergency fallbacks that always work
  window.location._electronAssign = function(url) { 
    console.log('🚨 [ELECTRON] Emergency assign:', url);
    window.location.href = url; 
  };
  window.location._electronReplace = function(url) { 
    console.log('🚨 [ELECTRON] Emergency replace:', url);
    window.location.href = url; 
  };
}
```

**ADD NEW VERIFICATION SECTION** (append to end of file, after line 200+):
```javascript
// =================== ENHANCED VERIFICATION - NEW SECTION ===================
window.addEventListener('DOMContentLoaded', function() {
  console.log('🎯 [ELECTRON] Enhanced preload verification:');
  
  // Verify location patches with detailed info
  try {
    const assignDesc = Object.getOwnPropertyDescriptor(window.location, 'assign');
    const replaceDesc = Object.getOwnPropertyDescriptor(window.location, 'replace');
    
    console.log('- location.assign type:', typeof window.location.assign);
    console.log('- location.assign configurable:', assignDesc?.configurable);
    console.log('- location.assign patched:', window.location.assign?.toString().includes('ELECTRON') || false);
    console.log('- location.replace type:', typeof window.location.replace);
    console.log('- location.replace configurable:', replaceDesc?.configurable);
    console.log('- location.replace patched:', window.location.replace?.toString().includes('ELECTRON') || false);
    console.log('- _electronAssign available:', typeof window.location._electronAssign);
    console.log('- _electronReplace available:', typeof window.location._electronReplace);
  } catch (e) {
    console.warn('- Location verification failed:', e);
  }
  
  // Verify font loading with enhanced detection
  const allLinks = document.querySelectorAll('link[href]');
  const fontLinks = Array.from(allLinks).filter(link => 
    link.getAttribute('as') === 'font' || 
    link.getAttribute('href')?.includes('.woff') ||
    link.getAttribute('href')?.includes('font')
  );
  
  console.log(`- Total link elements: ${allLinks.length}`);
  console.log(`- Font-related elements: ${fontLinks.length}`);
  
  fontLinks.forEach((el, i) => {
    const href = el.getAttribute('href');
    const isAbsolute = href?.startsWith('/') && !href.startsWith('//');
    console.log(`  Font ${i+1}: ${href} (${isAbsolute ? 'ABSOLUTE ❌' : 'RELATIVE ✅'})`);
  });
  
  // Check for any failed resource loads
  const images = document.querySelectorAll('img');
  const scripts = document.querySelectorAll('script[src]');
  const links = document.querySelectorAll('link[href]');
  
  let absolutePathCount = 0;
  [...images, ...scripts, ...links].forEach(el => {
    const src = el.src || el.href;
    if (src && !src.includes('://') && src.startsWith('/')) {
      absolutePathCount++;
    }
  });
  
  console.log(`- Total assets checked: ${images.length + scripts.length + links.length}`);
  console.log(`- Assets with absolute paths: ${absolutePathCount} ${absolutePathCount > 0 ? '❌' : '✅'}`);
  console.log('- ElectronAPI exposed:', window.electronAPI ? '✅' : '❌');
  console.log('- Hydration recovery ready:', typeof window.__electronHydrationRecovery === 'function' ? '✅' : '❌');
  
  console.log('🚀 [ELECTRON] Enhanced verification complete - all systems checked');
});
```

### Step 2: Enhanced Path Script Modifications ❌ BLOCKING
**File**: `apps/web/scripts/fix-electron-paths-simple.js`
**Lines affected**: 95-109 (existing), 150+ (enhanced)

**⚠️ PRESERVE EXISTING FUNCTIONALITY:**
- ✅ Keep existing file discovery functions (lines 18-47)
- ✅ Keep existing validation functions (lines 49-67)  
- ✅ Keep existing basic path fixing (lines 77-94, 144-150)
- ✅ Keep existing location patching (lines 117-142)

**ENHANCEMENT STRATEGY**: Expand existing font fixing section (around line 95) with comprehensive patterns:

```javascript
// REPLACE/ENHANCE LINES 95-109 WITH COMPREHENSIVE FONT FIXING:
// Fix preload href for fonts and assets (comprehensive) - ENHANCED
fixedContent = fixedContent.replace(/href="\/([^"]*_next\/static\/[^"]+)"/g, (match, path) => {
  changeCount++;
  console.log(`  🎯 [PATH-FIX] Fixed _next static href: /${path} → ${path}`);
  return `href="${path}"`;
});

// NEW: Fix CSS @font-face src paths in CSS files
if (filename.endsWith('.css')) {
  fixedContent = fixedContent.replace(/src:\s*url\(['"]?\/([^'"]+\.woff2?[^'")]*?)['"]?\)/g, (match, path) => {
    changeCount++;
    console.log(`  🎯 [PATH-FIX] Fixed CSS font src: /${path} → ${path}`);
    return `src: url("${path}")`;
  });
  
  // Fix any font-face url() references in CSS
  fixedContent = fixedContent.replace(/url\(['"]?\/([^'"]*\.(woff2?|ttf|eot|otf)[^'")]*?)['"]?\)/g, (match, path) => {
    changeCount++;
    console.log(`  🎯 [PATH-FIX] Fixed CSS font url: /${path} → ${path}`);
    return `url("${path}")`;
  });
}

// NEW: Fix link rel="preload" as="font" specifically in HTML
if (filename.endsWith('.html')) {
  fixedContent = fixedContent.replace(/(<link[^>]*rel=["']preload["'][^>]*as=["']font["'][^>]*href=["'])\/([^"']+)(["'][^>]*>)/g, (match, before, path, after) => {
    changeCount++;
    console.log(`  🎯 [PATH-FIX] Fixed HTML font preload: /${path} → ${path}`);
    return `${before}${path}${after}`;
  });
  
  // Fix any remaining font file references in link tags
  fixedContent = fixedContent.replace(/(<link[^>]*href=["'])\/([^"']*\.(woff2?|ttf|eot|otf)[^"']*)(["'][^>]*>)/g, (match, before, path, after) => {
    changeCount++;
    console.log(`  🎯 [PATH-FIX] Fixed HTML font link: /${path} → ${path}`);
    return `${before}${path}${after}`;
  });
}

// NEW: Fix any remaining font file references (catch-all)
fixedContent = fixedContent.replace(/"\/([^"]*\.(woff2?|ttf|eot|otf)[^"]*)"/g, (match, path) => {
  changeCount++;
  console.log(`  🎯 [PATH-FIX] Fixed general font reference: /${path} → ${path}`);
  return `"${path}"`;
});

// NEW: Fix Next.js font optimization paths
fixedContent = fixedContent.replace(/href="\/([^"]*\/_next\/static\/[^"]*\.(woff2?|ttf)[^"]*)"/g, (match, path) => {
  changeCount++;
  console.log(`  🎯 [PATH-FIX] Fixed Next.js optimized font: /${path} → ${path}`);
  return `href="${path}"`;
});
```

**ADD ENHANCED VALIDATION** (after existing validatePaths function around line 67):
```javascript
// NEW: Enhanced font-specific validation function
function validateFontPaths(content, filename) {
  const fontIssues = [];
  
  // Check for remaining absolute font paths
  const absoluteFontRegex = /(?:href|src|url)=?['"]?\/[^'"]*\.(woff2?|ttf|eot|otf)[^'"]*['"]?/g;
  let match;
  while ((match = absoluteFontRegex.exec(content)) !== null) {
    fontIssues.push(`Absolute font path found: ${match[0]}`);
  }
  
  // Check for CSS font-face issues
  if (filename.endsWith('.css')) {
    const cssUrlRegex = /url\(['"]?\/[^'"]*\.(woff2?|ttf|eot|otf)[^'")]*['"]?\)/g;
    while ((match = cssUrlRegex.exec(content)) !== null) {
      fontIssues.push(`CSS absolute font URL: ${match[0]}`);
    }
  }
  
  if (fontIssues.length > 0) {
    console.warn(`⚠️ [FONT-FIX] ${filename} has ${fontIssues.length} font path issues:`);
    fontIssues.forEach(issue => console.warn(`  - ${issue}`));
  } else {
    console.log(`✅ [FONT-FIX] ${filename} - all font paths are relative`);
  }
  
  return fontIssues.length === 0;
}
```

## ⚠️ COMBINED IMPLEMENTATION ORDER

**CRITICAL**: Execute modifications in this exact order to prevent conflicts:

1. **First**: Modify `apps/web/electron/preload.js` (Step 1)
2. **Second**: Modify `apps/web/scripts/fix-electron-paths-simple.js` (Step 2)  
3. **Third**: Run rebuild and test (Verification)

## Verification Commands - ENHANCED

After implementing COMBINED fixes, run these commands to verify success:

```bash
# 1. Rebuild the Electron app with enhanced logging
cd apps/web
npm run build
npm run export:electron

# 2. Test the combined fixes
npx electron electron/main-simple.js

# 3. Monitor console for specific verification messages:

# ✅ CRITICAL SUCCESS INDICATORS:
# "✅ [ELECTRON] All location patches applied safely without errors"
# "✅ [ELECTRON] location.assign patched successfully" OR "ℹ️ [ELECTRON] location.assign non-configurable, using fallback method"
# "✅ [ELECTRON] location.replace patched successfully" OR "ℹ️ [ELECTRON] location.replace non-configurable, using fallback method"
# "🎯 [PATH-FIX] Fixed _next static href: /path → path" (multiple instances)
# "🎯 [PATH-FIX] Fixed CSS font src: /path → path" (for CSS files)
# "🎯 [PATH-FIX] Fixed HTML font preload: /path → path" (for HTML files)
# "✅ [FONT-FIX] filename - all font paths are relative"
# "🚀 [ELECTRON] Enhanced verification complete - all systems checked"

# ❌ CRITICAL FAILURE INDICATORS (should NOT appear):
# "❌ [ELECTRON] Failed to apply immediate location patches: TypeError: Cannot redefine property: assign"
# "Failed to load resource: net::ERR_FILE_NOT_FOUND" for .woff2 files
# "⚠️ [FONT-FIX] filename has X font path issues"
# "Font X: /path (ABSOLUTE ❌)"
# "Assets with absolute paths: >0 ❌"
```

## Combined Success Criteria - COMPREHENSIVE

**Phase 1 - Location Patching Success**:
1. ✅ `✅ [ELECTRON] All location patches applied safely without errors`
2. ✅ `location.assign configurable: true/false` (descriptor check working)
3. ✅ `location.assign type: function` (patch or fallback working)
4. ✅ `_electronAssign available: function` (if fallback used)
5. ❌ No `Cannot redefine property: assign` errors

**Phase 2 - Font Path Fixing Success**:
1. ✅ `🎯 [PATH-FIX] Fixed _next static href` messages during build
2. ✅ `🎯 [PATH-FIX] Fixed CSS font src` messages for CSS files  
3. ✅ `🎯 [PATH-FIX] Fixed HTML font preload` messages for HTML files
4. ✅ `✅ [FONT-FIX] all font paths are relative` for all processed files
5. ❌ No `Failed to load resource: .woff2` errors in browser

**Phase 3 - App Functionality Success**:
1. ✅ Electron window opens without white screen  
2. ✅ All fonts render correctly (no missing font fallbacks)
3. ✅ Navigation works without location errors
4. ✅ `Font-related elements: X` with all showing `(RELATIVE ✅)`
5. ✅ `Assets with absolute paths: 0 ✅`
6. ✅ `ElectronAPI exposed: ✅`
7. ✅ `Hydration recovery ready: ✅`

**Final Verification**:
- ✅ Console shows clean startup with enhanced verification messages
- ✅ No critical errors or missing resources
- ✅ All existing functionality preserved (contextBridge, hydration recovery, etc.)
- ✅ Fallback systems available if needed (`_electronAssign`, `_electronReplace`)

## 🚨 Rollback Plan

If fixes cause issues:
1. **Revert preload.js**: Restore original Object.defineProperty calls
2. **Revert fix-electron-paths-simple.js**: Remove enhanced font fixing patterns  
3. **Test**: Verify app returns to previous working state
4. **Debug**: Check specific error messages to identify conflicting changes