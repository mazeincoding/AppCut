[ELECTRON] Applying immediate location patches...
VM5:14 🔧 [ELECTRON] Checking location property descriptors...
VM5:15 - assign configurable: false
VM5:16 - replace configurable: false
VM5:34 ℹ️ [ELECTRON] location.assign non-configurable, using fallback method
VM5:64 ℹ️ [ELECTRON] location.replace non-configurable, using fallback method
VM5:76 ✅ [ELECTRON] All location patches applied safely without errors
VM5:305 ✅ [ELECTRON] Enhanced data fetching prevention applied (fetch + XHR)
VM5:334 ✅ [ELECTRON] Next.js data fetching completely disabled
VM5:346 🚫 [ELECTRON] Disabling service worker to prevent background requests
VM5:480 🎯 [ELECTRON] Preload verification:
VM5:481 - Early location patches: APPLIED
VM5:482 - Hydration recovery system: INITIALIZED
VM5:483 - ElectronAPI: EXPOSED
VM5:484 - All preload features: READY
VM5:485 🚀 [ELECTRON] Preload script fully loaded and configured
VM5:487 🚀 [ELECTRON] Preload script loaded
VM5:488 ✅ [ELECTRON] Location patches already applied at startup
index.html:2 🚀 [ELECTRON DEBUG] JavaScript executing in Electron
index.html:6 🔧 [ELECTRON] Setting up early React environment...
index.html:32 ✅ [ELECTRON] __NEXT_DATA__ overridden early
VM5:404 🔧 [ELECTRON] Setting up document-level JSON request blocking...
VM5:493 🔄 [ELECTRON] Setting up hydration recovery system...
index.html:37 🚀 [ELECTRON] DOM ready, checking for ElectronAPI
index.html:41 🚀 [ELECTRON] ElectronAPI detected and data-electron set
index.html:51 🚀 [DEBUG] Page loaded, body data-electron: true
VM5:631 🔍 [ELECTRON] DOM Content Loaded - Initial verification:
VM5:632 - window.React: undefined
VM5:633 - window.ReactDOM: undefined
VM5:634 - window.next: undefined
VM5:635 - location.assign patched: true
VM5:636 - location.replace patched: true
VM5:660 🎯 [ELECTRON] Enhanced preload verification:
VM5:667 - location.assign type: function
VM5:668 - location.assign configurable: false
VM5:669 - location.assign patched: false
VM5:670 - location.replace type: function
VM5:671 - location.replace configurable: false
VM5:672 - location.replace patched: false
VM5:673 - _electronAssign available: function
VM5:674 - _electronReplace available: function
VM5:687 - Total link elements: 18
VM5:688 - Font-related elements: 1
VM5:693   Font 1: ./_next/static/media/e4af272ccee01ff0-s.p.woff2 (RELATIVE ✅)
VM5:709 - Total assets checked: 33
VM5:710 - Assets with absolute paths: 0 ✅
VM5:711 - ElectronAPI exposed: ❌
VM5:712 - Hydration recovery ready: ✅
VM5:715 - Fetch interception active: ✅
VM5:716 - XHR interception active: ✅
VM5:719 🎯 [ELECTRON] ULTRASYNC DEEPSYNC FACE-IT VERIFICATION:
VM5:720 - ULTRASYNC: Dynamic build patterns ACTIVE (catches all future build IDs)
VM5:721 - DEEPSYNC: Windows drive patterns BLOCKED (C:/, D:/, E:/, F:/, G:/)
VM5:722 - FACE-IT: Specific build IDs BLOCKED (waKrJH0rxx6B322TnfBIx, 66zZwW14Qejyf_lZt9a3l, xUF9JiSSZjidE53kQFWB9, 3F6FMLMQ3eKsn8EKkbZTH)
VM5:723 - PERSPECTIVE: Nested path patterns BLOCKED (out/index.html.json, Desktop paths)
VM5:724 - Core Next.js data patterns: BLOCKED
VM5:725 - HTML.json specific patterns: BLOCKED
VM5:726 - URL encoded folder paths: BLOCKED
VM5:727 - Catch-all JSON patterns: BLOCKED
VM5:728 - Service worker: DISABLED
VM5:729 - Router prefetching: DISABLED
VM5:730 - __NEXT_DATA__ overridden: YES
VM5:731 🚫 [ELECTRON] ULTRASYNC DEEPSYNC FACE-IT: No data fetching errors should appear now
VM5:733 🚀 [ELECTRON] Enhanced verification complete - all systems checked
e4af272ccee01ff0-s.p.woff2:1  Failed to load resource: net::ERR_FILE_NOT_FOUND
VM5:356 🔧 [ELECTRON] Applying ultra-aggressive Next.js disabling...
VM5:391 🔧 [ELECTRON] Overriding __NEXT_DATA__ for complete data isolation
VM5:640 🔍 [ELECTRON] After delay check (2s):
VM5:641 - window.React: undefined
VM5:642 - window.ReactDOM: undefined
VM5:643 - window.next: undefined
VM5:644 - document.querySelector("#__next"): true
VM5:649 ✅ [ELECTRON] Next.js app appears to be rendered
VM5:650 - Child elements: 1
VM5:651 - Content preview: ((e,i,s,u,m,a,l,h)=>{let d=document.documentElement,w=["light","dark"];function p(n){(Array.isArray(...
VM5:504 🔍 [ELECTRON] Hydration status check:
VM5:505 - React root found: true
VM5:506 - React content rendered: false
VM5:507 - Hidden content (opacity:0): 0
VM5:508 - Visible content (opacity:1): 5
VM5:509 - window.React available: undefined
VM5:510 - window.ReactDOM available: undefined
VM5:524 ⚠️ [ELECTRON] React hydration failed, attempting recovery...
(anonymous) @ VM5:524
VM5:598 ❌ [ELECTRON] React/ReactDOM not available for recovery
(anonymous) @ VM5:598
VM5:611 ✅ [ELECTRON] Safe mode HTML applied
/C:/_next/data/electron-static/C:/Users/zdhpe/Desktop/New%20folder/OpenCut/apps/web/out/index.html.json:1  Failed to load resource: net::ERR_FILE_NOT_FOUND
VM4 sandbox_bundle:2 Electron Security Warning (Disabled webSecurity) This renderer process has "webSecurity" disabled. This
  exposes users of this app to severe security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
(anonymous) @ VM4 sandbox_bundle:2
VM4 sandbox_bundle:2 Electron Security Warning (allowRunningInsecureContent) This renderer process has "allowRunningInsecureContent"
  enabled. This exposes users of this app to severe security risks.

  
For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
(anonymous) @ VM4 sandbox_bundle:2
VM4 sandbox_bundle:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM4 sandbox_bundle:2
index.html:1 The resource file:///C:/Users/zdhpe/Desktop/New%20folder/OpenCut/apps/web/out/_next/static/media/e4af272ccee01ff0-s.p.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.
index.html:56 🚀 [CLICK DEBUG] Click: DIV 
              
              
index.html:1 The resource file:///C:/Users/zdhpe/Desktop/New%20folder/OpenCut/apps/web/out/_next/static/media/e4af272ccee01ff0-s.p.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.