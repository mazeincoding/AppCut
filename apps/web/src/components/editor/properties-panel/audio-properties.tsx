import { MediaElement } from "@/types/timeline";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { PropertyItem } from "./property-item";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Music } from "lucide-react";
import { useState, useEffect } from "react";
import AudioWaveform from "../audio-waveform";

export function AudioProperties({ element, trackId }: { element: MediaElement; trackId: string }) {
  const { mediaItems } = useMediaStore();
  const { updateAudioElement } = useTimelineStore();
  const [localVolume, setLocalVolume] = useState(element.volume || 100);
  const [localFadeIn, setLocalFadeIn] = useState(element.fadeIn || 0);
  const [localFadeOut, setLocalFadeOut] = useState(element.fadeOut || 0);
  const [isMuted, setIsMuted] = useState(element.muted || false);

  useEffect(() => {
    setLocalVolume(element.volume || 100);
    setLocalFadeIn(element.fadeIn || 0);
    setLocalFadeOut(element.fadeOut || 0);
    setIsMuted(element.muted || false);
  }, [element]);

  const mediaItem = mediaItems.find((item) => item.id === element.mediaId);
  
  if (!mediaItem || mediaItem.type !== "audio") {
    return (
      <div className="space-y-4 p-5">
        <div className="text-sm text-muted-foreground">No audio selected</div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setLocalVolume(newVolume);
    updateAudioElement(trackId, element.id, { volume: newVolume });
  };

  const handleFadeInChange = (value: number[]) => {
    const newFadeIn = value[0];
    setLocalFadeIn(newFadeIn);
    updateAudioElement(trackId, element.id, { fadeIn: newFadeIn });
  };

  const handleFadeOutChange = (value: number[]) => {
    const newFadeOut = value[0];
    setLocalFadeOut(newFadeOut);
    updateAudioElement(trackId, element.id, { fadeOut: newFadeOut });
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    updateAudioElement(trackId, element.id, { muted: newMuted });
  };

  return (
    <div className="space-y-3 p-4">
      {/* Audio Info */}
      <div className="pb-2 border-b">
        <div className="flex items-center gap-2 mb-1">
          <Music className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium truncate">{mediaItem.name}</span>
        </div>
        {mediaItem.duration && (
          <div className="text-xs text-muted-foreground">
            {formatTime(mediaItem.duration)}
          </div>
        )}
      </div>

      {/* Waveform Preview */}
      <div className="space-y-2">
        <div className="bg-muted/20 rounded border">
          <AudioWaveform
            audioUrl={mediaItem.url || ""}
            height={48}
            className="w-full p-1 border"
            fadeIn={localFadeIn}
            fadeOut={localFadeOut}
            duration={Math.max(0, element.duration - element.trimStart - element.trimEnd)}
          />
        </div>
      </div>

      {/* Volume Control */}
      <div className="space-y-2 border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Volume</span>
          <span className="text-xs text-muted-foreground">
            {isMuted ? "Muted" : `${localVolume}%`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={toggleMute}
            className="p-1 h-7 w-7 flex-shrink-0"
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? (
              <VolumeX className="h-3 w-3" />
            ) : (
              <Volume2 className="h-3 w-3" />
            )}
          </Button>
          <Slider
            value={[localVolume]}
            onValueChange={handleVolumeChange}
            max={200}
            min={0}
            step={1}
            className="flex-1"
            disabled={isMuted}
          />
        </div>
      </div>

      {/* Fade Controls */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Fade In</span>
            <span className="text-xs text-muted-foreground">{localFadeIn.toFixed(1)}s</span>
          </div>
          <Slider
            value={[localFadeIn]}
            onValueChange={handleFadeInChange}
            max={3}
            min={0}
            step={0.1}
            className="w-full"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Fade Out</span>
            <span className="text-xs text-muted-foreground">{localFadeOut.toFixed(1)}s</span>
          </div>
          <Slider
            value={[localFadeOut]}
            onValueChange={handleFadeOutChange}
            max={3}
            min={0}
            step={0.1}
            className="w-full"
          />
        </div>
      </div>

      {/* Trim Info */}
      <div className="pt-2 border-t">
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Trim Start:</span>
            <span>{formatTime(element.trimStart)}</span>
          </div>
          <div className="flex justify-between">
            <span>Trim End:</span>
            <span>{formatTime(element.trimEnd)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Duration:</span>
            <span>{formatTime(element.duration - element.trimStart - element.trimEnd)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}