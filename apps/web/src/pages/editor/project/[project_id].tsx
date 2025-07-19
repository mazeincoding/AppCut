import { useEffect, Suspense } from "react";
import { useRouter } from "next/router";
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

function EditorContent() {
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
  const router = useRouter();
  const { project_id } = router.query;

  // Support both dynamic route (params) and static route with query param (?project_id=xxx)
  const projectIdParam = Array.isArray(project_id) ? project_id[0] : project_id;
  const projectIdQuery = typeof router.query.project_id === 'string' ? router.query.project_id : null;
  const projectId = (projectIdParam ?? projectIdQuery ?? "") as string;

  usePlaybackControls();

  useEffect(() => {
    const initializeProject = async () => {
      if (projectId && (!activeProject || activeProject.id !== projectId)) {
        try {
          await loadProject(projectId);
        } catch (error) {
          console.error("Failed to load project:", error);
          
          // Check if it's a fallback project from localStorage
          const fallbackProject = localStorage.getItem('opencut-fallback-project');
          if (fallbackProject) {
            try {
              const project = JSON.parse(fallbackProject);
              if (project.id === projectId) {
                console.log('🚀 [EDITOR] Using fallback project from localStorage');
                await createNewProject(project.name);
                localStorage.removeItem('opencut-fallback-project');
                return;
              }
            } catch (parseError) {
              console.error('Error parsing fallback project:', parseError);
            }
          }
          
          // If no fallback, create a new project
          console.log('🚀 [EDITOR] Creating new project as fallback');
          await createNewProject("New Project");
        }
      }
    };

    initializeProject();
  }, [projectId, activeProject, loadProject, createNewProject]);

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <EditorHeader />
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="w-full h-full">
          <ResizablePanel 
            defaultSize={toolsPanel} 
            minSize={15} 
            maxSize={35}
            onResize={(size) => setToolsPanel(size)}
          >
            <MediaPanel />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel 
            defaultSize={mainContent} 
            minSize={30}
            onResize={(size) => setMainContent(size)}
          >
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel 
                defaultSize={previewPanel} 
                minSize={25}
                onResize={(size) => setPreviewPanel(size)}
              >
                <PreviewPanel />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel 
                defaultSize={timeline} 
                minSize={15} 
                maxSize={50}
                onResize={(size) => setTimeline(size)}
              >
                <Timeline />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel 
            defaultSize={propertiesPanel} 
            minSize={15} 
            maxSize={35}
            onResize={(size) => setPropertiesPanel(size)}
          >
            <PropertiesPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <EditorProvider>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading editor...</p>
          </div>
        </div>
      }>
        <EditorContent />
      </Suspense>
    </EditorProvider>
  );
}

// =================== ROOT CAUSE FIX: DYNAMIC ROUTE DATA FETCHING ===================
// ULTRASYNC DEEPSYNC FACE-IT: The dynamic route [project_id] was causing Next.js to generate
// data URLs during static export because getStaticPaths was missing

import type { GetStaticPaths, GetStaticProps } from 'next';

// CRITICAL: For Electron builds, we need to provide getStaticPaths to prevent data URL generation
export const getStaticPaths: GetStaticPaths = async () => {
  const isElectron = process.env.NEXT_PUBLIC_ELECTRON === "true";
  
  if (isElectron) {
    console.log('🔧 [ROOT CAUSE FIX] Electron build - getStaticPaths with fallback blocking mode');
    // For static export, return empty paths and fallback: 'blocking' 
    // This prevents Next.js from trying to fetch data URLs for dynamic routes
    return {
      paths: [],
      fallback: 'blocking'
    };
  }
  
  // For web builds, allow normal dynamic behavior
  return {
    paths: [],
    fallback: true
  };
};

// CRITICAL: Also need getStaticProps to complete the static generation contract
export const getStaticProps: GetStaticProps = async ({ params }) => {
  const isElectron = process.env.NEXT_PUBLIC_ELECTRON === "true";
  
  if (isElectron) {
    console.log('🔧 [ROOT CAUSE FIX] Electron build - getStaticProps for dynamic route');
    // For Electron builds, return minimal props without data fetching
    return {
      props: {
        projectId: params?.project_id || 'default'
      },
      // Don't use revalidate in static export mode
    };
  }
  
  // For web builds, return normal props
  return {
    props: {
      projectId: params?.project_id || 'default'
    },
    revalidate: 60
  };
};