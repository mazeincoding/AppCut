"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

interface EditorProviderProps {
  children: React.ReactNode;
}

export function EditorProvider({ children }: EditorProviderProps) {
  const { isInitializing, isPanelsReady, initializeApp } = useEditorStore();

  useKeyboardShortcuts({
    enabled: !isInitializing && isPanelsReady,
    context: "editor",
  });

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Show loading screen while initializing
  if (isInitializing || !isPanelsReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  // App is ready, render children
  return <>{children}</>;
}
