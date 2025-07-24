"use client";

import React from "react";
import { MagicCard, MagicCardContent, MagicCardHeader, MagicCardTitle, MagicCardDescription } from "./magic-card";
import { cn } from "@/lib/utils";

interface EmailMagicCardProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function EmailMagicCard({ 
  value, 
  onChange, 
  placeholder = "Enter your email",
  required = false,
  className 
}: EmailMagicCardProps) {
  return (
    <MagicCard 
      className={cn("max-w-sm", className)}
      gradientFrom="#9333ea"
      gradientTo="#3b82f6"
      gradientSize={150}
    >
      <MagicCardHeader>
        <MagicCardTitle>Subscribe</MagicCardTitle>
        <MagicCardDescription>
          Stay updated with our latest features
        </MagicCardDescription>
      </MagicCardHeader>
      <MagicCardContent>
        <input
          type="email"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-8 text-sm"
          placeholder={placeholder}
          style={{ width: "200px", fontSize: "12px", height: "32px" }}
          required={required}
          value={value}
          onChange={onChange}
        />
      </MagicCardContent>
    </MagicCard>
  );
}

// Minimal version - just the email input wrapped in MagicCard
export function EmailMagicCardMinimal({ 
  value, 
  onChange, 
  placeholder = "Enter your email",
  required = false,
  className 
}: EmailMagicCardProps) {
  return (
    <MagicCard 
      className={cn("p-1", className)}
      gradientFrom="#9333ea"
      gradientTo="#3b82f6"
      gradientSize={100}
    >
      <input
        type="email"
        className="flex w-full rounded-md border-0 bg-transparent px-3 py-1 shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-8 text-sm"
        placeholder={placeholder}
        style={{ width: "200px", fontSize: "12px", height: "32px" }}
        required={required}
        value={value}
        onChange={onChange}
      />
    </MagicCard>
  );
}