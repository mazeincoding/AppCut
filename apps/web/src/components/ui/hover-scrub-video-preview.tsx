"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface HoverScrubVideoPreviewProps {
  src: string;
  duration: number;
  thumbnailUrl?: string;
  className?: string;
  alt: string;
  onHoverChange?: (isHovering: boolean) => void;
}

export function HoverScrubVideoPreview({
  src,
  duration,
  thumbnailUrl,
  className,
  alt,
  onHoverChange,
}: HoverScrubVideoPreviewProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastUpdateTime = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    onHoverChange?.(true);
  }, [onHoverChange]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    onHoverChange?.(false);
    setPlayheadPosition(0);
  }, [onHoverChange]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isVideoReady || !videoRef.current || !containerRef.current || !duration) {
        return;
      }

      const now = Date.now();
      if (now - lastUpdateTime.current < 16) {
        return;
      }
      lastUpdateTime.current = now;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        if (!videoRef.current || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const progress = Math.max(0, Math.min(1, x / rect.width));
        const targetTime = progress * duration;

        videoRef.current.currentTime = targetTime;
        setPlayheadPosition(x);
      });
    },
    [isVideoReady, duration]
  );

  const handleVideoLoadedMetadata = useCallback(() => {
    setIsVideoReady(true);
    setHasError(false);
  }, []);

  const handleVideoError = useCallback(() => {
    setHasError(true);
    setIsVideoReady(false);
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const showVideo = isHovering && isVideoReady && !hasError && duration > 0;
  const showPlayhead = showVideo && playheadPosition > 0;

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt={alt}
          className="w-full h-full object-cover absolute inset-0"
          loading="lazy"
        />
      )}
      
      <video
        ref={videoRef}
        src={src}
        className={cn(
          "w-full h-full object-cover absolute inset-0 transition-opacity duration-200",
          showVideo ? "opacity-100" : "opacity-0"
        )}
        preload="metadata"
        playsInline
        muted
        disablePictureInPicture
        disableRemotePlayback
        controls={false}
        onLoadedMetadata={handleVideoLoadedMetadata}
        onError={handleVideoError}
        onContextMenu={(e) => e.preventDefault()}
      />

      {showPlayhead && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-sm pointer-events-none z-10"
          style={{
            left: `${playheadPosition}px`,
            transform: "translateX(-50%)",
          }}
        />
      )}
    </div>
  );
} 