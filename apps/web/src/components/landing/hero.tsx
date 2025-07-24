"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

/**
 * Slider constants
 */
const MIN_RANGE = 50; // px – minimum gap between the two handles
const ROTATION_DEG = -2.76; // matches CSS transform
const THETA = ROTATION_DEG * (Math.PI / 180);
const COS_THETA = Math.cos(THETA);
const SIN_THETA = Math.sin(THETA);

/** Utility */
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

interface HeroProps {
  signupCount: number;
}

// Create a hook to detect Electron after hydration
function useIsElectron() {
  const [isElectron, setIsElectron] = useState(false);
  
  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && window.electronAPI !== undefined);
  }, []);
  
  return isElectron;
}

/**
 * The visible heading that houses the range‑slider.
 * Width is measured from an off‑screen copy of the text so that the label
 * always clips precisely, regardless of font‑loading or window size.
 */
function TitleComponent({ signupCount }: { signupCount: number }) {
  const measureRef = useRef(null);
  const [textWidth, setTextWidth] = useState(408); // sensible default until measured
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isElectron = useIsElectron();

  // Re‑measure whenever fonts load or the viewport resizes
  useEffect(() => {
    const measure = () => setTextWidth(measureRef.current?.clientWidth ?? 408);
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (measureRef.current) ro.observe(measureRef.current);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    // Skip API call in Electron builds
    if (isElectron) {
      toast({
        title: "Not available in desktop version",
        description: "Waitlist signup is only available in the web version.",
        variant: "default",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = (await response.json()) as { error: string };

      if (response.ok) {
        toast({
          title: "Welcome to the waitlist! 🎉",
          description: "You'll be notified when we launch.",
        });
        setEmail("");
      } else {
        toast({
          title: "Oops!",
          description:
            (data as { error: string }).error ||
            "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] supports-[height:100dvh]:min-h-[calc(100dvh-4.5rem)] flex flex-col justify-between items-center text-center px-4">
      <Image
        className="absolute top-0 left-0 -z-50 size-full object-cover"
        src="./landing-page-bg.png"
        height={1903.5}
        width={1269}
        alt="landing-page.bg"
      />
      
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col justify-center">
        <div className="mb-8 flex justify-center">
          <a 
            href="https://vercel.com/home?utm_source=opencut" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all duration-200 group shadow-lg no-underline"
          >
            <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
              Sponsored by
            </span>
            <div className="flex items-center gap-1.5">
              <div className="text-zinc-100 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" width="20" height="18" viewBox="0 0 76 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor"></path>
                </svg>
              </div>
              <span className="text-xs font-medium text-zinc-100 group-hover:text-white transition-colors">
                Vercel
              </span>
            </div>
          </a>
        </div>

        <h1 
          className="font-bold tracking-tighter text-black dark:text-white"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 6rem)' }}
        >
          The Open Source
        </h1>
        
        {/* Hidden copy for width‑measurement. Font size must match the visible text in the slider. */}
        <span
          ref={measureRef}
          className="absolute -left-[9999px] px-4 whitespace-nowrap font-bold tracking-tighter text-yellow-500"
          style={{ 
            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
            lineHeight: '1'
          }}
        >
          Video Editor
        </span>
        
        {/* Range‑slider container */}
        <div className="flex justify-center gap-4 mt-4 md:mt-6">
          <OpenSourceSlider width={textWidth} />
        </div>

        {/* Subheading */}
        <p className="mt-8 text-lg md:text-xl max-w-2xl mx-auto text-gray-400">
          An intuitive, powerful, and free video editor for everyone. Create stunning videos with professional tools, right from your browser.
        </p>

        <div className="mt-8 flex gap-8 justify-center">
          <a href="/projects">
            <button
              style={{ 
                backgroundColor: 'white',
                color: 'black',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                height: '96px',
                paddingLeft: '80px',
                paddingRight: '80px',
                fontSize: '16px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'white'}
            >
              Try early beta
              <ArrowRight className="ml-0.5 h-4 w-4" />
            </button>
          </a>
        </div>

        {signupCount > 0 && (
          <div className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>{signupCount.toLocaleString()} people already joined</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A two‑handle slider that is itself rotated.
 * The rotation angle now changes dynamically based on handle positions.
 * Dragging is projected on to this rotated axis so the handles feel natural.
 */
function OpenSourceSlider({ width: initialWidth, height = 70, handleSize = 18, onChange }) {
  // Adjusted width to be more compact
  const width = initialWidth > 0 ? initialWidth + 50 : 0;
  
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(width);
  const [draggingHandle, setDraggingHandle] = useState(null);
  // State to hold the dynamic rotation angle
  const [dynamicRotation, setDynamicRotation] = useState(ROTATION_DEG);

  const leftRef = useRef(left);
  const rightRef = useRef(right);
  const dragRef = useRef(null);

  useEffect(() => {
    leftRef.current = left;
    rightRef.current = right;
    onChange?.({ left, right, range: right - left });
  }, [left, right, onChange]);
  
  // Effect to calculate and set the dynamic rotation
  useEffect(() => {
    if (width > 0) {
      const handleMidpoint = (left + right) / 2;
      const sliderCenter = width / 2;
      // Calculate deviation of the handle midpoint from the slider's absolute center
      const deviationFactor = (handleMidpoint - sliderCenter) / sliderCenter;
      // Define the maximum amount of additional tilt
      const maxAdditionalTilt = 3; 
      // Calculate the new rotation based on the deviation
      const newRotation = ROTATION_DEG + (deviationFactor * maxAdditionalTilt);
      setDynamicRotation(newRotation);
    }
  }, [left, right, width]);

  useEffect(() => setRight(width), [width]);

  const startDrag = (handle, e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: leftRef.current,
      initialRight: rightRef.current,
    };
    setDraggingHandle(handle);
  };

  const moveDrag = useCallback(
    (e) => {
      if (!dragRef.current) return;
      const { handle, startX, startY, initialLeft, initialRight } = dragRef.current;
      const dX = e.clientX - startX;
      const dY = e.clientY - startY;
      // We still project onto the *original* angle for consistent drag feel
      const projected = dX * COS_THETA + dY * SIN_THETA;
      if (handle === "left") {
        const newLeft = clamp(initialLeft + projected, 0, rightRef.current - MIN_RANGE);
        setLeft(newLeft);
      } else {
        const newRight = clamp(initialRight + projected, leftRef.current + MIN_RANGE, width);
        setRight(newRight);
      }
    },
    [width]
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDraggingHandle(null);
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", moveDrag);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [moveDrag, endDrag]);

  const nudgeHandle = (handle) => (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const delta = e.key === "ArrowLeft" ? -10 : 10;
    if (handle === "left") {
      setLeft((prev) => clamp(prev + delta, 0, rightRef.current - MIN_RANGE));
    } else {
      setRight((prev) => clamp(prev + delta, leftRef.current + MIN_RANGE, width));
    }
  };

  return (
    <div
      className="relative select-none transition-transform duration-300 ease-out"
      style={{ width, height, transform: `rotate(${dynamicRotation}deg)` }}
    >
      <div className="absolute inset-0 rounded-2xl border border-yellow-500 pointer-events-none" />
      <div 
        style={{
          position: 'absolute',
          top: '4px',
          left: '24px',
          right: '24px',
          height: '2px',
          backgroundColor: '#eab308',
          zIndex: 30,
          pointerEvents: 'none'
        }}
      />
      <div 
        style={{
          position: 'absolute',
          bottom: '4px',
          left: '24px',
          right: '24px',
          height: '2px',
          backgroundColor: '#eab308',
          zIndex: 30,
          pointerEvents: 'none'
        }}
      />
      {(["left", "right"]).map((handle) => {
        const x = handle === "left" ? left : right - 18;
        const scaleClass = draggingHandle === handle ? "scale-125" : "hover:scale-110";

        return (
          <button
            key={handle}
            type="button"
            aria-label={handle === "left" ? "Adjust start" : "Adjust end"}
            onPointerDown={(e) => startDrag(handle, e)}
            onKeyDown={nudgeHandle(handle)}
            className={`z-20 absolute top-0 h-full w-4 rounded-full bg-[#262626] border border-yellow-500 flex items-center justify-center cursor-ew-resize focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-transform duration-150 ease-in-out opacity-100 ${scaleClass}`}
            style={{ left: x, touchAction: "none" }}
          >
            <span className="w-3 h-5 rounded-full bg-yellow-500" />
          </button>
        );
      })}
      {/* Much larger font size for "Video Editor" text */}
      <div
        className="flex z-10 items-center justify-center w-full h-full px-4 overflow-hidden pointer-events-none font-bold tracking-tighter text-yellow-500"
        style={{ 
          clipPath: `inset(0 ${width - right}px 0 ${left}px round 1rem)`,
          fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
          lineHeight: '1'
        }}
      >
        Video Editor
      </div>
    </div>
  );
}

export function Hero({ signupCount }: HeroProps) {
  return <TitleComponent signupCount={signupCount} />;
}