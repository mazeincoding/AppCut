"use client";

import type { TrackType } from "@/types/timeline";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  Copy,
  Pause,
  Play,
  Scissors,
  Snowflake,
  SplitSquareHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface TimelineToolbarProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  tracks: any[];
  toggle: () => void;
  setSpeed: (speed: number) => void;
  addTrack: (type: TrackType) => string;
  addClipToTrack: (trackId: string, clip: any) => void;
  handleSplitSelected: () => void;
  handleDuplicateSelected: () => void;
  handleFreezeSelected: () => void;
  handleDeleteSelected: () => void;
}

export function TimelineToolbar({
  isPlaying,
  currentTime,
  duration,
  speed,
  tracks,
  toggle,
  setSpeed,
  addTrack,
  addClipToTrack,
  handleSplitSelected,
  handleDuplicateSelected,
  handleFreezeSelected,
  handleDeleteSelected,
}: TimelineToolbarProps) {
  return (
    <div className="border-b flex items-center px-2 py-1 gap-1">
      <TooltipProvider delayDuration={500}>
        {/* Play/Pause Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="text"
              size="icon"
              onClick={toggle}
              className="mr-2"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isPlaying ? "Pause (Space)" : "Play (Space)"}
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Time Display */}
        <div
          className="text-xs text-muted-foreground font-mono px-2"
          style={{ minWidth: "18ch", textAlign: "center" }}
        >
          {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
        </div>

        {/* Test Clip Button - for debugging */}
        {tracks.length === 0 && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const trackId = addTrack("media");
                    addClipToTrack(trackId, {
                      mediaId: "test",
                      name: "Test Clip",
                      duration: 5,
                      startTime: 0,
                      trimStart: 0,
                      trimEnd: 0,
                    });
                  }}
                  className="text-xs"
                >
                  Add Test Clip
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add a test clip to try playback</TooltipContent>
            </Tooltip>
          </>
        )}

        <div className="w-px h-6 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="text" size="icon" onClick={handleSplitSelected}>
              <Scissors className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split clip (S)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="text" size="icon">
              <ArrowLeftToLine className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split and keep left (A)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="text" size="icon">
              <ArrowRightToLine className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split and keep right (D)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="text" size="icon">
              <SplitSquareHorizontal className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Separate audio (E)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="text"
              size="icon"
              onClick={handleDuplicateSelected}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Duplicate clip (Ctrl+D)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="text" size="icon" onClick={handleFreezeSelected}>
              <Snowflake className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Freeze frame (F)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="text" size="icon" onClick={handleDeleteSelected}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete clip (Delete)</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Speed Control */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Select
              value={speed.toFixed(1)}
              onValueChange={(value) => setSpeed(parseFloat(value))}
            >
              <SelectTrigger className="w-[90px] h-8">
                <SelectValue placeholder="1.0x" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="1.0">1.0x</SelectItem>
                <SelectItem value="1.5">1.5x</SelectItem>
                <SelectItem value="2.0">2.0x</SelectItem>
              </SelectContent>
            </Select>
          </TooltipTrigger>
          <TooltipContent>Playback Speed</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
