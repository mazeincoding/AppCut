export type BackgroundType = "blur" | "mirror" | "color";

export interface Caption {
  id: string;
  text: string;
  startTime: number; // In seconds
  endTime: number; // In seconds
  style?: {
    fontFamily?: string;
    fontSize?: string;
    color?: string;
    backgroundColor?: string;
    padding?: string;
    borderRadius?: string;
    borderColor?: string;
    borderWidth?: string;
    textShadow?: string; // This will combine shadow properties for CSS
    shadowColor?: string;
    shadowOffsetX?: string;
    shadowOffsetY?: string;
    shadowBlur?: string;
    textAlign?: "left" | "center" | "right";
    lineHeight?: string;
    letterSpacing?: string;
    animation?: string;
    position?: { x: number; y: number };
  };
}
