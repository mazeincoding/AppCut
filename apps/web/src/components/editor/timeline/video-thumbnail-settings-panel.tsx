"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getVideoThumbnailCacheStats,
  clearAllVideoThumbnails,
} from "@/lib/video-thumbnail-utils";
import {
  loadVideoThumbnailSettings,
  saveVideoThumbnailSettings,
  videoThumbnailPerformanceMonitor,
  type VideoThumbnailSettings,
} from "@/lib/video-thumbnail-settings";
import { Settings, Trash2, BarChart3 } from "lucide-react";

export function VideoThumbnailSettingsPanel() {
  const [settings, setSettings] = useState<VideoThumbnailSettings>(
    loadVideoThumbnailSettings()
  );
  const [cacheStats, setCacheStats] = useState(getVideoThumbnailCacheStats());
  const [performanceStats, setPerformanceStats] = useState(
    videoThumbnailPerformanceMonitor.getStats()
  );
  const [isOpen, setIsOpen] = useState(false);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(getVideoThumbnailCacheStats());
      setPerformanceStats(videoThumbnailPerformanceMonitor.getStats());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const updateSetting = <K extends keyof VideoThumbnailSettings>(
    key: K,
    value: VideoThumbnailSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveVideoThumbnailSettings({ [key]: value });
  };

  const handleClearCache = async () => {
    await clearAllVideoThumbnails();
    setCacheStats(getVideoThumbnailCacheStats());
    videoThumbnailPerformanceMonitor.reset();
    setPerformanceStats(videoThumbnailPerformanceMonitor.getStats());
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Settings className="h-4 w-4 mr-2" />
        Video Thumbnail Settings
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50 max-h-[80vh] overflow-y-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Video Thumbnail Settings</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
            ×
          </Button>
        </div>
        <CardDescription>
          Configure timeline video thumbnail behavior and performance
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Timeline Video Thumbnails</div>
            <div className="text-sm text-muted-foreground">
              Enable continuous video thumbnail updates (Premiere Pro style)
            </div>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => updateSetting("enabled", checked)}
          />
        </div>

        {/* Quality Setting */}
        <div className="space-y-2">
          <div className="font-medium">Quality</div>
          <Select
            value={settings.quality}
            onValueChange={(value: VideoThumbnailSettings["quality"]) =>
              updateSetting("quality", value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low (120x90, 1.5s interval)</SelectItem>
              <SelectItem value="medium">
                Medium (160x120, 2s interval)
              </SelectItem>
              <SelectItem value="high">High (240x180, 1s interval)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Update During Playback */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Highlight During Playback</div>
            <div className="text-sm text-muted-foreground">
              Update thumbnail highlight while video is playing
            </div>
          </div>
          <Switch
            checked={settings.updateDuringPlayback}
            onCheckedChange={(checked) =>
              updateSetting("updateDuringPlayback", checked)
            }
          />
        </div>

        {/* Preload on Mount */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Generate Initial Thumbnails</div>
            <div className="text-sm text-muted-foreground">
              Generate thumbnails on load to show different frames
            </div>
          </div>
          <Switch
            checked={settings.preloadOnMount}
            onCheckedChange={(checked) =>
              updateSetting("preloadOnMount", checked)
            }
          />
        </div>

        {/* Cache Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-medium">Max Cache Size</div>
            <Badge variant="outline">{settings.maxCacheSize} thumbnails</Badge>
          </div>
          <Slider
            value={[settings.maxCacheSize]}
            onValueChange={([value]) => updateSetting("maxCacheSize", value)}
            min={100}
            max={1000}
            step={50}
            className="w-full"
          />
        </div>

        {/* Update Threshold */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-medium">Update Sensitivity</div>
            <Badge variant="outline">{settings.updateThreshold}s</Badge>
          </div>
          <Slider
            value={[settings.updateThreshold]}
            onValueChange={([value]) => updateSetting("updateThreshold", value)}
            min={0.05}
            max={0.5}
            step={0.05}
            className="w-full"
          />
          <div className="text-xs text-muted-foreground">
            Lower values = more responsive, higher CPU usage
          </div>
        </div>

        {/* Cache Statistics */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <div className="font-medium">Cache Statistics</div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/50 p-2 rounded">
              <div className="font-medium">{cacheStats.totalThumbnails}</div>
              <div className="text-muted-foreground">Cached</div>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <div className="font-medium">{cacheStats.mediaCount}</div>
              <div className="text-muted-foreground">Videos</div>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <div className="font-medium">
                {cacheStats.cacheUtilization < 1 &&
                cacheStats.cacheUtilization > 0
                  ? cacheStats.cacheUtilization.toFixed(1)
                  : cacheStats.cacheUtilization.toFixed(0)}
                %
              </div>
              <div className="text-muted-foreground">Utilization</div>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <div className="font-medium">
                {performanceStats.cacheHitRate.toFixed(1)}%
              </div>
              <div className="text-muted-foreground">Hit Rate</div>
            </div>
          </div>

          {performanceStats.averageGenerationTime > 0 && (
            <div className="text-xs text-muted-foreground">
              Avg generation:{" "}
              {performanceStats.averageGenerationTime.toFixed(0)}ms
            </div>
          )}
        </div>

        {/* Clear Cache Button */}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearCache}
          className="w-full"
          disabled={cacheStats.totalThumbnails === 0}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Cache ({cacheStats.totalThumbnails} thumbnails)
        </Button>
      </CardContent>
    </Card>
  );
}

// Backward compatibility export
/** @deprecated Use VideoThumbnailSettingsPanel instead */
export const ThumbnailSettingsPanel = VideoThumbnailSettingsPanel;
