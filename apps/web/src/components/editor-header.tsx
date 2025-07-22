"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { ChevronLeft, Download } from "lucide-react";
import { useTimelineStore } from "@/stores/timeline-store";
import { HeaderBase } from "./header-base";
import { formatTimeCode } from "@/lib/time";
import { useProjectStore } from "@/stores/project-store";
import { useExportStore } from "@/stores/export-store";

export function EditorHeader() {
  const { getTotalDuration } = useTimelineStore();
  const { activeProject } = useProjectStore();
  const { setDialogOpen } = useExportStore();

  const handleExport = () => {
    setDialogOpen(true);
  };

  const leftContent = (
    <div className="flex items-center gap-2">
      <Link
        href="/projects"
        className="font-medium tracking-tight flex items-center gap-2 hover:opacity-80 transition-opacity"
        prefetch={false}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="text-sm">{activeProject?.name}</span>
      </Link>
    </div>
  );

  const centerContent = (
    <div className="flex items-center gap-2 text-xs">
      <span>
        {formatTimeCode(
          getTotalDuration(),
          "HH:MM:SS:FF",
          activeProject?.fps || 30
        )}
      </span>
    </div>
  );

  const rightContent = (
    <nav className="flex items-center gap-2">
      <Button
        variant="text"
        size="sm"
        style={{ 
          backgroundColor: '#3b82f6', 
          color: 'white',
          height: '28px',
          borderRadius: '9999px',
          fontSize: '12px',
          position: 'relative',
          overflow: 'hidden',
          border: 'none',
          outline: 'none',
          boxShadow: 'none'
        }}
        className="relative shadow-lg hover:shadow-xl before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent"
        onClick={handleExport}
      >
        <Download className="mr-1 align-text-bottom" style={{ width: '12px', height: '12px' }} />
        Export
      </Button>
    </nav>
  );

  return (
    <HeaderBase
      leftContent={leftContent}
      centerContent={centerContent}
      rightContent={rightContent}
      className="bg-background h-[3.2rem] px-4"
    />
  );
}
