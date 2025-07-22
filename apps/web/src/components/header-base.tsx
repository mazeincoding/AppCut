"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface HeaderBaseProps {
  leftContent?: ReactNode;
  centerContent?: ReactNode;
  rightContent?: ReactNode;
  className?: string;
  children?: ReactNode;
  style?: React.CSSProperties;
}

export function HeaderBase({
  leftContent,
  centerContent,
  rightContent,
  className,
  children,
  style,
}: HeaderBaseProps) {
  // If children is provided, render it directly without the grid layout
  if (children) {
    return (
      <header className={cn("px-6 h-16 flex items-center", className)} style={style}>
        {children}
      </header>
    );
  }

  return (
    <header
      className={cn("px-6 h-14 flex justify-between items-center", className)}
      style={style}
    >
      {leftContent && <div className="flex items-center">{leftContent}</div>}
      {centerContent && (
        <div className="flex items-center">{centerContent}</div>
      )}
      {rightContent && <div className="flex items-center">{rightContent}</div>}
    </header>
  );
}
