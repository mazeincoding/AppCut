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
    textShadow?: string; // CSS text-shadow property (e.g., "2px 2px 4px rgba(0,0,0,0.5)")
    textAlign?: "left" | "center" | "right";
    lineHeight?: string;
    letterSpacing?: string;
    animation?: string;
    position?: { x: number; y: number };
    whiteSpace?: "nowrap" | "normal" | "pre-wrap"; // Text wrapping control
    overflow?: "visible" | "hidden" | "ellipsis"; // Overflow handling
    maxWidth?: string; // Maximum width for text wrapping
  };
}
