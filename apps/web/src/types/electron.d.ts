declare global {
  interface Window {
    electronAPI?: {
      // Basic IPC methods
      ping: () => Promise<string>;
      
      // Platform info
      platform: string;
      isElectron: boolean;
      isDesktop: boolean;
      
      // Environment detection
      getEnvironment: () => Promise<{
        platform: string;
        arch: string;
        isElectron: boolean;
        isDesktop: boolean;
        userDataPath: Promise<string>;
      }>;
      
      // User preferences
      getUserPreferences: () => Promise<any>;
      saveUserPreferences: (preferences: any) => Promise<any>;
      
      // File operations
      selectFile: () => Promise<any>;
      saveFile: (data: any, filename: string) => Promise<any>;
      
      // Project operations
      getProjectsDirectory: () => Promise<string>;
      saveProjectData: (projectId: string, data: any) => Promise<any>;
      loadProjectData: (projectId: string) => Promise<any>;
      
      // FFmpeg operations
      exportVideo: (frames: any, options: any) => Promise<any>;
      
      // Event listeners
      onExportProgress: (callback: (event: any, ...args: any[]) => void) => () => void;
    };
    
    // Debug storage service
    storageService?: any;
  }
}

export {};