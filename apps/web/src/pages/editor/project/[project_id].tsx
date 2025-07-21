import { useEffect, useCallback, useRef, Suspense } from "react";
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
import { ExportDialog } from "@/components/export-dialog";
import { useExportStore } from "@/stores/export-store";
import { debugLogger } from "@/lib/debug-logger";

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
  const { isDialogOpen } = useExportStore();
  const router = useRouter();
  
  // Stabilize function references to prevent useEffect loops
  const stableLoadProject = useCallback(loadProject, []);
  const stableCreateNewProject = useCallback(createNewProject, []);
  const { project_id } = router.query;

  // Support both dynamic route (params) and static route with query param (?project_id=xxx)
  const projectIdParam = Array.isArray(project_id) ? project_id[0] : project_id;
  const projectIdQuery = typeof router.query.project_id === 'string' ? router.query.project_id : null;
  const projectId = (projectIdParam ?? projectIdQuery ?? "") as string;
  
  // Debug: Track projectId changes
  useEffect(() => {
    console.log('📍 PROJECT ID CHANGED:', {
      projectIdParam,
      projectIdQuery,
      finalProjectId: projectId,
      routerReady: router.isReady,
      routerQuery: router.query,
      timestamp: Date.now()
    });
  }, [projectId, router.isReady]);

  usePlaybackControls();

  // Debug: Component mount/unmount tracking
  useEffect(() => {
    renderCount++;
    console.log('🔄 EDITOR MOUNT/UPDATE:', {
      renderCount,
      projectId,
      activeProjectId: activeProject?.id,
      timestamp: Date.now(),
      location: window.location.href
    });
    
    return () => {
      console.log('🗑️ EDITOR UNMOUNTING:', {
        renderCount,
        projectId,
        timestamp: Date.now(),
        reason: 'Component cleanup'
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

  // Track if fallback check has been done to prevent repeated checks
  const fallbackCheckDone = useRef(false);

  useEffect(() => {
    debugLogger.log('EditorPage', 'PROJECT_INIT_EFFECT', {
      projectId,
      hasActiveProject: !!activeProject,
      activeProjectId: activeProject?.id,
      needsLoad: projectId && (!activeProject || activeProject.id !== projectId),
      renderCount
    });
    
    // Only run if we actually need to load a different project
    if (!projectId) {
      debugLogger.log('EditorPage', 'NO_PROJECT_ID');
      return;
    }
    
    if (activeProject && activeProject.id === projectId) {
      debugLogger.log('EditorPage', 'PROJECT_ALREADY_LOADED', {
        activeProjectId: activeProject.id,
        requestedProjectId: projectId
      });
      return;
    }
    
    const initializeProject = async () => {
      debugLogger.log('EditorPage', 'STARTING_PROJECT_LOAD', { projectId });
      
      // Check if this is a fallback project ID only once
      if (!fallbackCheckDone.current) {
        const isFallbackProjectId = projectId.startsWith('project-') && 
          (/^project-\d{13}$/.test(projectId) || projectId === 'project-1753087892498');
        
        debugLogger.log('EditorPage', 'FALLBACK_DETECTION', {
          projectId,
          startsWithProject: projectId.startsWith('project-'),
          regexTest: /^project-\d{13}$/.test(projectId),
          isFallbackProjectId,
          projectIdLength: projectId.length,
          fallbackCheckAlreadyDone: fallbackCheckDone.current
        });
        
        fallbackCheckDone.current = true;
        
        if (isFallbackProjectId) {
          debugLogger.log('EditorPage', 'FALLBACK_PROJECT_DETECTED', { 
            projectId,
            redirectAction: 'projects'
          });
          
          // Clean up any fallback project data from localStorage
          localStorage.removeItem('opencut-fallback-project');
          
          debugLogger.log('EditorPage', 'NAVIGATING_TO_PROJECTS', { 
            reason: 'fallback_project',
            projectId 
          });
          
          setTimeout(() => router.replace('/projects'), 100);
          return;
        }
      }
      
      try {
        await stableLoadProject(projectId);
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
              const newProjectId = await stableCreateNewProject(project.name);
              localStorage.removeItem('opencut-fallback-project');
              console.log('🔄 NAVIGATING TO FALLBACK PROJECT:', newProjectId);
              // Use setTimeout to prevent mid-render navigation that could cause AI component re-mount
              setTimeout(() => router.replace(`/editor/project/${newProjectId}`), 100);
              return;
            }
          } catch (parseError) {
            console.error('❌ ERROR PARSING FALLBACK PROJECT:', parseError);
          }
        }
        
        // If no fallback, create a new project and navigate to it
        console.log('🔄 CREATING NEW FALLBACK PROJECT');
        const newProjectId = await stableCreateNewProject("New Project");
        console.log('🔄 NAVIGATING TO NEW PROJECT:', {
          oldProjectId: projectId,
          newProjectId,
          currentLocation: window.location.href
        });
        // Use setTimeout to prevent mid-render navigation that could cause AI component re-mount
        setTimeout(() => router.replace(`/editor/project/${newProjectId}`), 100);
      }
    };

    initializeProject();
  }, [projectId]); // Only run when projectId changes, not on every activeProject update

  if (!activeProject) {
    console.log('⏳ RENDERING LOADING SCREEN:', {
      projectId,
      hasActiveProject: !!activeProject,
      timestamp: Date.now(),
      renderCount
    });
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  console.log('✅ RENDERING EDITOR INTERFACE:', {
    projectId,
    activeProjectId: activeProject?.id,
    projectName: activeProject?.name,
    timestamp: Date.now(),
    renderCount
  });

  return (
    <div className="flex flex-col h-screen">
      <EditorHeader />
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 p-4">
          <ResizablePanelGroup direction="horizontal" className="w-full h-full gap-6">
            <ResizablePanel 
              defaultSize={toolsPanel} 
              minSize={15} 
              maxSize={35}
              onResize={(size) => setToolsPanel(size)}
            >
              <div className="h-full border-4 border-border rounded-xl overflow-hidden">
                <MediaPanel />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel 
              defaultSize={mainContent} 
              minSize={30}
              onResize={(size) => setMainContent(size)}
            >
              <div className="h-full border-4 border-border rounded-xl overflow-hidden">
                <PreviewPanel />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel 
              defaultSize={propertiesPanel} 
              minSize={15} 
              maxSize={35}
              onResize={(size) => setPropertiesPanel(size)}
            >
              <div className="h-full border-4 border-border rounded-xl overflow-hidden">
                {isDialogOpen ? <ExportDialog /> : <PropertiesPanel />}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        <div className="p-4 pt-2">
          <div className="border-4 border-border rounded-xl overflow-hidden">
            <Timeline />
          </div>
        </div>
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