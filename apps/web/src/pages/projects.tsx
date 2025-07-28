import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  Plus,
  Calendar,
  MoreHorizontal,
  Video,
  Loader2,
  X,
  Trash2,
  Pencil,
  CheckSquare,
  Clock,
  SortAsc,
} from "lucide-react";
import { TProject } from "@/types/project";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useProjectStore } from "@/stores/project-store";
import { useRouter } from "next/router";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { RenameProjectDialog } from "@/components/rename-project-dialog";
import { ProjectCreationErrorBoundary } from "@/components/project-creation-error-boundary";

function CreateButton({ onClick, disabled = false }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button 
      className="gap-2 relative shadow-lg hover:shadow-xl before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent no-underline"
      style={{
        backgroundColor: 'white', 
        color: 'black',
        height: '32px',
        borderRadius: '6px',
        fontSize: '12px',
        position: 'relative',
        overflow: 'hidden',
        border: 'none',
        outline: 'none',
        boxShadow: 'none',
        paddingLeft: '12px',
        paddingRight: '12px'
      }}
      onClick={onClick} 
      disabled={disabled}
    >
      <Plus className="!size-3" />
      {disabled ? "Creating..." : "New project"}
    </Button>
  );
}

function NoProjects({ onCreateProject, disabled = false }: { onCreateProject: () => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Video className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">No projects yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Get started by creating your first video editing project.
      </p>
      <CreateButton onClick={onCreateProject} disabled={disabled} />
    </div>
  );
}

export default function ProjectsPage() {
  const {
    createNewProject,
    savedProjects,
    isLoading,
    isInitialized,
    deleteProject,
  } = useProjectStore();
  const router = useRouter();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    new Set()
  );
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [sortByNewest, setSortByNewest] = useState(true);
  const [sortByName, setSortByName] = useState(false);

  const handleCreateProject = async () => {
    if (isCreatingProject) {
      console.log('🚫 [PROJECT] Creation already in progress, ignoring duplicate click');
      return;
    }
    
    setIsCreatingProject(true);
    console.log('🚀 [PROJECT] Starting project creation...');
    
    try {
      const projectId = await createNewProject("New Project");
      console.log('✅ [PROJECT] Project created, navigating to:', projectId);
      
      // Add small delay to ensure state has stabilized before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      router.push(`/editor/project/${encodeURIComponent(projectId)}`);
    } catch (error) {
      console.error('❌ [PROJECT] Creation failed:', error);
      throw error; // Re-throw to trigger error boundary
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleSelectProject = (projectId: string, checked: boolean) => {
    const newSelected = new Set(selectedProjects);
    if (checked) {
      newSelected.add(projectId);
    } else {
      newSelected.delete(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(new Set(savedProjects.map((p) => p.id)));
    } else {
      setSelectedProjects(new Set());
    }
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedProjects(new Set());
  };

  const handleBulkDelete = async () => {
    await Promise.all(
      Array.from(selectedProjects).map((projectId) => deleteProject(projectId))
    );
    setSelectedProjects(new Set());
    setIsSelectionMode(false);
    setIsBulkDeleteDialogOpen(false);
  };

  const allSelected =
    savedProjects.length > 0 && selectedProjects.size === savedProjects.length;
  const someSelected =
    selectedProjects.size > 0 && selectedProjects.size < savedProjects.length;

  return (
    <ProjectCreationErrorBoundary onRetry={handleCreateProject}>
      <div className="min-h-screen bg-background">
        <div className="pt-6 px-6 flex items-center justify-between w-full h-16">
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-muted-foreground transition-colors no-underline"
          style={{
            backgroundColor: 'transparent', 
            color: 'white',
            textDecoration: 'none'
          }}
          prefetch={false}
        >
          <ChevronLeft className="!size-5 shrink-0" style={{ width: '14px', height: '14px' }} />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <div className="block md:hidden">
          {isSelectionMode ? (
            <div className="flex flex-col gap-1 bg-white rounded-lg border border-gray-200 shadow-sm p-1">
              <button
                onClick={handleCancelSelection}
                style={{
                  backgroundColor: '#f8f9fa', 
                  color: 'black',
                  height: '40px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  border: '1px solid #e9ecef',
                  cursor: 'pointer',
                  opacity: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  width: '150px'
                }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#e9ecef'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
              >
                <X style={{ width: '14px', height: '14px', marginRight: '12px' }} />
                Cancel
              </button>
              {selectedProjects.size > 0 && (
                <button
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                  style={{
                    backgroundColor: '#f8f9fa', 
                    color: 'black',
                    height: '40px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    border: '1px solid #e9ecef',
                    cursor: 'pointer',
                    opacity: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    width: '150px'
                  }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#e9ecef'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
                >
                  <Trash2 style={{ width: '14px', height: '14px', marginRight: '12px' }} />
                  Delete ({selectedProjects.size})
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1 bg-white rounded-lg border border-gray-200 shadow-sm p-1">
              <button style={{ 
                backgroundColor: '#f8f9fa', 
                color: 'black',
                height: '40px',
                borderRadius: '6px',
                fontSize: '14px',
                paddingLeft: '16px',
                paddingRight: '16px',
                border: '1px solid #e9ecef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: '150px',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#e9ecef'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
              onClick={() => handleCreateProject()}
              >
                <Plus style={{ width: '14px', height: '14px', marginRight: '12px' }} />
                New project
              </button>
              <button
                onClick={() => {
                  setIsSelectionMode(true);
                  if (savedProjects.length > 0) {
                    handleSelectAll(true);
                  }
                }}
                style={{
                  backgroundColor: '#f8f9fa', 
                  color: 'black',
                  height: '40px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  border: '1px solid #e9ecef',
                  cursor: 'pointer',
                  opacity: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  width: '150px'
                }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#e9ecef'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
              >
                <CheckSquare style={{ width: '14px', height: '14px', marginRight: '12px' }} />
                Select All
              </button>
              <button
                style={{
                  backgroundColor: '#f8f9fa', 
                  color: 'black',
                  height: '40px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  border: '1px solid #e9ecef',
                  cursor: 'pointer',
                  opacity: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  width: '150px'
                }}
                onClick={() => {
                  if (savedProjects.length > 0) {
                    setSelectedProjects(new Set(savedProjects.map(p => p.id)));
                    setIsBulkDeleteDialogOpen(true);
                  }
                }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#e9ecef'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
              >
                <Trash2 style={{ width: '14px', height: '14px', marginRight: '12px' }} />
                Delete All
              </button>
              <button
                style={{
                  backgroundColor: '#f8f9fa', 
                  color: 'black',
                  height: '40px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  border: '1px solid #e9ecef',
                  cursor: 'pointer',
                  opacity: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  width: '150px'
                }}
                onClick={() => {
                  setSortByNewest(!sortByNewest);
                  setSortByName(false);
                }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#e9ecef'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
              >
                <Clock style={{ width: '14px', height: '14px', marginRight: '12px' }} />
                Sort by Time
              </button>
              <button
                style={{
                  backgroundColor: '#f8f9fa', 
                  color: 'black',
                  height: '40px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  border: '1px solid #e9ecef',
                  cursor: 'pointer',
                  opacity: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  width: '150px'
                }}
                onClick={() => {
                  setSortByName(true);
                  setSortByNewest(false);
                }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#e9ecef'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
              >
                <SortAsc style={{ width: '14px', height: '14px', marginRight: '12px' }} />
                Sort by Name
              </button>
            </div>
          )}
        </div>
      </div>
      <main className="max-w-6xl mx-auto px-6 pt-6 pb-6">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Your Projects
            </h1>
            <p className="text-muted-foreground">
              {savedProjects.length}{" "}
              {savedProjects.length === 1 ? "project" : "projects"}
              {isSelectionMode && selectedProjects.size > 0 && (
                <span className="ml-2 text-primary">
                  • {selectedProjects.size} selected
                </span>
              )}
            </p>
          </div>
          <div className="hidden md:block">
            {isSelectionMode ? (
              <div className="flex flex-col gap-1 bg-white rounded-lg border border-gray-200 shadow-sm p-1">
                <button
                  onClick={handleCancelSelection}
                  style={{
                    backgroundColor: '#f8f9fa', 
                    color: 'black',
                    height: '40px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    border: '1px solid #e9ecef',
                    cursor: 'pointer',
                    opacity: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    width: '180px'
                  }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#e9ecef'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
                >
                  <X className="mr-2" style={{ width: '14px', height: '14px' }} />
                  Cancel
                </button>
                {selectedProjects.size > 0 && (
                  <button
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                    style={{
                      backgroundColor: '#f8f9fa', 
                      color: 'black',
                      height: '40px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                      border: '1px solid #e9ecef',
                      cursor: 'pointer',
                      opacity: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      width: '180px'
                    }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#e9ecef'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
                  >
                    <Trash2 style={{ width: '14px', height: '14px', marginRight: '12px' }} />
                    Delete Selected ({selectedProjects.size})
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setIsSelectionMode(true)}
                  disabled={savedProjects.length === 0}
                >
                  Select Projects
                </Button>
                <div className="flex flex-col gap-1 bg-white rounded-lg border border-gray-200 shadow-sm p-1">
                  <button style={{ 
                    backgroundColor: '#f8f9fa', 
                    color: 'black',
                    height: '40px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    border: '1px solid #e9ecef',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    width: '150px',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#e9ecef'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
                  onClick={() => handleCreateProject()}
                  >
                    <Plus style={{ width: '14px', height: '14px', marginRight: '12px' }} />
                    New project
                  </button>
                  <button
                    onClick={() => {
                      setIsSelectionMode(true);
                      if (savedProjects.length > 0) {
                        handleSelectAll(true);
                      }
                    }}
                    style={{
                      backgroundColor: '#f8f9fa', 
                      color: 'black',
                      height: '40px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                      border: '1px solid #e9ecef',
                      cursor: 'pointer',
                      opacity: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      width: '150px'
                    }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#e9ecef'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
                  >
                    <CheckSquare style={{ width: '14px', height: '14px', marginRight: '12px' }} />
                    Select All
                  </button>
                  <button
                    style={{
                      backgroundColor: '#f8f9fa', 
                      color: 'black',
                      height: '40px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                      border: '1px solid #e9ecef',
                      cursor: 'pointer',
                      opacity: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      width: '150px'
                    }}
                    onClick={() => {
                      if (savedProjects.length > 0) {
                        setSelectedProjects(new Set(savedProjects.map(p => p.id)));
                        setIsBulkDeleteDialogOpen(true);
                      }
                    }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#e9ecef'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
                  >
                    <Trash2 style={{ width: '14px', height: '14px', marginRight: '12px' }} />
                      Delete All
                  </button>
                  <button
                    style={{
                      backgroundColor: '#f8f9fa', 
                      color: 'black',
                      height: '40px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                      border: '1px solid #e9ecef',
                      cursor: 'pointer',
                      opacity: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      width: '150px'
                    }}
                    onClick={() => {
                  setSortByNewest(!sortByNewest);
                  setSortByName(false);
                }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#e9ecef'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
                  >
                    <Clock style={{ width: '14px', height: '14px', marginRight: '12px' }} />
                    Sort by Time
                  </button>
                  <button
                    style={{
                      backgroundColor: '#f8f9fa', 
                      color: 'black',
                      height: '40px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                      border: '1px solid #e9ecef',
                      cursor: 'pointer',
                      opacity: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      width: '150px'
                    }}
                    onClick={() => {
                      setSortByName(true);
                      setSortByNewest(false);
                    }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#e9ecef'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
                  >
                    <SortAsc style={{ width: '14px', height: '14px', marginRight: '12px' }} />
                    Sort by Name
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {isSelectionMode && savedProjects.length > 0 && (
          <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    const checkboxElement = el.querySelector(
                      "input"
                    ) as HTMLInputElement;
                    if (checkboxElement) {
                      checkboxElement.indeterminate = someSelected;
                    }
                  }
                }}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">
                {allSelected ? "Deselect All" : "Select All"}&nbsp;&nbsp;
              </span>
              <span className="text-sm text-muted-foreground">
                ({selectedProjects.size} of {savedProjects.length} selected)
              </span>
            </div>
          </div>
        )}

        {isLoading || !isInitialized ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          </div>
        ) : savedProjects.length === 0 ? (
          <NoProjects onCreateProject={handleCreateProject} disabled={isCreatingProject} />
        ) : (
          <div className="grid grid-cols-4 justify-center mx-auto max-w-5xl" style={{ gap: '20px' }}>
            {[...savedProjects]
              .sort((a, b) => {
                if (sortByName) {
                  return a.name.localeCompare(b.name);
                } else if (sortByNewest) {
                  return b.updatedAt.getTime() - a.updatedAt.getTime();
                } else {
                  return a.updatedAt.getTime() - b.updatedAt.getTime();
                }
              })
              .map((project) => {
                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isSelected={selectedProjects.has(project.id)}
                    onSelect={handleSelectProject}
                  />
                );
              })}
          </div>
        )}
      </main>

      <DeleteProjectDialog
          isOpen={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          onConfirm={handleBulkDelete}
        />
      </div>
    </ProjectCreationErrorBoundary>
  );
}

interface ProjectCardProps {
  project: TProject;
  isSelected: boolean;
  onSelect: (projectId: string, checked: boolean) => void;
}

function ProjectCard({ project, isSelected, onSelect }: ProjectCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const { deleteProject, renameProject } = useProjectStore();

  const handleSaveRename = async () => {
    if (editName.trim() && editName.trim() !== project.name) {
      await renameProject(project.id, editName.trim());
    }
    setIsEditing(false);
    setEditName(project.name); // Reset to original if empty or unchanged
  };

  const handleCancelRename = () => {
    setIsEditing(false);
    setEditName(project.name); // Reset to original
  };

  return (
    <>
      <div 
        className={`group bg-background transition-all duration-200 hover:scale-[1.02] relative cursor-pointer ${
          isSelected 
            ? 'shadow-lg' 
            : 'hover:shadow-lg'
        }`}
        style={{
          border: '2px solid transparent',
          borderRadius: '24px',
          overflow: 'hidden',
          backgroundImage: isSelected 
            ? 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899)'
            : 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(45deg, #e5e7eb, #d1d5db)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: isSelected 
            ? '0 0 25px rgba(59, 130, 246, 0.4), 0 0 50px rgba(139, 92, 246, 0.2)' 
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
        onClick={() => {
          console.log("🔗 [CLICK DEBUG] Click: Open Project:", project.id);
          window.location.href = `/editor/project/${encodeURIComponent(project.id)}`;
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundImage = 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.15)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundImage = 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(45deg, #e5e7eb, #d1d5db)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
          }
        }}
      >
        {/* Delete button overlay - positioned at top-left of entire card */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log("🗑️ [DELETE] Delete clicked for:", project.id);
            if (confirm(`Delete project "${project.name}"?`)) {
              deleteProject(project.id);
            }
          }}
          className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 z-40"
          style={{ 
            opacity: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            color: 'white',
            border: 'none',
            outline: 'none',
            boxShadow: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(220, 38, 38, 1)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Delete project"
        >
          <Trash2 className="h-3 w-3" />
        </button>

        {/* Select checkbox - positioned at top-right of entire card */}
        <div 
          className="absolute cursor-pointer z-40"
          style={{
            top: '6px',
            right: '12px',
            width: '20px',
            height: '20px',
            backgroundColor: isSelected ? '#3b82f6' : 'white',
            border: '2px solid #3b82f6',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(project.id, !isSelected);
          }}
        >
          {isSelected && (
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white" 
              strokeWidth="3"
            >
              <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
          )}
        </div>

        {/* Thumbnail Preview Area - Compact */}
        <div className="relative h-24 bg-gray-100 w-full">
          <div className="flex items-center justify-center h-full">
            {project.thumbnail ? (
              <img
                src={project.thumbnail}
                alt="Project thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center text-gray-400">
                <Video className="h-6 w-6 mr-2" />
                <span className="text-xs">&nbsp;&nbsp;No preview</span>
              </div>
            )}
          </div>
          
        </div>

        {/* Project Info Section - Compact */}
        <div className="p-3">
          <div className="mb-2">
            <div className="mb-1">
              {isEditing ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleSaveRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveRename();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      handleCancelRename();
                    }
                  }}
                  className="font-semibold text-gray-900 text-sm bg-transparent border-b border-blue-500 outline-none w-full"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                />
              ) : (
                <h3 
                  className="font-semibold text-gray-900 text-sm line-clamp-1 cursor-pointer hover:text-blue-600 transition-colors pl-[5px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                    setEditName(project.name);
                  }}
                  title="Click to rename"
                >
                  {project.name}
                </h3>
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-gray-500 pl-[5px]">
                Created: {project.createdAt.toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500 pl-[5px]">
                Last edited: {Math.floor((Date.now() - project.updatedAt.getTime()) / (1000 * 60 * 60 * 24))} days ago
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}