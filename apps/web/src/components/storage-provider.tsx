"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { useMediaStore } from "@/stores/media-store";
import { storageService } from "@/lib/storage/storage-service";
import { toast } from "sonner";
import { debugLogger } from "@/lib/debug-logger";

// TypeScript declaration for window global state
declare global {
  interface Window {
    __OPENCUT_STORAGE_STATE__?: {
      isGloballyInitializing: boolean;
      hasGloballyInitialized: boolean;
      instanceCount: number;
    };
  }
}

// PERSISTENT global flags to prevent multiple simultaneous initializations
// Use window object to persist across module reloads
if (typeof window !== 'undefined') {
  if (!window.__OPENCUT_STORAGE_STATE__) {
    window.__OPENCUT_STORAGE_STATE__ = {
      isGloballyInitializing: false,
      hasGloballyInitialized: false,
      instanceCount: 0
    };
  }
}

// Helper functions to access persistent state
const getGlobalState = () => {
  if (typeof window === 'undefined') return { isGloballyInitializing: false, hasGloballyInitialized: false, instanceCount: 0 };
  return window.__OPENCUT_STORAGE_STATE__;
};

const setGlobalState = (updates: Partial<{ isGloballyInitializing: boolean; hasGloballyInitialized: boolean; instanceCount: number }>) => {
  if (typeof window === 'undefined') return;
  Object.assign(window.__OPENCUT_STORAGE_STATE__ || {}, updates);
};

interface StorageContextType {
  isInitialized: boolean;
  isLoading: boolean;
  hasSupport: boolean;
  error: string | null;
}

const StorageContext = createContext<StorageContextType | null>(null);

export function useStorage() {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error("useStorage must be used within StorageProvider");
  }
  return context;
}

interface StorageProviderProps {
  children: React.ReactNode;
}

export function StorageProvider({ children }: StorageProviderProps) {
  const globalState = getGlobalState();
  const instanceId = Math.random().toString(36).substr(2, 9);
  setGlobalState({ instanceCount: (globalState?.instanceCount || 0) + 1 });
  
  console.log(`🔥 StorageProvider v14:15 - Instance #${(globalState?.instanceCount || 0) + 1} - hasGloballyInitialized: ${globalState?.hasGloballyInitialized}`);
  
  // EMERGENCY: If we've already initialized globally, just return a minimal provider
  if (globalState?.hasGloballyInitialized) {
    console.log(`🛑 EMERGENCY SKIP`);
    return (
      <StorageContext.Provider value={{
        isInitialized: true,
        isLoading: false,
        hasSupport: true,
        error: null,
      }}>
        {children}
      </StorageContext.Provider>
    );
  }
  const [status, setStatus] = useState<StorageContextType>({
    isInitialized: false,
    isLoading: true,
    hasSupport: false,
    error: null,
  });

  // Don't subscribe to the function to prevent reference changes from triggering re-runs

  useEffect(() => {
    console.log(`🔄 StorageProvider ${instanceId} useEffect running - mount/re-mount detected`);
    
    // Prevent multiple initializations - check if already initialized
    const projectStore = useProjectStore.getState();
    const currentGlobalState = getGlobalState();
    
    console.log(`🔍 StorageProvider ${instanceId}: Checking initialization state`, {
      isInitialized: projectStore.isInitialized,
      isLoading: projectStore.isLoading,
      hasProjects: projectStore.savedProjects.length > 0,
      hasGloballyInitialized: currentGlobalState?.hasGloballyInitialized,
      isGloballyInitializing: currentGlobalState?.isGloballyInitializing
    });
    
    // Check global flag first - most aggressive guard
    if (currentGlobalState?.hasGloballyInitialized) {
      console.log(`🚫 StorageProvider ${instanceId}: Global initialization already completed, skipping`);
      debugLogger.log('StorageProvider', 'SKIP_GLOBAL_ALREADY_INITIALIZED', { instanceId });
      setStatus({
        isInitialized: true,
        isLoading: false,
        hasSupport: storageService.isFullySupported(),
        error: null,
      });
      return;
    }
    
    if (projectStore.isInitialized && projectStore.savedProjects.length > 0) {
      console.log(`⏭️ StorageProvider ${instanceId}: Store already initialized, skipping`);
      debugLogger.log('StorageProvider', 'SKIP_STORE_ALREADY_INITIALIZED', { instanceId, projectCount: projectStore.savedProjects.length });
      setGlobalState({ hasGloballyInitialized: true }); // Mark as globally completed
      setStatus({
        isInitialized: true,
        isLoading: false,
        hasSupport: storageService.isFullySupported(),
        error: null,
      });
      return;
    }
    
    if (currentGlobalState?.isGloballyInitializing) {
      console.log(`⏳ StorageProvider ${instanceId}: Initialization already in progress, skipping`);
      debugLogger.log('StorageProvider', 'SKIP_INITIALIZATION_IN_PROGRESS', { instanceId });
      return;
    }
    
    const initializeStorage = async () => {
      setGlobalState({ isGloballyInitializing: true });
      console.log(`🚀 StorageProvider ${instanceId}: Starting initialization...`);
      setStatus((prev) => ({ ...prev, isLoading: true }));

      try {
        // Check browser support
        const hasSupport = storageService.isFullySupported();

        if (!hasSupport) {
          toast.warning(
            "Storage not fully supported. Some features may not work."
          );
        }

        // Load saved projects (media will be loaded when a project is loaded)
        console.log(`📦 StorageProvider ${instanceId}: Calling loadAllProjects...`);
        debugLogger.log('StorageProvider', 'CALLING_LOAD_ALL_PROJECTS', { source: 'StorageProvider_init', instanceId });
        await useProjectStore.getState().loadAllProjects();
        console.log('✅ StorageProvider: loadAllProjects completed');
        debugLogger.log('StorageProvider', 'LOAD_ALL_PROJECTS_COMPLETED', { source: 'StorageProvider_init' });

        setStatus({
          isInitialized: true,
          isLoading: false,
          hasSupport,
          error: null,
        });
        console.log(`✅ StorageProvider ${instanceId}: Initialization complete`);
        setGlobalState({ hasGloballyInitialized: true }); // Mark as globally completed
      } catch (error) {
        console.error('❌ StorageProvider: Initialization failed:', error);
        setStatus({
          isInitialized: false,
          isLoading: false,
          hasSupport: storageService.isFullySupported(),
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setGlobalState({ isGloballyInitializing: false });
      }
    };

    initializeStorage();
    
    return () => {
      console.log('🗑️ StorageProvider useEffect cleanup - component unmounting');
    };
  }, []); // Remove loadAllProjects from dependencies - it's a stable Zustand store function

  return (
    <StorageContext.Provider value={status}>{children}</StorageContext.Provider>
  );
}
