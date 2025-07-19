import { useMediaVolume } from "@/hooks/use-media-volume";
import { TimelineTrack } from "@/types/timeline";

interface MediaVolumeProps {
  track: TimelineTrack,
  timelineElementRef: React.RefObject<HTMLDivElement>
}

export function MediaVolume({
  track,
  timelineElementRef
}: MediaVolumeProps) {
  const { position, handleVolumeMouseDown } = useMediaVolume({
    track,
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
