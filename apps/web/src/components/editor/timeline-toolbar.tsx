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
  noWrapper?: boolean; // SAFE: Optional prop to render without wrapper
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
  noWrapper = false, // SAFE: Default to original behavior
}: TimelineToolbarProps) {
  // SAFE: Conditional wrapper based on noWrapper prop
  const toolbarContent = (
      <TooltipProvider delayDuration={500}>
        {/* Play/Pause Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={toggle}
              className="mr-2 hover:text-[#05c7c7] transition-colors"
              style={{ backgroundColor: 'transparent', border: 'none' }}
            >
              {isPlaying ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
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
          {(currentTime || 0).toFixed(1)}s / {(duration || 0).toFixed(1)}s
        </div>

        {/* Test Clip Button - for debugging */}
        {(tracks?.length || 0) === 0 && (
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
            <Button variant="outline" size="icon" onClick={handleSplitSelected} className="mx-2 hover:text-[#05c7c7] transition-colors" style={{ backgroundColor: 'transparent', border: 'none' }}>
              <Scissors className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split clip (S)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="mx-2 hover:text-[#05c7c7] transition-colors" style={{ backgroundColor: 'transparent', border: 'none' }}>
              <ArrowLeftToLine className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split and keep left (A)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="mx-2 hover:text-[#05c7c7] transition-colors" style={{ backgroundColor: 'transparent', border: 'none' }}>
              <ArrowRightToLine className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split and keep right (D)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="mx-2 hover:text-[#05c7c7] transition-colors" style={{ backgroundColor: 'transparent', border: 'none' }}>
              <SplitSquareHorizontal className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Separate audio (E)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleDuplicateSelected}
              className="mx-2 hover:text-[#05c7c7] transition-colors"
              style={{ backgroundColor: 'transparent', border: 'none' }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Duplicate clip (Ctrl+D)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={handleFreezeSelected} className="mx-2 hover:text-[#05c7c7] transition-colors" style={{ backgroundColor: 'transparent', border: 'none' }}>
              <Snowflake className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Freeze frame (F)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={handleDeleteSelected} className="mx-2 hover:text-[#05c7c7] transition-colors" style={{ backgroundColor: 'transparent', border: 'none' }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete clip (Delete)</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Speed Control - Fixed: Separate tooltip and select to avoid ref issues */}
        <div className="relative">
          <Select
            value={speed.toFixed(1)}
            onValueChange={(value) => setSpeed(parseFloat(value))}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectTrigger className="w-[90px] h-8" style={{ borderColor: 'transparent' }}>
                  <SelectValue placeholder="1.0x" />
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent>Playback Speed</TooltipContent>
            </Tooltip>
            <SelectContent>
              <SelectItem value="0.5">0.5x</SelectItem>
              <SelectItem value="1.0">1.0x</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
              <SelectItem value="2.0">2.0x</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </TooltipProvider>
  );

  // SAFE: Return with or without wrapper based on prop
  return noWrapper ? toolbarContent : (
    <div className="border-b flex items-center px-4 py-[8px] gap-4">
      {toolbarContent}
    </div>
  );
}
