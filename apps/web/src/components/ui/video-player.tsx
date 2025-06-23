"use client";

import { useRef, useEffect } from "react";
import { Button } from "./button";
import { Play, Pause, Volume2 } from "lucide-react";
import { usePlaybackStore } from "@/stores/playback-store";

interface VideoPlayerProps {
    src: string;
    poster?: string;
    className?: string;
    startTime?: number;
}

export function VideoPlayer({ src, poster, className = "", startTime = 0 }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { isPlaying, currentTime, volume, speed, play, pause, setVolume, setDuration, setCurrentTime } = usePlaybackStore();

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
        };

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
            if (startTime > 0) {
                video.currentTime = startTime;
            }
        };

        const handleSeekEvent = (e: CustomEvent) => {
            video.currentTime = e.detail.time;
        };

        const handleSpeedEvent = (e: CustomEvent) => {
            video.playbackRate = e.detail.speed;
        };

        video.addEventListener("timeupdate", handleTimeUpdate);
        video.addEventListener("loadedmetadata", handleLoadedMetadata);
        window.addEventListener("playback-seek", handleSeekEvent as EventListener);
        window.addEventListener("playback-speed", handleSpeedEvent as EventListener);

        return () => {
            video.removeEventListener("timeupdate", handleTimeUpdate);
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
            window.removeEventListener("playback-seek", handleSeekEvent as EventListener);
            window.removeEventListener("playback-speed", handleSpeedEvent as EventListener);
        };
    }, [setCurrentTime, setDuration]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.play().catch(console.error);
        } else {
            video.pause();
        }
    }, [isPlaying]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.volume = volume;
    }, [volume]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.playbackRate = speed;
    }, [speed]);

    const handleSeek = (e: React.MouseEvent<HTMLVideoElement>) => {
        const video = videoRef.current;
        if (!video) return;

        const rect = video.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const newTime = percentage * video.duration;

        video.currentTime = newTime;
        setCurrentTime(newTime);
    };

    return (
        <div className={`relative group ${className}`}>
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className="w-full h-full object-cover cursor-pointer"
                onClick={handleSeek}
                playsInline
                preload="metadata"
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