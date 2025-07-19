import { useMediaVolume } from "@/hooks/use-media-volume";
import { TimelineElement, TimelineTrack } from "@/types/timeline";

interface MediaVolumeProps {
  track: TimelineTrack,
  element: TimelineElement,
  timelineElementRef: React.RefObject<HTMLDivElement>
}

export function MediaVolume({
  track,
  element,
  timelineElementRef
}: MediaVolumeProps) {
  const { position, handleVolumeMouseDown } = useMediaVolume({
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
