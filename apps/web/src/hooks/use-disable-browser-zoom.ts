import { useEffect } from "react";

/**
 * useDisableBrowserZoom
 *
 * This React hook prevents users from zooming in/out the browser window using keyboard shortcuts,
 * mouse wheel, or gesture events (such as pinch-to-zoom on trackpads or touch devices).
 *
 * Typical use case: apps with fixed-size UIs, custom editors, or when zooming would break layout.
 *
 * NOTE: Disabling browser zoom may negatively affect accessibility and user experience.
 * Use with caution, especially for public-facing applications.
 */
export const useDisableBrowserZoom = () => {
  useEffect(() => {
    /**
     * Prevents browser zoom when user holds Ctrl (or Cmd on Mac) and scrolls the mouse wheel.
     */
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    /**
     * Prevents browser zoom via keyboard shortcuts:
     * Ctrl/Cmd + '+', '-', '=', or '0' (reset zoom)
     * Some keyboards emit '=' for '+' (without Shift).
     */
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        const key = e.key;
        if (key === "+" || key === "-" || key === "0" || key === "=") {
          e.preventDefault();
        }
      }
    };

    /**
     * Prevents pinch-zoom gestures on supported browsers (mainly Safari/macOS/iOS).
     * gesturestart, gesturechange, and gestureend are non-standard and not supported everywhere.
     */
    const handleGesture = (e: Event) => {
      e.preventDefault();
    };

    // Attach event listeners (passive: false is required for preventDefault to work)
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("gesturestart", handleGesture, { passive: false });
    window.addEventListener("gesturechange", handleGesture, { passive: false });
    window.addEventListener("gestureend", handleGesture, { passive: false });

    // Cleanup listeners on unmount to avoid memory leaks
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("gesturestart", handleGesture);
      window.removeEventListener("gesturechange", handleGesture);
      window.removeEventListener("gestureend", handleGesture);
    };
  }, []);
};
