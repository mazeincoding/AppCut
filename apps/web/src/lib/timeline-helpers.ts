// SAFE: New utility file, doesn't affect existing code
export function formatTimelineTime(seconds: number = 0, fps: number = 30): string {
  try {
    // SAFE: Handle undefined/null/NaN values
    const safeSeconds = typeof seconds === 'number' && !isNaN(seconds) ? seconds : 0;
    const safeFps = typeof fps === 'number' && !isNaN(fps) && fps > 0 ? fps : 30;
    
    const hours = Math.floor(safeSeconds / 3600);
    const mins = Math.floor((safeSeconds % 3600) / 60);
    const secs = Math.floor(safeSeconds % 60);
    const frames = Math.floor((safeSeconds % 1) * safeFps);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  } catch (error) {
    // SAFE: Fallback to simple format
    const safeSeconds = typeof seconds === 'number' && !isNaN(seconds) ? seconds : 0;
    return safeSeconds.toFixed(2) + 's';
  }
}

// Additional timeline utility functions
export function timeToPixels(time: number = 0, pixelsPerSecond: number = 50, zoomLevel: number = 1): number {
  const safeTime = typeof time === 'number' && !isNaN(time) ? time : 0;
  const safePPS = typeof pixelsPerSecond === 'number' && !isNaN(pixelsPerSecond) && pixelsPerSecond > 0 ? pixelsPerSecond : 50;
  const safeZoom = typeof zoomLevel === 'number' && !isNaN(zoomLevel) && zoomLevel > 0 ? zoomLevel : 1;
  return safeTime * safePPS * safeZoom;
}

export function pixelsToTime(pixels: number = 0, pixelsPerSecond: number = 50, zoomLevel: number = 1): number {
  const safePixels = typeof pixels === 'number' && !isNaN(pixels) ? pixels : 0;
  const safePPS = typeof pixelsPerSecond === 'number' && !isNaN(pixelsPerSecond) && pixelsPerSecond > 0 ? pixelsPerSecond : 50;
  const safeZoom = typeof zoomLevel === 'number' && !isNaN(zoomLevel) && zoomLevel > 0 ? zoomLevel : 1;
  return safePixels / (safePPS * safeZoom);
}

export function clampTime(time: number = 0, min: number = 0, max?: number): number {
  const safeTime = typeof time === 'number' && !isNaN(time) ? time : 0;
  const safeMin = typeof min === 'number' && !isNaN(min) ? min : 0;
  let clamped = Math.max(safeMin, safeTime);
  if (max !== undefined && typeof max === 'number' && !isNaN(max)) {
    clamped = Math.min(max, clamped);
  }
  return clamped;
}