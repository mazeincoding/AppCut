export interface TTimeline {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  backgroundColor?: string;
  backgroundType?: "color" | "blur";
  blurIntensity?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TProject {
  id: string;
  name: string;
  thumbnail: string;
  createdAt: Date;
  updatedAt: Date;
  mediaItems?: string[];
  backgroundColor?: string;
  backgroundType?: "color" | "blur";
  blurIntensity?: number; // in pixels (4, 8, 18)
  fps?: number;

  // Multiple timelines support
  timelines?: TTimeline[];
  activeTimelineId?: string;
}
