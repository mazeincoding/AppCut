"use client";

import { BotIcon } from "lucide-react";

export function AiView() {
  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <BotIcon className="size-5 text-primary" />
        <h3 className="text-sm font-medium">AI Video Generation</h3>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="bg-panel-accent rounded-lg p-6 max-w-xs">
          <BotIcon className="size-12 text-primary mx-auto mb-3" />
          <h4 className="text-sm font-medium mb-2">Generate AI Videos</h4>
          <p className="text-xs text-muted-foreground">
            Create videos from text prompts using AI models
          </p>
        </div>
      </div>
    </div>
  );
}