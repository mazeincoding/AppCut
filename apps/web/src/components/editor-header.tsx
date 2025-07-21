"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { ChevronLeft, Download } from "lucide-react";
import { useTimelineStore } from "@/stores/timeline-store";
import { HeaderBase } from "./header-base";
import { formatTimeCode } from "@/lib/time";
import { useProjectStore } from "@/stores/project-store";
import { ExportDialog } from "./export-dialog";
import { useState } from "react";

export function EditorHeader() {
  const { getTotalDuration } = useTimelineStore();
  const { activeProject } = useProjectStore();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const handleExport = () => {
    setExportDialogOpen(true);
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
        size="sm"
        variant="primary"
        className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
        onClick={handleExport}
      >
        <Download className="h-4 w-4 mr-1" />
        <span className="text-sm">Export</span>
      </Button>
    </nav>
  );

  return (
    <>
      <HeaderBase
        leftContent={leftContent}
        centerContent={centerContent}
        rightContent={rightContent}
        className="bg-background h-[3.2rem] px-4"
      />
      <ExportDialog 
        open={exportDialogOpen} 
        onOpenChange={setExportDialogOpen} 
      />
    </>
  );
}
