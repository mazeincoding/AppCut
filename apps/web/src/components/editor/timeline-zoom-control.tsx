import { useState } from "react";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from "@/constants/timeline-constants";

interface TimelineZoomControlProps {
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  onFitToWindow?: () => void;
  className?: string;
}

export function TimelineZoomControl({
  zoomLevel,
  onZoomChange,
  onFitToWindow,
  className,
}: TimelineZoomControlProps) {
  // Convert zoom level to percentage for display
  const zoomPercentage = Math.round(zoomLevel * 100);

  const handleZoomIn = () => {
    onZoomChange(Math.min(MAX_ZOOM, zoomLevel + ZOOM_STEP));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(MIN_ZOOM, zoomLevel - ZOOM_STEP));
  };

  const handleReset = () => {
    if (onFitToWindow) {
      onFitToWindow();
    } else {
      onZoomChange(1);
    }
  };

  const handleSliderChange = (value: number[]) => {
    onZoomChange(value[0]);
  };

  return (
    <div className={`flex items-center gap-1 ${className || ""}`}>
      {/* Zoom Out Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoomLevel <= MIN_ZOOM}
            className="h-7 w-7 p-0"
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Zoom out</p>
          <p className="text-xs text-muted-foreground">Ctrl + - / Ctrl + Wheel</p>
        </TooltipContent>
      </Tooltip>

      {/* Zoom Slider */}
      <div className="flex items-center gap-2 w-20">
        <Slider
          value={[zoomLevel]}
          onValueChange={handleSliderChange}
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.1}
          className="flex-1"
        />
      </div>

      {/* Zoom In Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoomLevel >= MAX_ZOOM}
            className="h-7 w-7 p-0"
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Zoom in</p>
          <p className="text-xs text-muted-foreground">Ctrl + + / Ctrl + Wheel</p>
        </TooltipContent>
      </Tooltip>

      {/* Fit to Window / Reset Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2 min-w-[60px] flex items-center gap-1"
          >
            {onFitToWindow ? (
              <>
                <Maximize2 className="h-3 w-3" />
              </>
            ) : (
              <span className="text-xs font-mono">{zoomPercentage}%</span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{onFitToWindow ? "Fit to Window" : "Reset Zoom"}</p>
          <p className="text-xs text-muted-foreground">
            {onFitToWindow ? "Show all track content" : "Ctrl + 0"}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
