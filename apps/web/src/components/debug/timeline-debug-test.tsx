"use client";

import React, { useRef, useEffect, useState } from "react";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { useTimelineZoom } from "@/hooks/use-timeline-zoom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { processMediaFiles } from "@/lib/media-processing";
import { toast } from "sonner";
import { Upload, Loader2, Image, Video, Music } from "lucide-react";

interface DebugData {
  timestamp: string;
  containerWidth: number | null;
  fallbackUsed: boolean;
  dynamicWidth: number;
  zoomLevel: number;
  duration: number;
  currentTime: number;
}

export function TimelineDebugTest() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [debugData, setDebugData] = useState<DebugData[]>([]);
  const [duration, setDuration] = useState(10);
  const [currentTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Store hooks
  const { mediaItems, addMediaItem } = useMediaStore();
  const { activeProject, createNewProject } = useProjectStore();
  const { addMediaToNewTrack } = useTimelineStore();

  // Create a temporary debug project if none exists
  useEffect(() => {
    const initDebugProject = async () => {
      if (!activeProject) {
        try {
          console.log("🔍 Creating temporary debug project...");
          await createNewProject("Debug Timeline Test Project");
          toast.success("Created temporary debug project");
        } catch (error) {
          console.error("Failed to create debug project:", error);
          toast.error("Failed to create debug project");
        }
      }
    };

    initDebugProject();
  }, [activeProject, createNewProject]);

  // Test Assumption 2: Use actual zoom hook to track state changes
  const { zoomLevel, setZoomLevel } = useTimelineZoom({
    containerRef: timelineRef,
    isInTimeline: true,
  });

  const calculateDynamicWidth = () => {
    const containerWidth = timelineRef.current?.clientWidth;
    const dynamicTimelineWidth = Math.max(
      (duration || 0) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
      (currentTime + 30) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
      containerWidth || 1000 // This is the potential issue
    );

    const newDebugData: DebugData = {
      timestamp: new Date().toISOString(),
      containerWidth: containerWidth || null,
      fallbackUsed: !containerWidth,
      dynamicWidth: dynamicTimelineWidth,
      zoomLevel,
      duration,
      currentTime,
    };

    setDebugData((prev) => [...prev.slice(-9), newDebugData]); // Keep last 10 entries

    console.log("🔍 Timeline Debug Test:", newDebugData);

    return dynamicTimelineWidth;
  };

  useEffect(() => {
    calculateDynamicWidth();
  }, [zoomLevel, duration, currentTime]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      console.log("🔍 Container Resized");
      calculateDynamicWidth();
    });

    if (timelineRef.current) {
      resizeObserver.observe(timelineRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  const triggerResize = () => {
    if (timelineRef.current) {
      timelineRef.current.style.width =
        timelineRef.current.style.width === "50%" ? "100%" : "50%";
    }
  };

  const testZoomReset = () => {
    console.log("🔍 Testing Zoom Reset - Before:", zoomLevel);
    setZoomLevel(1); // Reset to default
    console.log("🔍 Testing Zoom Reset - After reset to 1");
  };

  const testZoomChange = () => {
    const newZoom = zoomLevel === 1 ? 2 : 1;
    console.log("🔍 Testing Zoom Change - From:", zoomLevel, "To:", newZoom);
    setZoomLevel(newZoom);
  };

  const testDurationChange = () => {
    const newDuration = duration === 10 ? 20 : 10;
    console.log(
      "🔍 Testing Duration Change - From:",
      duration,
      "To:",
      newDuration
    );
    setDuration(newDuration);
  };

  const simulateTrackChange = () => {
    // Simulate what happens when tracks change and duration is recalculated
    const randomDuration = Math.floor(Math.random() * 30) + 5; // 5-35 seconds
    console.log("🔍 Simulating Track Change - New Duration:", randomDuration);
    setDuration(randomDuration);
  };

  // Media upload functionality
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    // Wait for project to be created if it doesn't exist
    if (!activeProject) {
      toast.info("Creating debug project...");
      try {
        await createNewProject("Debug Timeline Test Project");
      } catch (error) {
        toast.error("Failed to create debug project");
        return;
      }
    }

    const currentProject = useProjectStore.getState().activeProject;
    if (!currentProject) {
      toast.error("No active project found. Please try again.");
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      const processedItems = await processMediaFiles(
        e.target.files,
        (progress) => setUploadProgress(progress)
      );

      for (const item of processedItems) {
        await addMediaItem(currentProject.id, item);

        // Add to timeline automatically for testing
        const currentMediaItems = useMediaStore.getState().mediaItems;
        const addedItem = currentMediaItems.find(
          (media) => media.name === item.name && media.url === item.url
        );
        if (addedItem) {
          const success = addMediaToNewTrack(addedItem);
          if (success) {
            console.log("🔍 Successfully added to timeline:", addedItem);
            toast.success(`Added ${item.name} to timeline`);
          } else {
            console.error("🔍 Failed to add to timeline:", addedItem);
            toast.error(`Failed to add ${item.name} to timeline`);
          }
        } else {
          console.error("🔍 Media item not found after upload:", item);
          toast.error(`Media item ${item.name} not found after upload`);
        }
      }
    } catch (error) {
      console.error("Error processing files:", error);
      toast.error("Failed to process uploaded files");
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
      e.target.value = ""; // Reset input
    }
  };

  const renderMediaIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "audio":
        return <Music className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      default:
        return <Upload className="h-4 w-4" />;
    }
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <Card>
        <CardHeader>
          <CardTitle>Timeline Container Width Debug Test</CardTitle>
          <CardDescription>
            Testing timeline width calculation and container reference issues
            with real media
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Media Upload Section */}
          <div className="p-4 border border-dashed border-muted rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-sm">Media Upload</h4>
                <p className="text-xs text-muted-foreground">
                  {activeProject
                    ? `Upload media to test timeline with real content (Project: ${activeProject.name})`
                    : "Creating debug project..."}
                </p>
              </div>
              <Button
                onClick={handleFileSelect}
                disabled={isProcessing || !activeProject}
                size="sm"
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {uploadProgress}%
                  </>
                ) : activeProject ? (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Media
                  </>
                ) : (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Project...
                  </>
                )}
              </Button>
            </div>

            {/* Media Items Display */}
            {mediaItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Uploaded Media ({mediaItems.length} items):
                </p>
                <div className="flex flex-wrap gap-2">
                  {mediaItems.slice(-5).map((item) => (
                    <Badge
                      key={item.id}
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      {renderMediaIcon(item.type)}
                      <span className="truncate max-w-20">{item.name}</span>
                    </Badge>
                  ))}
                  {mediaItems.length > 5 && (
                    <Badge variant="secondary">
                      +{mediaItems.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Test Controls */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={triggerResize} variant="outline" size="sm">
              Toggle Container Width
            </Button>
            <Button onClick={testZoomChange} variant="outline" size="sm">
              Toggle Zoom Level
            </Button>
            <Button onClick={testZoomReset} variant="destructive" size="sm">
              Reset Zoom to 1x
            </Button>
            <Button onClick={testDurationChange} variant="secondary" size="sm">
              Toggle Duration
            </Button>
            <Button onClick={simulateTrackChange} variant="secondary" size="sm">
              Simulate Track Change
            </Button>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="text-sm font-medium mb-2">Current State:</div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                Zoom Level: <Badge variant="outline">{zoomLevel}x</Badge>
              </div>
              <div>
                Duration: <Badge variant="outline">{duration}s</Badge>
              </div>
              <div>
                Project:{" "}
                <Badge variant="outline">
                  {activeProject ? activeProject.name : "None"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="text-sm font-medium mb-2">Timeline State:</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                Media Items:{" "}
                <Badge variant="outline">{mediaItems.length}</Badge>
              </div>
              <div>
                Timeline Tracks:{" "}
                <Badge variant="outline">
                  {useTimelineStore.getState().tracks.length}
                </Badge>
              </div>
            </div>
            {mediaItems.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-muted-foreground mb-1">
                  Recent Media:
                </div>
                <div className="flex flex-wrap gap-1">
                  {mediaItems.slice(-3).map((item) => (
                    <Badge
                      key={item.id}
                      variant="secondary"
                      className="text-xs"
                    >
                      {item.name} ({item.type})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div
            ref={timelineRef}
            className="border-2 border-dashed border-muted h-20 transition-all duration-300 rounded-lg bg-muted/20"
            style={{ width: "100%" }}
          >
            <div className="p-2 text-sm text-muted-foreground">
              Timeline Container (resize me to test)
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Debug Data (Last 10 calculations):</h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {debugData.map((data, index) => (
                <div
                  key={index}
                  className={`text-xs p-3 rounded-lg border ${
                    data.fallbackUsed
                      ? "bg-destructive/10 border-destructive/20"
                      : "bg-green-500/10 border-green-500/20"
                  }`}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <strong>Time:</strong>{" "}
                      {new Date(data.timestamp).toLocaleTimeString()}
                    </div>
                    <div>
                      <strong>Container Width:</strong>{" "}
                      {data.containerWidth || "NULL (using fallback!)"}
                    </div>
                    <div>
                      <strong>Dynamic Width:</strong> {data.dynamicWidth}px
                    </div>
                    <div>
                      <strong>Fallback Used:</strong>{" "}
                      {data.fallbackUsed ? "YES ⚠️" : "NO ✅"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
