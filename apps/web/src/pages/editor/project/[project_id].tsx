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
    debugLogger.log('EditorPage', 'PROJECT_ID_CHANGED', {
      projectIdParam,
      projectIdQuery,
      finalProjectId: projectId,
      routerReady: router.isReady,
      routerQuery: router.query
    });
  }, [projectId, router.isReady]);

  usePlaybackControls();

  // Debug: Component mount/unmount tracking
  useEffect(() => {
    renderCount++;
    debugLogger.log('EditorPage', 'COMPONENT_MOUNT_UPDATE', {
      renderCount,
      projectId,
      activeProjectId: activeProject?.id,
      location: window.location.href
    });
    
    return () => {
      debugLogger.log('EditorPage', 'COMPONENT_UNMOUNT', {
        renderCount,
        projectId,
        reason: 'Component cleanup'
      });
    };
  }, []);

  // Router Events Monitoring - HIGH PRIORITY
  useEffect(() => {
    const handleRouteChangeStart = (url) => {
      const stack = new Error().stack;
      debugLogger.log('Router', 'ROUTE_CHANGE_START', {
        newUrl: url,
        currentUrl: router.asPath,
        currentProjectId: activeProject?.id,
        callStack: stack,
        trigger: 'navigation_detected'
      });
    };
    
    const handleRouteChangeComplete = (url) => {
      debugLogger.log('Router', 'ROUTE_CHANGE_COMPLETE', {
        newUrl: url,
        previousUrl: router.asPath,
        currentProjectId: activeProject?.id
      });
    };

    const handleRouteChangeError = (err, url) => {
      debugLogger.log('Router', 'ROUTE_CHANGE_ERROR', {
        error: err.message,
        targetUrl: url,
        currentUrl: router.asPath,
        currentProjectId: activeProject?.id
      });
    };
    
    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeError);
    
    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeError);
    };
  }, [router, activeProject?.id]);

  // Debug: Window error listener
  useEffect(() => {
    const handleError = (event) => {
      debugLogger.log('Window', 'ERROR', {
        error: event.error?.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno
      });
      if (window.electronDebug) {
        window.electronDebug.logError(event.error);
      }
    };
    
    const handleUnhandledRejection = (event) => {
      debugLogger.log('Window', 'UNHANDLED_PROMISE_REJECTION', {
        reason: event.reason
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
        debugLogger.log('EditorPage', 'PROJECT_LOAD_SUCCESS', { projectId });
      } catch (error) {
        debugLogger.log('EditorPage', 'PROJECT_LOAD_FAILED', { projectId, error: error.message });
        
        // Check if it's a fallback project from localStorage
        const fallbackProject = localStorage.getItem('opencut-fallback-project');
        if (fallbackProject) {
          try {
            const project = JSON.parse(fallbackProject);
            if (project.id === projectId) {
              debugLogger.log('EditorPage', 'USING_FALLBACK_PROJECT', { projectName: project.name });
              const newProjectId = await stableCreateNewProject(project.name);
              localStorage.removeItem('opencut-fallback-project');
              debugLogger.log('EditorPage', 'NAVIGATING_TO_FALLBACK_PROJECT', { newProjectId });
              // Use setTimeout to prevent mid-render navigation that could cause AI component re-mount
              setTimeout(() => router.replace(`/editor/project/${newProjectId}`), 100);
              return;
            }
          } catch (parseError) {
            debugLogger.log('EditorPage', 'FALLBACK_PROJECT_PARSE_ERROR', { error: parseError.message });
          }
        }
        
        // If no fallback, create a new project and navigate to it
        debugLogger.log('EditorPage', 'CREATING_NEW_FALLBACK_PROJECT', {});
        const newProjectId = await stableCreateNewProject("New Project");
        debugLogger.log('EditorPage', 'NAVIGATING_TO_NEW_PROJECT', {
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
    debugLogger.log('EditorPage', 'RENDERING_LOADING_SCREEN', {
      projectId,
      hasActiveProject: !!activeProject,
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

  debugLogger.log('EditorPage', 'RENDERING_EDITOR_INTERFACE', {
    projectId,
    activeProjectId: activeProject?.id,
    projectName: activeProject?.name,
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