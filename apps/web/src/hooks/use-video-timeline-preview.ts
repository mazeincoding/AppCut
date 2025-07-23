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

  // Mouse event handlers
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setMousePosition(null);
    setPreviewTimestamp(0);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isHovered) return;
    
    const timestamp = calculateTimestamp(e.clientX);
    setPreviewTimestamp(timestamp);
    setMousePosition({ x: e.clientX, y: e.clientY });
  }, [isHovered, calculateTimestamp]);

  // Calculate relative position (0-1) from mouse position
  const getRelativePosition = useCallback((clientX: number) => {
    if (!elementRef.current) return 0;
    
    const rect = elementRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    return Math.max(0, Math.min(1, relativeX / rect.width));
  }, [elementRef]);

  return {
    isHovered,
    mousePosition,
    previewTimestamp,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onMouseMove: handleMouseMove
    },
    utils: {
      calculateTimestamp,
      getRelativePosition
    }
  };
}