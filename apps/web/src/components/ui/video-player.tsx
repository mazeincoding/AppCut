"use client";

import { useRef, useEffect } from "react";
import { Button } from "./button";
import { Play, Pause, Volume2 } from "lucide-react";
import { usePlaybackStore } from "@/stores/playback-store";

interface VideoPlayerProps {
    src: string;
    poster?: string;
    className?: string;
    clipStartTime: number;
    trimStart: number;
    trimEnd: number;
    clipDuration: number;
}

export function VideoPlayer({
    src,
    poster,
    className = "",
    clipStartTime,
    trimStart,
    trimEnd,
    clipDuration
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { isPlaying, currentTime, volume, speed, play, pause, setVolume } = usePlaybackStore();

    // Calculate if we're within this clip's timeline range
    const clipEndTime = clipStartTime + (clipDuration - trimStart - trimEnd);
    const isInClipRange = currentTime >= clipStartTime && currentTime < clipEndTime;

    // Calculate the video's internal time based on timeline position
    const videoTime = Math.max(trimStart, Math.min(
        clipDuration - trimEnd,
        currentTime - clipStartTime + trimStart
    ));

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleSeekEvent = (e: CustomEvent) => {
            if (!isInClipRange) return;
            const timelineTime = e.detail.time;
            const newVideoTime = Math.max(trimStart, Math.min(
                clipDuration - trimEnd,
                timelineTime - clipStartTime + trimStart
            ));
            video.currentTime = newVideoTime;
        };

        const handleUpdateEvent = (e: CustomEvent) => {
            if (!isInClipRange) return;
            const timelineTime = e.detail.time;
            const targetVideoTime = Math.max(trimStart, Math.min(
                clipDuration - trimEnd,
                timelineTime - clipStartTime + trimStart
            ));

            // Only sync if there's a significant difference to avoid micro-adjustments
            if (Math.abs(video.currentTime - targetVideoTime) > 0.5) {
                video.currentTime = targetVideoTime;
            }
        };

        const handleSpeedEvent = (e: CustomEvent) => {
            if (!isInClipRange) return;
            // Set playbackRate directly without any additional checks
            video.playbackRate = e.detail.speed;
        };

        window.addEventListener("playback-seek", handleSeekEvent as EventListener);
        window.addEventListener("playback-update", handleUpdateEvent as EventListener);
        window.addEventListener("playback-speed", handleSpeedEvent as EventListener);

        return () => {
            window.removeEventListener("playback-seek", handleSeekEvent as EventListener);
            window.removeEventListener("playback-update", handleUpdateEvent as EventListener);
            window.removeEventListener("playback-speed", handleSpeedEvent as EventListener);
        };
    }, [clipStartTime, trimStart, trimEnd, clipDuration, isInClipRange]);

    // Sync video playback state - only play if in clip range
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying && isInClipRange) {
            video.play().catch(console.error);
        } else {
            video.pause();
        }
    }, [isPlaying, isInClipRange]);

    // Sync volume
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.volume = volume;
    }, [volume]);

    // Sync speed immediately when it changes
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.playbackRate = speed;
    }, [speed]);

    return (
        <div className={`relative group ${className}`}>
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className="w-full h-full object-cover"
                playsInline
                preload="auto"
            />

            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-black/50 text-white hover:bg-black/70"
                    onClick={isPlaying ? pause : play}
                >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>

                <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-white transition-all duration-100"
                        style={{ width: `${(currentTime / usePlaybackStore.getState().duration) * 100}%` }}
                    />
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-black/50 text-white hover:bg-black/70"
                    onClick={() => setVolume(volume > 0 ? 0 : 1)}
                >
                    <Volume2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
} 