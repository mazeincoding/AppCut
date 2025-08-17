"use client";

import { useRef, useEffect } from "react";
import { usePlaybackStore } from "@/stores/playback-store";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  clipStartTime: number;
  trimStart: number;
  trimEnd: number;
  clipDuration: number;
  trackMuted?: boolean;
  isPlaying?: boolean;
  onTimeUpdate?: (time: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export function VideoPlayer({
  src,
  poster,
  className = "",
  clipStartTime,
  trimStart,
  trimEnd,
  clipDuration,
  trackMuted = false,
  // Media preview props
  isPlaying: externalIsPlaying,
  onTimeUpdate,
  onPlay,
  onPause,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineStore = usePlaybackStore();

  // Use external props if provided (media preview mode), otherwise use timeline
  const isPlaying =
    externalIsPlaying !== undefined ? externalIsPlaying : timelineStore.isPlaying;
  const currentTime = timelineStore.currentTime;
  const { volume, speed, muted } = timelineStore;

  // Determine if this is media preview mode
  const isMediaPreviewMode = externalIsPlaying !== undefined;

  // Calculate if we're within this clip's timeline range (only for timeline mode)
  const clipEndTime = clipStartTime + (clipDuration - trimStart - trimEnd);
  const isInClipRange = isMediaPreviewMode || (currentTime >= clipStartTime && currentTime < clipEndTime);

  // Sync playback events for timeline mode
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isMediaPreviewMode) return; // Skip timeline events in media preview mode

    const handleSeekEvent = (e: CustomEvent) => {
      const timelineTime = e.detail.time;
      const videoTime = Math.max(
        trimStart,
        Math.min(
          clipDuration - trimEnd,
          timelineTime - clipStartTime + trimStart
        )
      );
      video.currentTime = videoTime;
    };

    const handleUpdateEvent = (e: CustomEvent) => {
      const timelineTime = e.detail.time;
      const targetTime = Math.max(
        trimStart,
        Math.min(
          clipDuration - trimEnd,
          timelineTime - clipStartTime + trimStart
        )
      );

      if (Math.abs(video.currentTime - targetTime) > 0.5) {
        video.currentTime = targetTime;
      }
    };

    const handleSpeed = (e: CustomEvent) => {
      video.playbackRate = e.detail.speed;
    };

    window.addEventListener("playback-seek", handleSeekEvent as EventListener);
    window.addEventListener(
      "playback-update",
      handleUpdateEvent as EventListener
    );
    window.addEventListener("playback-speed", handleSpeed as EventListener);

    return () => {
      window.removeEventListener(
        "playback-seek",
        handleSeekEvent as EventListener
      );
      window.removeEventListener(
        "playback-update",
        handleUpdateEvent as EventListener
      );
      window.removeEventListener(
        "playback-speed",
        handleSpeed as EventListener
      );
    };
  }, [clipStartTime, trimStart, trimEnd, clipDuration, isMediaPreviewMode]);

  // Sync playback state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying && isInClipRange) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, isInClipRange]);

  // Handle time updates for media preview mode
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isMediaPreviewMode) return;

    const handleTimeUpdate = () => {
      onTimeUpdate?.(video.currentTime);
    };

    const handlePlay = () => {
      onPlay?.();
    };

    const handlePause = () => {
      onPause?.();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [isMediaPreviewMode, onTimeUpdate, onPlay, onPause]);

  // Sync media preview time
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isMediaPreviewMode) return;

    // In media preview mode, sync with clipStartTime (which is actually mediaCurrentTime)
    if (Math.abs(video.currentTime - clipStartTime) > 0.5) {
      video.currentTime = clipStartTime;
    }
  }, [clipStartTime, isMediaPreviewMode]);

  // Sync volume and speed
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = volume;
    video.muted = muted || trackMuted;
    video.playbackRate = speed;
  }, [volume, speed, muted, trackMuted]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      className={`max-w-full max-h-full object-contain ${className}`}
      playsInline
      preload="auto"
      controls={false}
      disablePictureInPicture
      disableRemotePlayback
      style={{ pointerEvents: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
