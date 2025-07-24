"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Onboarding } from "@/components/onboarding";
import { usePanelLayoutStore } from "@/stores/panel-layout-store";

export default function Editor() {
  const { setPanelSize, layouts, resetCounter } = usePanelStore();
  const { activeLayout } = usePanelLayoutStore();
  const sizes = layouts[activeLayout];

  const { activeProject, loadProject, createNewProject } = useProjectStore();
  const params = useParams();
  const router = useRouter();
  const projectId = params.project_id as string;
  const handledProjectIds = useRef<Set<string>>(new Set());

  usePlaybackControls();

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    usePanelStore.getState().resetLayout(activeLayout);
  }, [activeLayout]);

  useEffect(() => {
    const initProject = async () => {
      if (!projectId) return;

      if (activeProject?.id === projectId) {
        return;
      }

      if (handledProjectIds.current.has(projectId)) {
        return;
      }

      try {
        await loadProject(projectId);
      } catch (error) {
        handledProjectIds.current.add(projectId);

        const newProjectId = await createNewProject("Untitled Project");
        router.replace(`/editor/${newProjectId}`);
        return;
      }
    };

    initProject();
  }, [projectId, activeProject?.id, loadProject, createNewProject, router]);

  const renderLayout = () => {
    switch (activeLayout) {
      case "media":
        return (
          <ResizablePanelGroup key={resetCounter} direction="horizontal" className="h-full w-full gap-[0.19rem] px-2">
            <ResizablePanel defaultSize={sizes.toolsPanel} minSize={20} maxSize={50} onResize={(size) => setPanelSize("toolsPanel", size, "media")} className="min-w-0">
              <MediaPanel />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel minSize={50}>
              <ResizablePanelGroup direction="vertical" className="h-full w-full gap-[0.18rem]">
                <ResizablePanel defaultSize={sizes.mainContent} minSize={30} onResize={(size) => setPanelSize("mainContent", size, "media")} className="min-h-0">
                  <ResizablePanelGroup direction="horizontal" className="h-full w-full gap-[0.19rem]">
                    <ResizablePanel defaultSize={sizes.previewPanel} minSize={30} onResize={(size) => setPanelSize("previewPanel", size, "media")} className="min-w-0 min-h-0 flex-1">
                      <PreviewPanel />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={sizes.propertiesPanel} minSize={15} maxSize={40} onResize={(size) => setPanelSize("propertiesPanel", size, "media")} className="min-w-0">
                      <PropertiesPanel />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={sizes.timeline} minSize={15} maxSize={70} onResize={(size) => setPanelSize("timeline", size, "media")} className="min-h-0">
                  <Timeline />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        );
      case "properties":
        return (
          <ResizablePanelGroup key={resetCounter} direction="horizontal" className="h-full w-full gap-[0.19rem] px-2">
            <ResizablePanel minSize={50}>
              <ResizablePanelGroup direction="vertical" className="h-full w-full gap-[0.18rem]">
                <ResizablePanel defaultSize={sizes.mainContent} minSize={30} onResize={(size) => setPanelSize("mainContent", size, "properties")} className="min-h-0">
                  <ResizablePanelGroup direction="horizontal" className="h-full w-full gap-[0.19rem]">
                    <ResizablePanel defaultSize={sizes.toolsPanel} minSize={15} maxSize={40} onResize={(size) => setPanelSize("toolsPanel", size, "properties")} className="min-w-0">
                      <MediaPanel />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={sizes.previewPanel} minSize={30} onResize={(size) => setPanelSize("previewPanel", size, "properties")} className="min-w-0 min-h-0 flex-1">
                      <PreviewPanel />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={sizes.timeline} minSize={15} maxSize={70} onResize={(size) => setPanelSize("timeline", size, "properties")} className="min-h-0">
                  <Timeline />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={sizes.propertiesPanel} minSize={20} maxSize={50} onResize={(size) => setPanelSize("propertiesPanel", size, "properties")} className="min-w-0">
              <PropertiesPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        );
      case "vertical-preview":
        return (
          <ResizablePanelGroup key={resetCounter} direction="horizontal" className="h-full w-full gap-[0.19rem] px-2">
            <ResizablePanel minSize={50}>
              <ResizablePanelGroup direction="vertical" className="h-full w-full gap-[0.18rem]">
                <ResizablePanel defaultSize={sizes.mainContent} minSize={30} onResize={(size) => setPanelSize("mainContent", size, "vertical-preview")} className="min-h-0">
                  <ResizablePanelGroup direction="horizontal" className="h-full w-full gap-[0.19rem]">
                    <ResizablePanel defaultSize={sizes.toolsPanel} minSize={25} onResize={(size) => setPanelSize("toolsPanel", size, "vertical-preview")} className="min-w-0">
                      <MediaPanel />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={sizes.propertiesPanel} minSize={25} onResize={(size) => setPanelSize("propertiesPanel", size, "vertical-preview")} className="min-w-0">
                      <PropertiesPanel />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={sizes.timeline} minSize={15} maxSize={70} onResize={(size) => setPanelSize("timeline", size, "vertical-preview")} className="min-h-0">
                  <Timeline />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={sizes.previewPanel} minSize={20} onResize={(size) => setPanelSize("previewPanel", size, "vertical-preview")} className="min-w-0 min-h-0 flex-1">
              <PreviewPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        );
      default:
        return (
          <ResizablePanelGroup
            key={resetCounter}
            direction="vertical"
            className="h-full w-full gap-[0.18rem]"
          >
            <ResizablePanel
              defaultSize={sizes.mainContent}
              minSize={30}
              maxSize={85}
              onResize={(size) => setPanelSize("mainContent", size, "default")}
              className="min-h-0"
            >
              {/* Main content area */}
              <ResizablePanelGroup
                direction="horizontal"
                className="h-full w-full gap-[0.19rem] px-2"
              >
                {/* Tools Panel */}
                <ResizablePanel
                  defaultSize={sizes.toolsPanel}
                  minSize={15}
                  maxSize={40}
                  onResize={(size) => setPanelSize("toolsPanel", size, "default")}
                  className="min-w-0"
                >
                  <MediaPanel />
                </ResizablePanel>
                <ResizableHandle withHandle />

                {/* Preview Area */}
                <ResizablePanel
                  defaultSize={sizes.previewPanel}
                  minSize={30}
                  onResize={(size) => setPanelSize("previewPanel", size, "default")}
                  className="min-w-0 min-h-0 flex-1"
                >
                  <PreviewPanel />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel
                  defaultSize={sizes.propertiesPanel}
                  minSize={15}
                  maxSize={40}
                  onResize={(size) => setPanelSize("propertiesPanel", size, "default")}
                  className="min-w-0"
                >
                  <PropertiesPanel />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Timeline */}
            <ResizablePanel
              defaultSize={sizes.timeline}
              minSize={15}
              maxSize={70}
              onResize={(size) => setPanelSize("timeline", size, "default")}
              className="min-h-0 px-2 pb-2"
            >
              <Timeline />
            </ResizablePanel>
          </ResizablePanelGroup>
        );
    }
  };

  return (
    <EditorProvider>
      <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
        <EditorHeader />
        <div className="flex-1 min-h-0 min-w-0" key={activeLayout}>
          {renderLayout()}
        </div>
        <Onboarding />
      </div>
    </EditorProvider>
  );
}
