"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useProjectStore } from "@/stores/project-store";
import { useMediaStore } from "@/stores/media-store";
import { storageService } from "@/lib/storage/storage-service";
import { toast } from "sonner";

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
  const [status, setStatus] = useState<StorageContextType>({
    isInitialized: false,
    isLoading: true,
    hasSupport: false,
    error: null,
  });

  console.log('🚀 StorageProvider: Component rendered');

  const loadAllProjects = useProjectStore((state) => state.loadAllProjects);

  useEffect(() => {
    const initializeStorage = async () => {
      console.log('🔄 StorageProvider: Starting initialization...');
      setStatus((prev) => ({ ...prev, isLoading: true }));

      try {
        // Check browser support
        console.log('🔍 StorageProvider: Checking browser support...');
        const hasSupport = storageService.isFullySupported();
        console.log('🔍 StorageProvider: Browser support:', hasSupport);

        if (!hasSupport) {
          console.log('⚠️ StorageProvider: Storage not fully supported');
          toast.warning(
            "Storage not fully supported. Some features may not work."
          );
        }

        // Load saved projects (media will be loaded when a project is loaded)
        console.log('📦 StorageProvider: Loading all projects...');
        await loadAllProjects();
        console.log('✅ StorageProvider: Projects loaded successfully');

        setStatus({
          isInitialized: true,
          isLoading: false,
          hasSupport,
          error: null,
        });
        console.log('✅ StorageProvider: Initialization complete');
      } catch (error) {
        console.error("❌ StorageProvider: Failed to initialize storage:", error);
        setStatus({
          isInitialized: false,
          isLoading: false,
          hasSupport: storageService.isFullySupported(),
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    initializeStorage();
  }, [loadAllProjects]);

  return (
    <StorageContext.Provider value={status}>{children}</StorageContext.Provider>
  );
}
