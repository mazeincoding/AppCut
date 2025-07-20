import { useEffect, Suspense } from "react";
import { useRouter } from "next/router";

// Debug render counter
let renderCount = 0;
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

  // Debug: Component mount/unmount tracking
  useEffect(() => {
    renderCount++;
    console.log('🔄 EDITOR MOUNT/UPDATE:', {
      renderCount,
      projectId,
      activeProjectId: activeProject?.id,
      timestamp: Date.now()
    });
    
    return () => {
      console.log('🔄 EDITOR CLEANUP:', {
        renderCount,
        projectId,
        timestamp: Date.now()
      });
    };
  }, []);

  // Debug: Window error listener
  useEffect(() => {
    const handleError = (event) => {
      console.log('🚨 WINDOW ERROR:', {
        error: event.error?.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        timestamp: Date.now()
      });
      if (window.electronDebug) {
        window.electronDebug.logError(event.error);
      }
    };
    
    const handleUnhandledRejection = (event) => {
      console.log('🚨 UNHANDLED PROMISE REJECTION:', {
        reason: event.reason,
        timestamp: Date.now()
      });
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    console.log('🎯 PROJECT INIT EFFECT:', {
      projectId,
      hasActiveProject: !!activeProject,
      activeProjectId: activeProject?.id,
      needsLoad: projectId && (!activeProject || activeProject.id !== projectId),
      timestamp: Date.now()
    });
    const initializeProject = async () => {
      if (projectId && (!activeProject || activeProject.id !== projectId)) {
        console.log('🚀 STARTING PROJECT LOAD:', projectId);
        try {
          await loadProject(projectId);
          console.log('✅ PROJECT LOAD SUCCESS:', projectId);
        } catch (error) {
          console.error("❌ FAILED TO LOAD PROJECT:", { projectId, error });
          
          // Check if it's a fallback project from localStorage
          const fallbackProject = localStorage.getItem('opencut-fallback-project');
          if (fallbackProject) {
            try {
              const project = JSON.parse(fallbackProject);
              if (project.id === projectId) {
                console.log('🔄 USING FALLBACK PROJECT:', project.name);
                const newProjectId = await createNewProject(project.name);
                localStorage.removeItem('opencut-fallback-project');
                console.log('🔄 NAVIGATING TO FALLBACK PROJECT:', newProjectId);
                router.replace(`/editor/project/${newProjectId}`);
                return;
              }
            } catch (parseError) {
              console.error('❌ ERROR PARSING FALLBACK PROJECT:', parseError);
            }
          }
          
          // If no fallback, create a new project and navigate to it
          console.log('🔄 CREATING NEW FALLBACK PROJECT');
          const newProjectId = await createNewProject("New Project");
          console.log('🔄 NAVIGATING TO NEW PROJECT:', newProjectId);
          router.replace(`/editor/project/${newProjectId}`);
        }
      }
    };

    initializeProject();
  }, [projectId, activeProject, loadProject, createNewProject, router]);

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

// ROOT CAUSE FIX: No static generation for Electron builds
// Dynamic routes are handled client-side only