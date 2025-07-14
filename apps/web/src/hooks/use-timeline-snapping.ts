import { useCallback } from "react";
import { TimelineElement, TimelineTrack } from "@/types/timeline";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";

export interface SnapPoint {
  time: number;
  type: "grid" | "element-start" | "element-end" | "playhead";
  elementId?: string;
  trackId?: string;
}

export interface SnapResult {
  snappedTime: number;
  snapPoint: SnapPoint | null;
  snapDistance: number;
}

export interface UseTimelineSnappingOptions {
  snapThreshold?: number; // Distance in pixels to trigger snapping
  gridInterval?: number; // Grid interval in seconds
  enableGridSnapping?: boolean;
  enableElementSnapping?: boolean;
  enablePlayheadSnapping?: boolean;
}

export function useTimelineSnapping({
  snapThreshold = 10,
  gridInterval = 1,
  enableGridSnapping = true,
  enableElementSnapping = true,
  enablePlayheadSnapping = true,
}: UseTimelineSnappingOptions = {}) {
  const findSnapPoints = useCallback(
    (
      tracks: TimelineTrack[],
      currentTime: number,
      playheadTime: number,
      zoomLevel: number,
      excludeElementId?: string
    ): SnapPoint[] => {
      const snapPoints: SnapPoint[] = [];

      // Add grid snap points
      if (enableGridSnapping) {
        const gridStart = Math.floor(currentTime / gridInterval) * gridInterval;
        const gridEnd = Math.ceil(currentTime / gridInterval) * gridInterval;

        // Add nearby grid points
        for (let i = -2; i <= 2; i++) {
          const gridTime = gridStart + i * gridInterval;
          if (gridTime >= 0) {
            snapPoints.push({
              time: gridTime,
              type: "grid",
            });
          }
        }
      }

      // Add element snap points
      if (enableElementSnapping) {
        tracks.forEach((track) => {
          track.elements.forEach((element) => {
            // Skip the element being dragged
            if (element.id === excludeElementId) return;

            const elementStart = element.startTime;
            const elementEnd =
              element.startTime +
              (element.duration - element.trimStart - element.trimEnd);

            snapPoints.push(
              {
                time: elementStart,
                type: "element-start",
                elementId: element.id,
                trackId: track.id,
              },
              {
                time: elementEnd,
                type: "element-end",
                elementId: element.id,
                trackId: track.id,
              }
            );
          });
        });
      }

      // Add playhead snap point
      if (enablePlayheadSnapping) {
        snapPoints.push({
          time: playheadTime,
          type: "playhead",
        });
      }

      return snapPoints;
    },
    [
      enableGridSnapping,
      enableElementSnapping,
      enablePlayheadSnapping,
      gridInterval,
    ]
  );

  const snapToNearestPoint = useCallback(
    (
      targetTime: number,
      snapPoints: SnapPoint[],
      zoomLevel: number
    ): SnapResult => {
      const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
      const thresholdInSeconds = snapThreshold / pixelsPerSecond;

      let closestSnapPoint: SnapPoint | null = null;
      let closestDistance = Infinity;

      snapPoints.forEach((snapPoint) => {
        const distance = Math.abs(targetTime - snapPoint.time);
        if (distance < thresholdInSeconds && distance < closestDistance) {
          closestDistance = distance;
          closestSnapPoint = snapPoint;
        }
      });

      return {
        snappedTime: closestSnapPoint ? closestSnapPoint.time : targetTime,
        snapPoint: closestSnapPoint,
        snapDistance: closestDistance,
      };
    },
    [snapThreshold]
  );

  const snapElementPosition = useCallback(
    (
      targetTime: number,
      tracks: TimelineTrack[],
      playheadTime: number,
      zoomLevel: number,
      excludeElementId?: string
    ): SnapResult => {
      const snapPoints = findSnapPoints(
        tracks,
        targetTime,
        playheadTime,
        zoomLevel,
        excludeElementId
      );

      return snapToNearestPoint(targetTime, snapPoints, zoomLevel);
    },
    [findSnapPoints, snapToNearestPoint]
  );

  const snapElementEdge = useCallback(
    (
      targetTime: number,
      elementDuration: number,
      tracks: TimelineTrack[],
      playheadTime: number,
      zoomLevel: number,
      excludeElementId?: string,
      snapToStart = true // true for start edge, false for end edge
    ): SnapResult => {
      const snapPoints = findSnapPoints(
        tracks,
        targetTime,
        playheadTime,
        zoomLevel,
        excludeElementId
      );

      // For end edge snapping, we need to account for element duration
      const effectiveTargetTime = snapToStart
        ? targetTime
        : targetTime + elementDuration;
      const snapResult = snapToNearestPoint(
        effectiveTargetTime,
        snapPoints,
        zoomLevel
      );

      // Adjust the snapped time back for end edge
      if (!snapToStart && snapResult.snapPoint) {
        snapResult.snappedTime = snapResult.snappedTime - elementDuration;
      }

      return snapResult;
    },
    [findSnapPoints, snapToNearestPoint]
  );

  return {
    snapElementPosition,
    snapElementEdge,
    findSnapPoints,
    snapToNearestPoint,
  };
}
