"use client";

import { useState, useCallback, useRef, RefObject } from "react";
import { TimelineElement, MediaElement } from "@/types/timeline";
import { MediaItem } from "@/stores/media-store";

interface UseVideoTimelinePreviewProps {
  element: TimelineElement;
  mediaItem: MediaItem;
  elementRef: RefObject<HTMLDivElement | null>;
}

export function useVideoTimelinePreview({
  element,
  mediaItem,
  elementRef
}: UseVideoTimelinePreviewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [previewTimestamp, setPreviewTimestamp] = useState<number>(0);

  // Early return for non-video elements
  const isVideoElement = mediaItem?.type === 'video';

  // Calculate timestamp from mouse position
  const calculateTimestamp = useCallback((clientX: number) => {
    if (!elementRef.current) return 0;
    
    const rect = elementRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const progress = Math.max(0, Math.min(1, relativeX / rect.width));
    
    const trimStart = element.trimStart || 0;
    const trimEnd = element.trimEnd || 0;
    const availableDuration = element.duration - trimStart - trimEnd;
    
    return trimStart + (progress * availableDuration);
  }, [element, elementRef]);

  // Mouse event handlers - only active for video elements
  const handleMouseEnter = useCallback(() => {
    if (isVideoElement) {
      setIsHovered(true);
    }
  }, [isVideoElement]);

  const handleMouseLeave = useCallback(() => {
    if (isVideoElement) {
      setIsHovered(false);
      setMousePosition(null);
      setPreviewTimestamp(0);
    }
  }, [isVideoElement]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isVideoElement || !isHovered) return;
    
    const timestamp = calculateTimestamp(e.clientX);
    setPreviewTimestamp(timestamp);
    setMousePosition({ x: e.clientX, y: e.clientY });
  }, [isVideoElement, isHovered, calculateTimestamp]);

  // Calculate relative position (0-1) from mouse position
  const getRelativePosition = useCallback((clientX: number) => {
    if (!elementRef.current) return 0;
    
    const rect = elementRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    return Math.max(0, Math.min(1, relativeX / rect.width));
  }, [elementRef]);

  return {
    isHovered: isVideoElement ? isHovered : false,
    mousePosition: isVideoElement ? mousePosition : null,
    previewTimestamp: isVideoElement ? previewTimestamp : 0,
    handlers: isVideoElement ? {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onMouseMove: handleMouseMove
    } : {},
    utils: {
      calculateTimestamp,
      getRelativePosition
    }
  };
}