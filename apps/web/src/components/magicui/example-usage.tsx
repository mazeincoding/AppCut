"use client";

import React from "react";
import { MagicCard } from "./magic-card";

export function EmailInputExample() {
  return (
    <MagicCard 
      className="inline-block p-0"
      gradientSize={150}
      gradientFrom="#9333ea"
      gradientTo="#3b82f6"
    >
      <input 
        type="email" 
        className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-8 text-sm" 
        placeholder="Enter your email" 
        style={{width: "200px", fontSize: "12px", height: "32px"}} 
        required 
        value=""
      />
    </MagicCard>
  );
}