/**
 * Utilities for time formatting
 */

/**
 * Format time in seconds to human-readable string (e.g., "2m 45s", "1h 23m")
 * @param timeInSeconds - Time in seconds to format
 * @returns Formatted time string
 */
export function formatTime(timeInSeconds: number): string {
  if (!timeInSeconds || timeInSeconds < 0) {
    return '0s';
  }

  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`);
  }

  return parts.join(' ');
}

/**
 * Format precise time with milliseconds (e.g., "2.45s", "1:23.456")
 * @param timeInSeconds - Time in seconds to format
 * @returns Formatted time string with milliseconds
 */
export function formatPreciseTime(timeInSeconds: number): string {
  if (!timeInSeconds || timeInSeconds < 0) {
    return '0.000s';
  }

  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = timeInSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(3).padStart(6, '0')}`;
  } else if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
  } else {
    return `${seconds.toFixed(3)}s`;
  }
}

/**
 * Format progress percentage with 1 decimal place
 * @param current - Current value
 * @param total - Total value
 * @returns Formatted percentage string
 */
export function formatProgress(current: number, total: number): string {
  if (total === 0) return '0.0%';
  return `${((current / total) * 100).toFixed(1)}%`;
}

/**
 * Format render speed in fps
 * @param frameCount - Number of frames processed
 * @param timeInSeconds - Time taken in seconds
 * @returns Formatted fps string
 */
export function formatRenderSpeed(frameCount: number, timeInSeconds: number): string {
  if (timeInSeconds === 0) return '0.0 fps';
  return `${(frameCount / timeInSeconds).toFixed(1)} fps`;
}
