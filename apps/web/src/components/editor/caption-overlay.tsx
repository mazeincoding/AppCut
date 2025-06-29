// apps/web/src/components/editor/caption-overlay.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useCaptionStore } from "@/stores/caption-store";
import { usePlaybackStore } from "@/stores/playback-store";

export function CaptionOverlay() {
  const captions = useCaptionStore((state) => state.captions);
  const updateCaption = useCaptionStore((state) => state.updateCaption);
  const currentTime = usePlaybackStore((state) => state.currentTime);

  const [isDragging, setIsDragging] = useState(false);
  const [draggedCaptionId, setDraggedCaptionId] = useState<string | null>(null);
  const [draggedPosition, setDraggedPosition] = useState({ x: 0, y: 0 });
  const initialMousePos = useRef({ x: 0, y: 0 });
  const initialCaptionPos = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  const activeCaptions = captions.filter(
    (caption) =>
      currentTime >= caption.startTime && currentTime < caption.endTime
  );

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, captionId: string) => {
    e.stopPropagation();
    setIsDragging(true);
    setDraggedCaptionId(captionId);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    initialMousePos.current = { x: clientX, y: clientY };

    const captionElement = e.currentTarget;
    const currentX = captionElement.offsetLeft;
    const currentY = captionElement.offsetTop;
    
    initialCaptionPos.current = { x: currentX, y: currentY };
    setDraggedPosition({ x: currentX, y: currentY });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !draggedCaptionId || !overlayRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const dx = clientX - initialMousePos.current.x;
    const dy = clientY - initialMousePos.current.y;

    const newX = initialCaptionPos.current.x + dx;
    const newY = initialCaptionPos.current.y + dy;

    // Calculate bounded position
    const overlayRect = overlayRef.current.getBoundingClientRect();
    const draggedElement = document.getElementById(draggedCaptionId);
    
    if (draggedElement) {
      const elementRect = draggedElement.getBoundingClientRect();
      
      let boundedX = Math.max(0, Math.min(newX, overlayRect.width - elementRect.width));
      let boundedY = Math.max(0, Math.min(newY, overlayRect.height - elementRect.height));

      // Update React state instead of directly manipulating DOM
      setDraggedPosition({ x: boundedX, y: boundedY });
    }
  }, [isDragging, draggedCaptionId]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !draggedCaptionId) return;

    setIsDragging(false);
    const draggedElement = document.getElementById(draggedCaptionId);

    if (draggedElement) {
      // Re-enable transition after drag
      draggedElement.style.transition = '';

      const updatedCaption = captions.find(c => c.id === draggedCaptionId);
      if (updatedCaption) {
        // Update the stored position in state
        updateCaption(draggedCaptionId, {
          style: {
            ...updatedCaption.style,
            position: {
              x: draggedPosition.x,
              y: draggedPosition.y,
            },
          },
        });
      }
    }
    setDraggedCaptionId(null);
  }, [isDragging, draggedCaptionId, captions, updateCaption, draggedPosition]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleMouseMove);
      document.addEventListener("touchend", handleMouseUp);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 flex justify-center items-center overflow-hidden"
    >
      {activeCaptions.map((caption) => {
        const isTransparentBackground = caption.style?.backgroundColor === "transparent";
        const strokeColor = caption.style?.borderColor || "white";
        const strokeWidth = parseInt(caption.style?.borderWidth || "0");

        // Generate text-shadow for stroke effect when background is transparent
        let textStrokeShadow = "";
        if (isTransparentBackground && strokeWidth > 0) {
          // Using multiple shadows to simulate a thicker, more uniform stroke
          for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
              if (i !== 0 || j !== 0) { // Exclude center
                textStrokeShadow += `${i * strokeWidth}px ${j * strokeWidth}px 0 ${strokeColor},`;
              }
            }
          }
          // Remove trailing comma if any
          textStrokeShadow = textStrokeShadow.slice(0, -1);
        }

        return (
          <div
            key={caption.id}
            id={caption.id} // Add ID for direct DOM manipulation
            className={`text-white text-2xl text-center ${caption.style?.animation || ""} ${
              isDragging && draggedCaptionId === caption.id ? "border-2 border-blue-500 shadow-lg cursor-grabbing" : "cursor-grab"
            }`}
            style={{
              position: "absolute", // Absolute positioning for drag
              left: isDragging && draggedCaptionId === caption.id 
                ? `${draggedPosition.x}px` 
                : caption.style?.position?.x !== undefined 
                  ? `${caption.style.position.x}px` 
                  : "50%",
              top: isDragging && draggedCaptionId === caption.id 
                ? `${draggedPosition.y}px` 
                : caption.style?.position?.y !== undefined 
                  ? `${caption.style.position.y}px` 
                  : "50%",
              transform: (isDragging && draggedCaptionId === caption.id) || caption.style?.position?.x !== undefined 
                ? "none" 
                : "translate(-50%, -50%)", // Center if no position
              fontFamily: caption.style?.fontFamily,
              fontSize: caption.style?.fontSize,
              color: caption.style?.color || "white",
              backgroundColor: isTransparentBackground ? "transparent" : (caption.style?.backgroundColor || "rgba(0,0,0,0.7)"),
              padding: caption.style?.padding || "8px 12px",
              borderRadius: caption.style?.borderRadius || "4px",
              border: !isTransparentBackground && caption.style?.borderColor && caption.style?.borderWidth
                ? `${caption.style.borderWidth} solid ${caption.style.borderColor}`
                : undefined,
              textShadow: isTransparentBackground && strokeWidth > 0
                ? textStrokeShadow // Apply text stroke shadow
                : caption.style?.textShadow || undefined,
              textAlign: caption.style?.textAlign,
              lineHeight: caption.style?.lineHeight,
              letterSpacing: caption.style?.letterSpacing,
              whiteSpace: 'nowrap', // Prevent text from wrapping
              transition: isDragging && draggedCaptionId === caption.id ? 'none' : undefined, // Disable transition during drag
            }}
            onMouseDown={(e) => handleMouseDown(e, caption.id)}
            onTouchStart={(e) => handleMouseDown(e, caption.id)}
          >
            {caption.text}
          </div>
        );
      })}
    </div>
  );
}