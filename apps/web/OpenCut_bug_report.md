# OpenCut Electron Build – Bug Report (`debugv2.txt`)

---

## 1. High‑level Symptom  
**After initial load the Electron window turns blank (`chrome-error://chromewebdata/`) and all React content disappears.**

Evidence → Renderer picks up the error page URL immediately after load.

---

## 2. Key Error Indicators Extracted from the Log

| Category | Log Evidence | Why it Matters |
|-----------|--------------|----------------|
| **Hydration failure** | “React hydration failed, attempting recovery… No React root element found – cannot apply recovery” | React never attaches to the static HTML, so the UI goes inert. |
| **Next.js disabled at runtime** | “Next.js data fetching completely disabled” + `__NEXT_DATA__` overridden early | The preload script blocks every JSON/route‑prefetch, so client‑side navigation & hydration cannot work. |
| **Bad navigation target** | In‑page navigation tries `app://projects/index.html` (custom scheme) then falls back to `file:///C:/projects` | Neither path exists in the packaged export, triggering the Chrome error page. |
| **Security flags** | Renderer runs with `webSecurity disabled`, `allowRunningInsecureContent`, and a CSP containing `unsafe-eval` | Not the crash cause, but worth fixing – Electron surfaces critical warnings. |

---

## 3. Likely Root Causes

1. **Preload script is over‑aggressive**  
   Blocks all Next.js data routes and rewrites `__NEXT_DATA__`, preventing React hydration and breaking the router.

2. **Static export lacks `/projects` page**  
   Clicking **Projects** triggers a route not present in the `out/` folder. Electron then falls back to an invalid file path, ending in a 404 → Chrome error.

3. **Disabled webSecurity & custom protocol**  
   Custom scheme `app://` is registered, but JSON blocking rejects the request, causing the error page.

---

## 4. Recommended Fixes

| Priority | Fix | How |
|----------|-----|-----|
| **P1** | **Stop disabling Next.js internals** | Remove/relax the preload code that overrides `__NEXT_DATA__` and blocks `/_next/data/**`. Allow hydration and router JSON to load. |
| **P2** | **Ship the missing pages** | Ensure `next export` includes a prerendered `projects/index.html` or convert navigation to hash‑routing. |
| **P3** | **Use proper routing inside Electron** | Replace `window.location.assign('/projects')` with `router.push('/projects')` or intercept clicks and load the correct path. |
| **P4** | **Re‑enable webSecurity / set a safe CSP** | Remove `webSecurity:false`, `allowRunningInsecureContent`, and add a restrictive Content‑Security‑Policy. |

---

## 5. Next Steps

1. **Comment out** the JSON‑blocking section in `preload.ts` and rebuild; confirm hydration succeeds.  
2. **Run** `next export` and verify the `out/projects/` folder exists.  
3. **Test navigation** in Electron dev mode (`http://localhost:3000`) to rule out export issues.  
4. **Add end‑to‑end logging** for `did-fail-load` in the main process to catch missing files early.  

---

*Generated 19 Jul 2025 from log file: `debugv2.txt`*
