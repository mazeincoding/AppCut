"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "../../../components/ui/resizable";
import { MediaPanel } from "../../../components/editor/media-panel";
import { PropertiesPanel } from "../../../components/editor/properties-panel";
import { Timeline } from "../../../components/editor/timeline";
import { PreviewPanel } from "../../../components/editor/preview-panel";
import { EditorHeader } from "@/components/editor-header";
import { usePanelStore } from "@/stores/panel-store";
import { useProjectStore } from "@/stores/project-store";
import { EditorProvider } from "@/components/editor-provider";
import { usePlaybackControls } from "@/hooks/use-playback-controls";

export default function Editor() {
  const {
    toolsPanel,
    previewPanel,
    mainContent,
    timeline,
    setToolsPanel,
    setPreviewPanel,
    setMainContent,
    setTimeline,
    propertiesPanel,
    setPropertiesPanel,
  } = usePanelStore();

  const { activeProject, loadProject, createNewProject } = useProjectStore();
  const params = useParams();
  const projectId = params.project_id as string;

  usePlaybackControls();

  useEffect(() => {
    const initializeProject = async () => {
      if (projectId && (!activeProject || activeProject.id !== projectId)) {
        try {
          await loadProject(projectId);
        } catch (error) {
          console.error("Failed to load project:", error);
          // If project doesn't exist, create a new one
          await createNewProject("Untitled Project");
        }
      }
    };

    initializeProject();
  }, [projectId, activeProject, loadProject, createNewProject]);

  return (
    <EditorProvider>
      <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
        <EditorHeader />
        <div className="flex-1 min-h-0 min-w-0">
          <ResizablePanelGroup
            direction="vertical"
            className="h-full w-full gap-[0.18rem]"
          >
            <ResizablePanel
              defaultSize={mainContent}
              minSize={30}
              maxSize={85}
              onResize={setMainContent}
              className="min-h-0"
            >
              {/* Main content area */}
              <ResizablePanelGroup
                direction="horizontal"
                className="h-full w-full gap-[0.19rem] px-2"
              >
                {/* Tools Panel */}
                <ResizablePanel
                  defaultSize={toolsPanel}
                  minSize={15}
                  maxSize={40}
                  onResize={setToolsPanel}
                  className="min-w-0"
                >
                  <MediaPanel />
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Preview Area */}
                <ResizablePanel
                  defaultSize={previewPanel}
                  minSize={30}
                  onResize={setPreviewPanel}
                  className="min-w-0 min-h-0 flex-1"
                >
                  <PreviewPanel />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel
                  defaultSize={propertiesPanel}
                  minSize={15}
                  maxSize={40}
                  onResize={setPropertiesPanel}
                  className="min-w-0"
                >
                  <PropertiesPanel />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Timeline */}
            <ResizablePanel
              defaultSize={timeline}
              minSize={15}
              maxSize={70}
              onResize={setTimeline}
              className="min-h-0 px-2 pb-2"
            >
              <Timeline />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </EditorProvider>
  );
}
