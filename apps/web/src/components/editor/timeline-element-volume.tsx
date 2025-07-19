import { useTimelineElementVolume } from "@/hooks/use-timeline-element-volume";
import { TimelineElement, TimelineTrack } from "@/types/timeline";

interface TimelineElementVolume {
  track: TimelineTrack,
  element: TimelineElement,
  timelineElementRef: React.RefObject<HTMLDivElement>
}

export function TimelineElementVolume({
  track,
  element,
  timelineElementRef
}: TimelineElementVolume) {
  const { position, handleVolumeMouseDown } = useTimelineElementVolume({
    track,
    element,
    timelineElementRef
  })

  return (
    <div className="absolute z-10 w-full bg-foreground h-0.5 cursor-ns-resize" style={{
      top: `${position}px`
    }}
    onMouseDown={handleVolumeMouseDown}
    />
  )
}
