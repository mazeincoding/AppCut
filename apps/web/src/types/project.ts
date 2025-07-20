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
}
