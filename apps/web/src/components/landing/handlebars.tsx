"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, PanInfo, animate } from "motion/react";

interface HandlebarsProps {
  children: React.ReactNode;
  minWidth?: number;
  maxWidth?: number;
  onRangeChange?: (left: number, right: number) => void;
}

export function Handlebars({
  children,
  minWidth = 50,
  maxWidth = 400,
  onRangeChange,
}: HandlebarsProps) {
  const [leftHandle, setLeftHandle] = useState(0);
  const [rightHandle, setRightHandle] = useState(maxWidth);
  const [contentWidth, setContentWidth] = useState(maxWidth);
  const [isDragging, setIsDragging] = useState(false);

  const leftHandleX = useMotionValue(0);
  const rightHandleX = useMotionValue(maxWidth);

  const visibleWidth = useTransform(
    [leftHandleX, rightHandleX],
    (values: number[]) => values[1] - values[0]
  );

  const contentLeft = useTransform(leftHandleX, (left: number) => -left);

  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const springConfig = {
    type: "spring" as const,
    stiffness: 80,
    damping: 15,
    mass: 1.5,
    restDelta: 0.001,
    restSpeed: 0.001
  };

  useEffect(() => {
    if (!isDragging) {
      animate(leftHandleX, 0, {
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 1
      });

      animate(rightHandleX, contentWidth, {
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 1
      });

      setLeftHandle(0);
      setRightHandle(contentWidth);
    }
  }, [isDragging, contentWidth, leftHandleX, rightHandleX]);

  useEffect(() => {
    if (!measureRef.current) return;

    const measureContent = () => {
      if (measureRef.current) {
        const width = measureRef.current.scrollWidth;
        const paddedWidth = width + 32;
        setContentWidth(paddedWidth);
        setRightHandle(paddedWidth);
        rightHandleX.set(paddedWidth);
      }
    };

    measureContent();
    const timer = setTimeout(measureContent, 50);

    return () => clearTimeout(timer);
  }, [children, rightHandleX]);

  useEffect(() => {
    if (isDragging) {
      leftHandleX.set(leftHandle);
    }
  }, [leftHandle, leftHandleX, isDragging]);

  useEffect(() => {
    if (isDragging) {
      rightHandleX.set(rightHandle);
    }
  }, [rightHandle, rightHandleX, isDragging]);

  useEffect(() => {
    onRangeChange?.(leftHandle, rightHandle);
  }, [leftHandle, rightHandle, onRangeChange]);

  const handleLeftDrag = (event: any, info: PanInfo) => {
    setIsDragging(true);
    const newLeft = Math.max(
      0,
      Math.min(leftHandle + info.offset.x, rightHandle - minWidth)
    );
    setLeftHandle(newLeft);
  };

  const handleRightDrag = (event: any, info: PanInfo) => {
    setIsDragging(true);
    const newRight = Math.max(
      leftHandle + minWidth,
      Math.min(contentWidth, rightHandle + info.offset.x)
    );
    setRightHandle(newRight);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex justify-center gap-4 leading-[4rem] mt-0 md:mt-2">
      <div
        ref={measureRef}
        className="absolute -left-[9999px] top-0 invisible px-4 whitespace-nowrap font-[inherit]"
      >
        {children}
      </div>

      <div
        ref={containerRef}
        className="relative -rotate-[2.76deg] max-w-[250px] md:max-w-[454px] mt-2"
        style={{ width: contentWidth }}
      >
        <div className="absolute inset-0 w-full h-full rounded-2xl border border-yellow-500 flex justify-between">
          <motion.div
            className="h-full border border-yellow-500 w-7 rounded-full bg-accent flex items-center justify-center cursor-ew-resize select-none"
            style={{
              position: "absolute",
              x: leftHandleX,
              left: 0,
              zIndex: 10,
            }}
            drag="x"
            dragConstraints={{ left: 0, right: rightHandle - minWidth }}
            dragElastic={0}
            dragMomentum={false}
            onDrag={handleLeftDrag}
            onDragEnd={handleDragEnd}
            whileHover={{ scale: 1.05 }}
            whileDrag={{ scale: 1.1 }}
            transition={springConfig}
          >
            <div className="w-2 h-8 rounded-full bg-yellow-500"></div>
          </motion.div>

          <motion.div
            className="h-full border border-yellow-500 w-7 rounded-full bg-accent flex items-center justify-center cursor-ew-resize select-none"
            style={{
              position: "absolute",
              x: rightHandleX,
              left: -30,
              zIndex: 10,
            }}
            drag="x"
            dragConstraints={{
              left: leftHandle + minWidth,
              right: contentWidth,
            }}
            dragElastic={0}
            dragMomentum={false}
            onDrag={handleRightDrag}
            onDragEnd={handleDragEnd}
            whileHover={{ scale: 1.05 }}
            whileDrag={{ scale: 1.1 }}
            transition={springConfig}
          >
            <div className="w-2 h-8 rounded-full bg-yellow-500"></div>
          </motion.div>
        </div>

        <motion.div
          className="relative overflow-hidden rounded-2xl"
          style={{
            width: visibleWidth,
            x: leftHandleX,
            height: "100%",
          }}
        >
          <motion.div
            className="w-full h-full flex items-center justify-center px-4"
            style={{
              x: contentLeft,
              width: contentWidth,
              whiteSpace: "nowrap",
            }}
            transition={springConfig}
          >
            {children}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
