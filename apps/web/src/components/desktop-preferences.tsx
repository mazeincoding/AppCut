/**
 * Desktop Preferences Component
 * Manages desktop-specific user preferences
 */

"use client";

import { useEffect, useState } from 'react';
import { isElectron } from '@/lib/electron-detection';
import { updateDesktopUserPreferences, type DesktopUser } from '@/lib/desktop-auth';

interface DesktopPreferencesProps {
  className?: string;
}

export function DesktopPreferences({ className }: DesktopPreferencesProps) {
  const [preferences, setPreferences] = useState<DesktopUser['preferences'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isElectron()) {
      setIsLoading(false);
      return;
    }

    // Load preferences from Electron
    const loadPreferences = async () => {
      try {
        if (window.electronAPI?.getUserPreferences) {
          const savedPrefs = await window.electronAPI.getUserPreferences();
          if (savedPrefs) {
            setPreferences(savedPrefs);
          } else {
            // Set default preferences
            const defaultPrefs = {
              theme: 'dark' as const,
              autoSave: true,
              exportQuality: 'high' as const,
              defaultAspectRatio: '16:9' as const
            };
            setPreferences(defaultPrefs);
            await savePreferences(defaultPrefs);
          }
        }
      } catch (error) {
        console.error('Failed to load desktop preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const savePreferences = async (newPrefs: DesktopUser['preferences']) => {
    try {
      if (window.electronAPI?.saveUserPreferences) {
        await window.electronAPI.saveUserPreferences(newPrefs);
      }
      // Also update local auth
      updateDesktopUserPreferences(newPrefs);
    } catch (error) {
      console.error('Failed to save desktop preferences:', error);
    }
  };

  const updatePreference = async <K extends keyof DesktopUser['preferences']>(
    key: K,
    value: DesktopUser['preferences'][K]
  ) => {
    if (!preferences) return;
    
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    await savePreferences(newPrefs);
  };

  if (!isElectron()) {
    return null; // Don't render on web
  }

  if (isLoading) {
    return <div className={className}>Loading preferences...</div>;
  }

  if (!preferences) {
    return <div className={className}>Failed to load preferences</div>;
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-4">Desktop Preferences</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Theme</label>
          <select
            value={preferences.theme}
            onChange={(e) => updatePreference('theme', e.target.value as any)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Auto Save</label>
          <input
            type="checkbox"
            checked={preferences.autoSave}
            onChange={(e) => updatePreference('autoSave', e.target.checked)}
            className="rounded"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Export Quality</label>
          <select
            value={preferences.exportQuality}
            onChange={(e) => updatePreference('exportQuality', e.target.value as any)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Default Aspect Ratio</label>
          <select
            value={preferences.defaultAspectRatio}
            onChange={(e) => updatePreference('defaultAspectRatio', e.target.value as any)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
            <option value="4:3">4:3</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// Type declaration for window.electronAPI (if not already defined)
declare global {
  interface Window {
    electronAPI?: {
      getUserPreferences: () => Promise<any>;
      saveUserPreferences: (preferences: any) => Promise<{ success: boolean }>;
      isElectron: boolean;
      isDesktop: boolean;
    };
  }
}