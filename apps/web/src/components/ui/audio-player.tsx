"use client";

import { useRef, useEffect } from "react";
import { usePlaybackStore } from "@/stores/playback-store";

interface AudioPlayerProps {
  src: string;
  className?: string;
  clipStartTime: number;
  trimStart: number;
  trimEnd: number;
  clipDuration: number;
  trackMuted?: boolean;
  // Add media preview props
  isPlaying?: boolean;
  onTimeUpdate?: (time: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export function AudioPlayer({
  src,
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
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const timelineStore = usePlaybackStore();
  
  // Use external props if provided (media preview mode), otherwise use timeline
  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : timelineStore.isPlaying;
  const currentTime = timelineStore.currentTime;
  const { volume, speed, muted } = timelineStore;
  
  // Determine if this is media preview mode
  const isMediaPreviewMode = externalIsPlaying !== undefined;

  // Calculate if we're within this clip's timeline range (only for timeline mode)
  const clipEndTime = clipStartTime + (clipDuration - trimStart - trimEnd);
  const isInClipRange = isMediaPreviewMode || (currentTime >= clipStartTime && currentTime < clipEndTime);

  // Sync playback events for timeline mode
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || isMediaPreviewMode) return; // Skip timeline events in media preview mode

    const handleSeekEvent = (e: CustomEvent) => {
      const timelineTime = e.detail.time;
      const audioTime = Math.max(
        trimStart,
        Math.min(
          clipDuration - trimEnd,
          timelineTime - clipStartTime + trimStart
        )
      );
      audio.currentTime = audioTime;
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

      if (Math.abs(audio.currentTime - targetTime) > 0.5) {
        audio.currentTime = targetTime;
      }
    };

    const handleSpeed = (e: CustomEvent) => {
      audio.playbackRate = e.detail.speed;
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
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && isInClipRange) {
      audio.play().catch(() => {
        // Handle play promise rejection silently
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, isInClipRange]);

  // Handle time updates for media preview mode
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isMediaPreviewMode) return;

    const handleTimeUpdate = () => {
      onTimeUpdate?.(audio.currentTime);
    };

    const handlePlay = () => {
      onPlay?.();
    };

    const handlePause = () => {
      onPause?.();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [isMediaPreviewMode, onTimeUpdate, onPlay, onPause]);

  // Sync media preview time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isMediaPreviewMode) return;

    // In media preview mode, sync with clipStartTime (which is actually mediaCurrentTime)
    if (Math.abs(audio.currentTime - clipStartTime) > 0.5) {
      audio.currentTime = clipStartTime;
    }
  }, [clipStartTime, isMediaPreviewMode]);

  // Sync volume and speed
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
    audio.muted = muted || trackMuted;
    audio.playbackRate = speed;
  }, [volume, speed, muted, trackMuted]);

  return (
    <audio
      ref={audioRef}
      src={src}
      className={className}
      preload="auto"
      controls={false}
      style={{ display: "none" }} // Audio elements don't need visual representation
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
