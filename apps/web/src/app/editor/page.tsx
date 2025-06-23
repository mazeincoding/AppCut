"use client";

import { useEffect } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "../../components/ui/resizable";
import { MediaPanel } from "../../components/editor/media-panel";
// import { PropertiesPanel } from "../../components/editor/properties-panel";
import { Timeline } from "../../components/editor/timeline";
import { PreviewPanel } from "../../components/editor/preview-panel";
import { EditorHeader } from "@/components/editor-header";
import { usePanelStore } from "@/stores/panel-store";
import { useProjectStore } from "@/stores/project-store";
import { EditorProvider } from "@/components/editor-provider";
import { usePlaybackControls } from "@/hooks/use-playback-controls";

export default function Editor() {
  const {
    toolsPanel,
    previewPanel,
    propertiesPanel,
    mainContent,
    timeline,
    setToolsPanel,
    setPreviewPanel,
    setPropertiesPanel,
    setMainContent,
    setTimeline,
  } = usePanelStore();

  const { activeProject, createNewProject } = useProjectStore();

  usePlaybackControls();

  useEffect(() => {
    if (!activeProject) {
      createNewProject("Untitled Project");
    }
  }, [activeProject, createNewProject]);

  return (
    <EditorProvider>
      <div className="h-screen w-screen flex flex-col bg-background">
        <EditorHeader />
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel
            defaultSize={mainContent}
            minSize={30}
            onResize={setMainContent}
          >
            {/* Main content area */}
            <ResizablePanelGroup direction="horizontal">
              {/* Tools Panel */}
              <ResizablePanel
                defaultSize={toolsPanel}
                minSize={15}
                onResize={setToolsPanel}
              >
                <MediaPanel />
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Preview Area */}
              <ResizablePanel
                defaultSize={previewPanel}
                onResize={setPreviewPanel}
              >
                <PreviewPanel />
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Properties Panel */}
              {/* <ResizablePanel
                defaultSize={propertiesPanel}
                minSize={15}
                onResize={setPropertiesPanel}
              >
                <PropertiesPanel />
              </ResizablePanel> */}
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Timeline */}
          <ResizablePanel
            defaultSize={timeline}
            minSize={15}
            onResize={setTimeline}
          >
            <Timeline />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </EditorProvider>
  );
}
