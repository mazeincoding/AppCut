// Generic utilities

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parses a string to an integer with error handling
 * @param value - The string value to parse
 * @param defaultValue - The default value to return if parsing fails
 * @returns The parsed integer or the default value
 */
export function safeParseInt(value: string | undefined | null, defaultValue: number = 0): number {
  if (!value || typeof value !== 'string') {
    return defaultValue;
  }
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parses a string to a float with error handling
 * @param value - The string value to parse
 * @param defaultValue - The default value to return if parsing fails
 * @returns The parsed float or the default value
 */
export function safeParseFloat(value: string | undefined | null, defaultValue: number = 0): number {
  if (!value || typeof value !== 'string') {
    return defaultValue;
  }
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Converts an RGBA color string to a hex color string
 * @param rgbaString - The RGBA string in format "rgba(r,g,b,a)"
 * @returns The hex color string in format "#rrggbb" or fallback "#000000"
 */
export function rgbaToHex(rgbaString: string): string {
  if (!rgbaString || !rgbaString.startsWith("rgba(")) {
    return "#000000";
  }

  try {
    // Remove "rgba(" and ")" and split by commas
    const cleanRgba = rgbaString.trim().replace(/^rgba\(|\)$/g, "");
    const parts = cleanRgba.split(",").map(part => part.trim());
    
    if (parts.length !== 4) {
      return "#000000";
    }

    // Parse RGB components
    const r = parseInt(parts[0], 10);
    const g = parseInt(parts[1], 10);
    const b = parseInt(parts[2], 10);

    // Validate RGB values
    if (isNaN(r) || isNaN(g) || isNaN(b) || r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      return "#000000";
    }

    // Convert to hex
    const hexR = r.toString(16).padStart(2, '0');
    const hexG = g.toString(16).padStart(2, '0');
    const hexB = b.toString(16).padStart(2, '0');

    return `#${hexR}${hexG}${hexB}`;
  } catch (error) {
    return "#000000";
  }
}

/**
 * Converts a hex color string to an RGBA color string with default opacity
 * @param hexString - The hex color string in format "#rrggbb" or "#rgb"
 * @param opacity - The opacity value (0-1), defaults to 0.7
 * @returns The RGBA string in format "rgba(r,g,b,a)"
 */
export function hexToRgba(hexString: string, opacity: number = 0.7): string {
  if (!hexString || !hexString.startsWith("#")) {
    return `rgba(0,0,0,${opacity})`;
  }

  try {
    // Remove # and normalize to 6 characters
    let hex = hexString.slice(1);
    if (hex.length === 3) {
      // Convert 3-digit hex to 6-digit
      hex = hex.split('').map(char => char + char).join('');
    }

    if (hex.length !== 6) {
      return `rgba(0,0,0,${opacity})`;
    }

    // Parse RGB components
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    // Validate RGB values
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return `rgba(0,0,0,${opacity})`;
    }

    return `rgba(${r},${g},${b},${opacity})`;
  } catch (error) {
    return `rgba(0,0,0,${opacity})`;
  }
}