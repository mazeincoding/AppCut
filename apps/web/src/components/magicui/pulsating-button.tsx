import React from "react";
import { cn } from "@/lib/utils";

interface PulsatingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pulseColor?: string;
  duration?: string;
}

export const PulsatingButton = React.forwardRef<HTMLButtonElement, PulsatingButtonProps>(
  ({ 
    className, 
    children, 
    pulseColor = "rgba(59, 130, 246, 0.5)", 
    duration = "1.5s", 
    style,
    ...props 
  }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "relative flex cursor-pointer items-center justify-center rounded-lg bg-primary px-4 py-2 text-center text-primary-foreground",
          className
        )}
        style={{
          ...style,
          "--pulse-color": pulseColor,
          "--duration": duration,
          animation: `pulse ${duration} ease-out infinite`
        } as React.CSSProperties}
        {...props}
      >
        {children}
      </button>
    );
  }
);

PulsatingButton.displayName = "PulsatingButton";