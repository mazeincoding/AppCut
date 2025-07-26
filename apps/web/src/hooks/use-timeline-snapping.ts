import { useState, useCallback, useMemo } from 'react';
import { TimelineTrack, SnapPoint, SnapResult, TimelineFeatureFlags } from '@/types/timeline';
import { TIMELINE_CONSTANTS } from '@/constants/timeline-constants';
import { snapTimeToFrame } from '@/constants/timeline-constants';
import { useProjectStore } from '@/stores/project-store';

interface UseTimelineSnappingProps {
  tracks: TimelineTrack[];
  zoomLevel: number;
  enabled?: boolean; // SAFE: Defaults to false
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
}

export function useTimelineSnapping({
  tracks,
  zoomLevel,
  enabled = false, // SAFE: Off by default
  onSnapPointChange,
}: UseTimelineSnappingProps) {
  const { activeProject } = useProjectStore();
  const projectFps = activeProject?.fps || 30;
  
  // SAFE: If not enabled, return legacy behavior
  if (!enabled) {
    return {
      getSnapTime: (time: number) => ({
        snappedTime: snapTimeToFrame(time, projectFps), // Use existing function
        didSnap: false,
      }),
      snapPoints: [],
      activeSnapPoint: null,
      clearSnapPoints: () => {},
      getSnapPositions: () => [],
      isSnapping: false,
    };
  }
  
  // New snapping implementation continues...
  
  // Inside the hook, after the early return:
  const [activeSnapPoint, setActiveSnapPoint] = useState<SnapPoint | null>(null);

  const snapPoints = useMemo(() => {
    const points: SnapPoint[] = [];
    
    // SAFE: Only generate points if enabled
    if (!enabled) return points;
    
    try {
      tracks.forEach(track => {
        track.elements.forEach(element => {
          points.push({
            position: element.startTime,
            type: 'element-start',
            strength: 0.8,
            elementId: element.id,
            trackId: track.id,
          });
          
          const elementEnd = element.startTime + element.duration - element.trimStart - element.trimEnd;
          points.push({
            position: elementEnd,
            type: 'element-end',
            strength: 0.8,
            elementId: element.id,
            trackId: track.id,
          });
        });
      });
    } catch (error) {
      console.warn('Snapping: Error generating snap points', error);
      // SAFE: Return empty array on error
      return [];
    }
    
    return points;
  }, [tracks, enabled]);
  
  const getSnapTime = useCallback((time: number): SnapResult => {
    // SAFE: Always fall back to frame snapping if anything fails
    try {
      if (!enabled || snapPoints.length === 0) {
        return {
          snappedTime: snapTimeToFrame(time, projectFps),
          didSnap: false,
        };
      }
      
      const threshold = 10; // pixels
      let closestSnap: SnapPoint | null = null;
      let closestDistance = Infinity;
      
      snapPoints.forEach(point => {
        const distance = Math.abs(point.position - time);
        const pixelDistance = distance * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
        
        if (pixelDistance < threshold && distance < closestDistance) {
          closestDistance = distance;
          closestSnap = point;
        }
      });
      
      if (closestSnap !== null) {
        const snap: SnapPoint = closestSnap;
        setActiveSnapPoint(snap);
        onSnapPointChange?.(snap);
        return {
          snappedTime: snap.position,
          snapPoint: snap,
          didSnap: true,
        };
      }
      
      // SAFE: Fall back to frame snapping
      return {
        snappedTime: snapTimeToFrame(time, projectFps),
        didSnap: false,
      };
    } catch (error) {
      console.warn('Snapping: Error in getSnapTime', error);
      // SAFE: Always return frame-snapped time on error
      return {
        snappedTime: snapTimeToFrame(time, projectFps),
        didSnap: false,
      };
    }
  }, [snapPoints, enabled, zoomLevel, projectFps, onSnapPointChange]);
  
  const clearSnapPoints = useCallback(() => {
    try {
      setActiveSnapPoint(null);
      onSnapPointChange?.(null);
    } catch (error) {
      console.warn('Snapping: Error clearing snap points', error);
    }
  }, [onSnapPointChange]);

  const getSnapPositions = useCallback((): number[] => {
    if (!enabled) return [];
    
    try {
      return snapPoints.map(p => p.position);
    } catch (error) {
      console.warn('Snapping: Error getting snap positions', error);
      return [];
    }
  }, [snapPoints, enabled]);
  
  return {
    // Always return these for compatibility
    getSnapTime,
    snapPoints,
    activeSnapPoint,
    clearSnapPoints,
    getSnapPositions,
    isSnapping: enabled && activeSnapPoint !== null,
    
    // Legacy compatibility
    isEnabled: enabled,
  };
}