/**
 * Desktop Authentication Provider
 * Bypasses server authentication for Electron desktop app
 */

import { isElectron } from './electron-detection';

export interface DesktopUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    autoSave: boolean;
    exportQuality: 'high' | 'medium' | 'low';
    defaultAspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  };
}

const DESKTOP_USER_KEY = 'opencut_desktop_user';

/**
 * Create or get the local desktop user
 */
export function getDesktopUser(): DesktopUser {
  if (!isElectron()) {
    throw new Error('Desktop user only available in Electron environment');
  }

  // Try to load existing user from localStorage
  if (typeof window !== 'undefined') {
    const savedUser = localStorage.getItem(DESKTOP_USER_KEY);
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (error) {
        console.warn('Failed to parse saved desktop user, creating new one');
      }
    }
  }

  // Create new desktop user
  const newUser: DesktopUser = {
    id: `desktop_user_${Date.now()}`,
    name: 'Desktop User',
    email: 'desktop@opencut.local',
    createdAt: new Date(),
    preferences: {
      theme: 'dark',
      autoSave: true,
      exportQuality: 'high',
      defaultAspectRatio: '16:9'
    }
  };

  // Save to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(DESKTOP_USER_KEY, JSON.stringify(newUser));
  }

  return newUser;
}

/**
 * Update desktop user preferences
 */
export function updateDesktopUserPreferences(
  preferences: Partial<DesktopUser['preferences']>
): DesktopUser {
  const user = getDesktopUser();
  const updatedUser = {
    ...user,
    preferences: {
      ...user.preferences,
      ...preferences
    }
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(DESKTOP_USER_KEY, JSON.stringify(updatedUser));
  }

  return updatedUser;
}

/**
 * Mock session for desktop mode
 */
export function createDesktopSession() {
  const user = getDesktopUser();
  
  return {
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: null
      },
      session: {
        id: `session_${user.id}`,
        userId: user.id,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        createdAt: user.createdAt
      }
    },
    error: null,
    isPending: false
  };
}