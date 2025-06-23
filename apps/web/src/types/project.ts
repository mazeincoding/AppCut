export interface TProject {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  // Project resolution settings
  resolution?: {
    width: number;
    height: number;
    aspectRatio: number;
    label: string; // e.g., "Full HD (1920x1080)"
    autoDetected: boolean; // Whether this was automatically set from first video
  };
  // Export settings
  exportSettings?: {
    format: 'mp4' | 'webm' | 'mov';
    quality: 'low' | 'medium' | 'high' | 'ultra';
    bitrate?: number;
  };
}
