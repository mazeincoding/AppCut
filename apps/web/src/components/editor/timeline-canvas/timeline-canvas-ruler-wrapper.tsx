import { TimelineCanvasRulerWrapperProps } from "@/types/timeline";
import React, { forwardRef } from "react";

/**
 * Wrapper div around the canvas-based timeline ruler.
 * Captures mouse events for scrubbing and ensures pointer events are properly enabled.
 */
const TimelineCanvasRulerWrapper = forwardRef<
  HTMLDivElement,
  TimelineCanvasRulerWrapperProps
>(({ children, onMouseDown, className = "" }, ref) => {
  return (
    <div
      ref={ref}
      className={`relative overflow-hidden h-5 w-full select-none cursor-pointer ${className}`}
      onMouseDown={onMouseDown}
      data-ruler-wrapper
    >
      {children}
    </div>
  );
});

export default TimelineCanvasRulerWrapper;
