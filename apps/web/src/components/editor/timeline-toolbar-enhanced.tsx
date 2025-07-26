"use client";

import { TimelineToolbar } from "./timeline-toolbar";
import { Button } from "../ui/button";
import { MousePointer, Scissors, Type, Magnet, ZoomIn, ZoomOut } from "lucide-react";
import { EnhancedTimelineToolbarProps } from "@/types/timeline";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "../ui/tooltip";

// SAFE: Wrapper component that adds features without modifying existing toolbar
export function TimelineToolbarEnhanced({
  zoomLevel,
  setZoomLevel,
  selectedTool = 'select',
  setSelectedTool = () => {},
  isSnappingEnabled = false,
  setIsSnappingEnabled = () => {},
  featureFlags = {},
  // Pass through existing toolbar props
  ...existingToolbarProps
}: EnhancedTimelineToolbarProps & any) {
  // If feature flags disable enhancements, render original toolbar
  if (!featureFlags.enableToolSelection && !featureFlags.enableSnapping) {
    return (
      <TimelineToolbar 
        {...existingToolbarProps}
        // SAFE: Pass through zoom controls if they exist
      />
    );
  }
  
  // Enhanced toolbar implementation - single row layout
  return (
    <div className="border-b flex items-center px-4 py-3 gap-4">
      {/* SAFE: Original toolbar content without wrapper */}
      <TimelineToolbar {...existingToolbarProps} noWrapper={true} />
      
      {/* SAFE: Enhanced controls on same row */}
      {(featureFlags.enableToolSelection || featureFlags.enableSnapping) && (
        <>
          <div className="w-px h-6 bg-border mx-2" />
          <div className="flex items-center gap-2">
        <TooltipProvider delayDuration={500}>
          {/* Tool Selection */}
          {featureFlags.enableToolSelection && (
            <>
              <div className="flex gap-1 mr-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={selectedTool === 'select' ? 'outline' : 'outline'}
                      onClick={() => setSelectedTool('select')}
                      className="h-8 w-8"
                      style={{
                        backgroundColor: 'transparent',
                        borderColor: 'transparent',
                        color: selectedTool === 'select' ? '#ffffff' : undefined
                      }}
                    >
                      <MousePointer className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Select Tool (V)</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTool('cut')}
                      className="h-8 w-8"
                      style={{
                        backgroundColor: 'transparent',
                        borderColor: selectedTool === 'cut' ? '#3b82f6' : undefined,
                        color: selectedTool === 'cut' ? '#3b82f6' : undefined
                      }}
                    >
                      <Scissors className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Cut Tool (C)</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTool('text')}
                      className="h-8 w-8"
                      style={{
                        backgroundColor: 'transparent',
                        borderColor: selectedTool === 'text' ? '#3b82f6' : undefined,
                        color: selectedTool === 'text' ? '#3b82f6' : undefined
                      }}
                    >
                      <Type className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Text Tool (T)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <div className="w-px h-6 bg-border mx-2" />
            </>
          )}
          
          {/* Snapping Toggle */}
          {featureFlags.enableSnapping && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsSnappingEnabled(!isSnappingEnabled)}
                    className="h-8 w-8"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: isSnappingEnabled ? '#3b82f6' : undefined,
                      color: isSnappingEnabled ? '#3b82f6' : undefined
                    }}
                  >
                    <Magnet className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Toggle Snapping (S)</p>
                </TooltipContent>
              </Tooltip>
              
              <div className="w-px h-6 bg-border mx-2" />
            </>
          )}
          
          {/* Zoom Controls */}
          <div className="flex gap-1 ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setZoomLevel(Math.max(0.1, zoomLevel - 0.1))}
                  className="h-8 w-8"
                  style={{ backgroundColor: 'transparent' }}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Zoom Out</p>
              </TooltipContent>
            </Tooltip>
            
            <span className="text-sm px-2 py-1 bg-background rounded border min-w-[60px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setZoomLevel(Math.min(5, zoomLevel + 0.1))}
                  className="h-8 w-8"
                  style={{ backgroundColor: 'transparent' }}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Zoom In</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
          </div>
        </>
      )}
    </div>
  );
}