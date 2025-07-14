"use client";

import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { ExportSettings } from "@/types/export";

interface ExportCanvasProps {
  settings: ExportSettings;
  className?: string;
}

export interface ExportCanvasRef {
  getCanvas: () => HTMLCanvasElement | null;
  getContext: () => CanvasRenderingContext2D | null;
  clear: () => void;
  capture: () => string | null;
}

export const ExportCanvas = forwardRef<ExportCanvasRef, ExportCanvasProps>(
  ({ settings, className = "" }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);

    // Initialize canvas context
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      contextRef.current = ctx;
      
      // Set canvas dimensions
      canvas.width = settings.width;
      canvas.height = settings.height;
      
      // Set high DPI support
      const dpr = window.devicePixelRatio || 1;
      canvas.width = settings.width * dpr;
      canvas.height = settings.height * dpr;
      ctx.scale(dpr, dpr);
      
      // Set canvas style dimensions
      canvas.style.width = `${settings.width}px`;
      canvas.style.height = `${settings.height}px`;
      
      // Enable image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      
    }, [settings.width, settings.height]);

    // Expose methods through ref
    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
      getContext: () => contextRef.current,
      clear: () => {
        const ctx = contextRef.current;
        const canvas = canvasRef.current;
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      },
      capture: () => {
        const canvas = canvasRef.current;
        if (canvas) {
          return canvas.toDataURL("image/png");
        }
        return null;
      },
    }));

    return (
      <canvas
        ref={canvasRef}
        className={`hidden ${className}`}
        style={{
          width: settings.width,
          height: settings.height,
        }}
      />
    );
  }
);

ExportCanvas.displayName = "ExportCanvas";