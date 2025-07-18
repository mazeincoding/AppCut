import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { TimelineCanvasRulerProps } from "@/types/timeline";
import React, { useRef, useEffect } from "react";

/**
 * TimelineCanvasRuler renders the timeline ticks and labels using Canvas.
 * Should be wrapped by TimelineCanvasRulerWrapper for interaction handling.
 */
export default function TimelineCanvasRuler({
  zoomLevel,
  duration,
  width,
  height = 20,
}: TimelineCanvasRulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

    const getTimeInterval = () => {
      if (pixelsPerSecond >= 200) return 0.1;
      if (pixelsPerSecond >= 100) return 0.5;
      if (pixelsPerSecond >= 50) return 1;
      if (pixelsPerSecond >= 25) return 2;
      if (pixelsPerSecond >= 12) return 5;
      if (pixelsPerSecond >= 6) return 10;
      return 30;
    };

    const mainInterval = getTimeInterval();
    const tickPerMain = 5;
    const subInterval = mainInterval / tickPerMain;

    const totalTicks = Math.ceil(duration / subInterval) + 1;

    for (let i = 0; i < totalTicks; i++) {
      const time = i * subInterval;
      const x = time * pixelsPerSecond;

      const isMain = i % tickPerMain === 0;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, isMain ? height * 0.3 : height * 0.1);
      ctx.strokeStyle = isMain ? "#999" : "#ccc";
      ctx.lineWidth = isMain ? 1 : 0.5;
      ctx.stroke();

      // Label
      if (isMain) {
        ctx.fillStyle = "#666";
        ctx.font = "10px sans-serif";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        let label = "";
        let xTranslate = 10;
        if (mainInterval < 1) {
          label = `${time.toFixed(1)}s`;
        } else if (mins > 0) {
          label = `${mins}:${secs.toString().padStart(2, "0")}`;
        } else {
          label = `${secs}s`;
          xTranslate = 5;
        }
        ctx.fillText(label, x - xTranslate, height - 4);
      }
    }
  }, [zoomLevel, duration, width, height]);

  return (
    <canvas ref={canvasRef} width={width} height={height} className="block" />
  );
}
