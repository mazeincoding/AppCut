"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { ChevronLeft, Download } from "lucide-react";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { HeaderBase } from "./header-base";

export function EditorHeader() {
  const { activeProject } = useProjectStore();
  const { getTotalDuration } = useTimelineStore();

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Export project");
  };

  // Format duration from seconds to MM:SS format
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const leftContent = (
    <Link
      href="/"
      className="font-medium tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity"
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="text-sm">{activeProject?.name || "Loading..."}</span>
    </Link>
  );

  const centerContent = (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{formatDuration(getTotalDuration())}</span>
    </div>
  );

  const rightContent = (
    <nav className="flex items-center gap-2">
      <Button size="sm" onClick={handleExport}>
        <Download className="h-4 w-4" />
        <span className="text-sm">Export</span>
      </Button>
    </nav>
  );

  return (
    <HeaderBase
      leftContent={leftContent}
      centerContent={centerContent}
      rightContent={rightContent}
      className="bg-background border-b"
    />
  );
}
