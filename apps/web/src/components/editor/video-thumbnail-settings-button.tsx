"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings, Film } from "lucide-react";
import {
  loadVideoThumbnailSettings,
  saveVideoThumbnailSettings,
  type VideoThumbnailSettings,
} from "@/lib/video-thumbnail-settings";
import { VideoThumbnailSettingsDialog } from "./video-thumbnail-settings-dialog";

export function VideoThumbnailSettingsButton() {
  const [thumbnailSettings, setThumbnailSettings] =
    useState<VideoThumbnailSettings>(loadVideoThumbnailSettings());
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Update settings when they change
  const updateThumbnailSetting = <K extends keyof VideoThumbnailSettings>(
    key: K,
    value: VideoThumbnailSettings[K]
  ) => {
    const newSettings = { ...thumbnailSettings, [key]: value };
    setThumbnailSettings(newSettings);
    saveVideoThumbnailSettings({ [key]: value });
  };

  // Quick toggle for enable/disable
  const handleQuickToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateThumbnailSetting("enabled", !thumbnailSettings.enabled);
  };

  // Open detailed settings
  const handleOpenSettings = () => {
    setIsDialogOpen(true);
  };

  return (
    <>
      {/* Simple Settings Icon Button */}
      <Button
        size="sm"
        variant="outline"
        className="h-7 w-7 p-0"
        onClick={handleOpenSettings}
        title={`Video Thumbnails: ${thumbnailSettings.enabled ? "Enabled" : "Disabled"} (${thumbnailSettings.quality})`}
      >
        <Settings
          className={`h-3.5 w-3.5 ${thumbnailSettings.enabled ? "text-primary" : "text-muted-foreground"}`}
        />
      </Button>

      {/* Detailed Settings Dialog */}
      <VideoThumbnailSettingsDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        settings={thumbnailSettings}
        onUpdateSetting={updateThumbnailSetting}
      />
    </>
  );
}
