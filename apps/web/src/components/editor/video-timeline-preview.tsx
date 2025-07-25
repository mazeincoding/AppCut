"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { TimelineElement, MediaElement } from "@/types/timeline";
import { MediaItem } from "@/stores/media-store";

interface VideoTimelinePreviewProps {
  element: TimelineElement;
  mediaItem: MediaItem;
  zoomLevel: number;
  elementWidth: number;
  elementHeight: number;
  isSelected?: boolean;
  isHovered?: boolean;
  mousePosition?: { x: number; y: number };
}

export function VideoTimelinePreview({
  element,
  mediaItem,
  zoomLevel,
  elementWidth,
  elementHeight,
  isSelected = false,
  isHovered = false,
  mousePosition
}: VideoTimelinePreviewProps) {
  console.log('🚀 VideoTimelinePreview function called with:', {
    elementName: element.name,
    mediaItemType: mediaItem.type,
    elementWidth,
    elementHeight
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  
  const { 
    generateTimelinePreviews, 
    getTimelinePreviewStrip, 
    getTimelinePreviewAtPosition,
    shouldRegenerateTimelinePreviews 
  } = useMediaStore();
  const { currentTime } = usePlaybackStore();

  // Calculate preview quality based on zoom level
  const getPreviewQuality = useCallback((zoom: number): 'low' | 'medium' | 'high' => {
    if (zoom > 2) return 'high';
    if (zoom > 1) return 'medium'; 
    return 'low';
  }, []);

  // Calculate preview density based on zoom level
  const getPreviewDensity = useCallback((zoom: number): number => {
    return Math.max(0.5, Math.min(4, zoom * 2));
  }, []);

  // Generate timeline previews when needed
  useEffect(() => {
    if (mediaItem.type !== 'video' || !mediaItem.file) return;

    const mediaElement = element as MediaElement;
    const elementDuration = element.duration;
    
    console.log('🔍 VideoTimelinePreview useEffect checking:', {
      mediaId: mediaElement.mediaId,
      needsRegeneration: shouldRegenerateTimelinePreviews(
        mediaElement.mediaId, 
        zoomLevel, 
        elementDuration
      ),
      isGenerating,
      hasFile: !!mediaItem.file
    });
    
    // Check if we need to generate/regenerate previews
    const needsRegeneration = shouldRegenerateTimelinePreviews(
      mediaElement.mediaId, 
      zoomLevel, 
      elementDuration
    );

    if (needsRegeneration && !isGenerating) {
      setIsGenerating(true);
      setPreviewError(null);
      
      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.warn('⏱️ Timeline preview generation timeout for:', element.name);
        setPreviewError('Preview generation timed out');
        setIsGenerating(false);
      }, 30000); // 30 second timeout
      
      console.log('🎬 Generating timeline previews for element:', element.id, {
        zoomLevel,
        elementDuration,
        quality: getPreviewQuality(zoomLevel),
        density: getPreviewDensity(zoomLevel)
      });

      const previewOptions = {
        quality: getPreviewQuality(zoomLevel),
        density: getPreviewDensity(zoomLevel),
        elementDuration,
        zoomLevel
      };
      
      console.log('🎬 Starting timeline preview generation:', {
        mediaId: mediaElement.mediaId,
        options: previewOptions,
        elementId: element.id,
        elementName: element.name
      });
      
      generateTimelinePreviews(mediaElement.mediaId, previewOptions)
        .then(() => {
          console.log('✅ Timeline previews generated successfully for:', element.name);
          clearTimeout(timeoutId);
          setIsGenerating(false);
        })
        .catch((error) => {
          console.error('❌ Failed to generate timeline previews for:', element.name, error);
          clearTimeout(timeoutId);
          setPreviewError(error.message || 'Preview generation failed');
          setIsGenerating(false);
        });
    }
  }, [
    mediaItem, 
    element, 
    zoomLevel, 
    generateTimelinePreviews, 
    shouldRegenerateTimelinePreviews, 
    getPreviewQuality,
    getPreviewDensity
  ]);

  // Get thumbnail strip for background
  const thumbnailStrip = getTimelinePreviewStrip(
    (element as MediaElement).mediaId, 
    element.duration, 
    zoomLevel
  );
  
  // Force re-render when thumbnails are generated
  const [, forceUpdate] = useState({});
  useEffect(() => {
    if (!isGenerating && thumbnailStrip.length === 0) {
      // Check again in a moment if thumbnails might be available
      const timer = setTimeout(() => {
        forceUpdate({});
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isGenerating, thumbnailStrip.length]);
  
  console.log('📊 Thumbnail strip retrieved:', {
    elementName: element.name,
    thumbnailCount: thumbnailStrip.length,
    isGenerating,
    previewError,
    mediaId: (element as MediaElement).mediaId,
    thumbnailUrls: thumbnailStrip.slice(0, 3) // Show first 3 URLs for debugging
  });

  // Calculate hover preview if mouse is over element
  const hoverPreview = isHovered && mousePosition && elementRef.current ? (() => {
    const rect = elementRef.current.getBoundingClientRect();
    const relativeX = mousePosition.x - rect.left;
    const relativePosition = Math.max(0, Math.min(1, relativeX / elementWidth));
    
    return getTimelinePreviewAtPosition(
      (element as MediaElement).mediaId,
      relativePosition,
      element.duration
    );
  })() : null;

  // Calculate playhead position on this element
  const playheadPosition = (() => {
    const elementStartTime = element.startTime || 0;
    const elementEndTime = elementStartTime + element.duration;
    
    if (currentTime >= elementStartTime && currentTime <= elementEndTime) {
      const relativeTime = currentTime - elementStartTime;
      const relativePosition = relativeTime / element.duration;
      return relativePosition * elementWidth;
    }
    return null;
  })();

  // Handle loading state - but still show thumbnails if available
  if (isGenerating && thumbnailStrip.length === 0) {
    console.log('🔄 VideoTimelinePreview: Returning loading state');
    return (
      <div 
        ref={elementRef}
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20"
      >
        <div className="flex items-center gap-2 text-xs text-white">
          <div className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
          <span>Generating previews...</span>
        </div>
      </div>
    );
  }

  // Handle error state
  if (previewError) {
    console.log('❌ VideoTimelinePreview: Returning error state:', previewError);
    return (
      <div 
        ref={elementRef}
        className="absolute inset-0 flex items-center justify-center bg-red-500/20"
      >
        <div className="text-xs text-red-200 text-center px-2">
          <div>Preview Error</div>
          <div className="text-[10px] opacity-75 mt-1">{previewError}</div>
        </div>
      </div>
    );
  }

  // Handle no previews available - fallback to gradient
  if (thumbnailStrip.length === 0) {
    console.log('📭 VideoTimelinePreview: Returning no previews fallback', {
      isGenerating,
      previewError,
      mediaId: (element as MediaElement).mediaId,
      elementName: element.name
    });
    
    // Show loading state if still generating
    if (isGenerating) {
      return (
        <div 
          ref={elementRef}
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20"
        >
          <div className="flex items-center gap-2 text-xs text-white">
            <div className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
            <span>Generating previews...</span>
          </div>
        </div>
      );
    }
    
    return (
      <div 
        ref={elementRef}
        className="absolute inset-0 flex items-center px-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
      >
        <span className="text-xs text-white font-medium truncate drop-shadow-sm">
          {element.name}
        </span>
      </div>
    );
  }

  console.log('🖼️ VideoTimelinePreview: About to render main component with thumbnails:', {
    elementWidth,
    elementHeight,
    thumbnailCount: thumbnailStrip.length,
    elementName: element.name
  });

  return (
    <div ref={elementRef} className="absolute inset-0 overflow-hidden">
      {/* Background thumbnail strip */}
      <div className="absolute inset-0 flex">
        {thumbnailStrip.map((thumbnailUrl, index) => {
          const thumbnailWidth = elementWidth / thumbnailStrip.length;
          
          console.log(`🖼️ Rendering thumbnail ${index}:`, {
            thumbnailUrl: thumbnailUrl.substring(0, 50) + '...',
            thumbnailWidth,
            elementHeight
          });
          
          return (
            <div
              key={index}
              className="relative flex-shrink-0"
              style={{
                width: `${thumbnailWidth}px`,
                height: '100%'
              }}
            >
              <img
                src={thumbnailUrl}
                alt={`Frame ${index}`}
                className="absolute inset-0 w-full h-full object-cover border-2 border-yellow-400"
                style={{ objectFit: 'cover' }}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  console.log(`✅ Thumbnail ${index} loaded successfully:`, {
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    width: img.width,
                    height: img.height,
                    complete: img.complete,
                    src: img.src.substring(0, 50) + '...'
                  });
                }}
                onError={(e) => {
                  console.error(`❌ Thumbnail ${index} failed to load:`, thumbnailUrl);
                  // Fallback to gradient on image load error
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  // Show fallback gradient
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'block';
                  }
                }}
              />
              {/* Fallback gradient if image fails */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-pink-500/50"
                style={{ 
                  display: 'none' // Will be shown if image fails
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Hover preview overlay */}
      {hoverPreview && (
        <div 
          className="absolute top-0 w-16 h-full border-2 border-white/80 shadow-lg z-10 pointer-events-none"
          style={{
            left: `${mousePosition ? mousePosition.x - (elementRef.current?.getBoundingClientRect().left || 0) - 32 : 0}px`,
            transform: 'translateX(0)', // Ensure it stays within bounds
          }}
        >
          <img
            src={hoverPreview.thumbnailUrl}
            alt={`Preview at ${hoverPreview.exactTimestamp.toFixed(2)}s`}
            className="w-full h-full object-cover rounded-sm"
          />
          {/* Timestamp overlay */}
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {hoverPreview.exactTimestamp.toFixed(2)}s
          </div>
        </div>
      )}

      {/* Playhead indicator */}
      {playheadPosition !== null && (
        <div 
          className="absolute top-0 w-0.5 h-full bg-red-500 z-20 pointer-events-none"
          style={{ left: `${playheadPosition}px` }}
        >
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
        </div>
      )}
      
      {/* Element name overlay with improved contrast */}
      {/* Temporarily commented out to debug thumbnail visibility
      <div className="absolute inset-0 flex items-center px-2 pointer-events-none" style={{ zIndex: 30 }}>
        <div className="bg-black/10 backdrop-blur-sm rounded px-2 py-1">
          <span className="text-xs text-white font-medium truncate drop-shadow-sm">
            {element.name}
          </span>
        </div>
      </div>
      */}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-blue-400 pointer-events-none" />
      )}
    </div>
  );
}