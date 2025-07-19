import { useTimelineStore } from "@/stores/timeline-store"
import { TimelineElement, TimelineTrack } from "@/types/timeline"
import { useCallback, useEffect, useState } from "react";

const BAR_HEIGHT = 2

interface UseTimelineElementVolumeProps {
  track: TimelineTrack,
  element: TimelineElement,
  timelineElementRef: React.RefObject<HTMLDivElement>
}

export function useTimelineElementVolume({
  track,
  element,
  timelineElementRef,
}: UseTimelineElementVolumeProps) {
  const { updateElementVolume } = useTimelineStore();

  const [position, setPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const updateVolumeAndPosition = useCallback((clientY: number) => {
    const timelineElement = timelineElementRef.current;
    if (!timelineElement) return;

    const rect = timelineElement.getBoundingClientRect();
    const y = clientY - rect.top;
    const clampedY = Math.max(0, Math.min(y, (timelineElement.clientHeight-BAR_HEIGHT)));

    setPosition(clampedY);

    const volume = 1 - clampedY / (timelineElement.clientHeight-BAR_HEIGHT);
    updateElementVolume(track.id, element.id, Math.max(0, Math.min(volume, 1)));

  }, [updateElementVolume, track.id, timelineElementRef]);

  const handleVolumeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevents the timeline element from changing track
    setIsDragging(true);
    updateVolumeAndPosition(e.clientY);
  }, [updateVolumeAndPosition]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      updateVolumeAndPosition(e.clientY);
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateVolumeAndPosition]);

  useEffect(() => {
    if (timelineElementRef.current) {
      const height = timelineElementRef.current.clientHeight-BAR_HEIGHT
      setPosition(height - track.volume * height)
    }
  }, [])

  return {
    position,
    handleVolumeMouseDown,
  };
}
