"use client";

import React, { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface MagicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  gradientSize?: number;
  gradientColor?: string;
  gradientOpacity?: number;
  gradientFrom?: string;
  gradientTo?: string;
  children: React.ReactNode;
}

export function MagicCard({
  children,
  className,
  gradientSize = 200,
  gradientColor = "#262626",
  gradientOpacity = 0.8,
  gradientFrom = "#9333ea",
  gradientTo = "#3b82f6",
  ...props
}: MagicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      cardRef.current.style.setProperty("--mouse-x", `${x}px`);
      cardRef.current.style.setProperty("--mouse-y", `${y}px`);
    },
    []
  );

  return (
    <div
      ref={cardRef}
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:shadow-xl",
        className
      )}
      onMouseMove={handleMouseMove}
      style={{
        "--gradient-size": `${gradientSize}px`,
        "--gradient-color": gradientColor,
        "--gradient-opacity": gradientOpacity,
        "--gradient-from": gradientFrom,
        "--gradient-to": gradientTo,
      } as React.CSSProperties}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(var(--gradient-size) circle at var(--mouse-x) var(--mouse-y), var(--gradient-color), transparent)`,
          opacity: "var(--gradient-opacity)",
        }}
      />
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(calc(var(--gradient-size) * 2) circle at var(--mouse-x) var(--mouse-y), var(--gradient-from), var(--gradient-to), transparent)`,
          opacity: 0.15,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function MagicCardContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {children}
    </div>
  );
}

export function MagicCardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      {children}
    </div>
  );
}

export function MagicCardTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props}>
      {children}
    </h3>
  );
}

export function MagicCardDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props}>
      {children}
    </p>
  );
}