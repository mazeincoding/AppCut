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
        backgroundColor: '#3b82f6', 
        color: 'white',
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
      <Plus className="!size-4" />
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
          className="flex items-center gap-1 hover:text-muted-foreground transition-colors relative shadow-lg hover:shadow-xl before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent no-underline"
          style={{
            backgroundColor: '#3b82f6', 
            color: 'white',
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
          prefetch={false}
        >
          <ChevronLeft className="!size-5 shrink-0" style={{ width: '14px', height: '14px' }} />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <div className="block md:hidden">
          {isSelectionMode ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelSelection}
              >
                <X className="!size-4" />
                Cancel
              </Button>
              {selectedProjects.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="!size-4" />
                  Delete ({selectedProjects.size})
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-16">
              <CreateButton onClick={handleCreateProject} disabled={isCreatingProject} />
              <div className="w-px h-6 bg-gray-300"></div>
              <Button
                variant="destructive"
                size="sm"
                className="relative shadow-lg hover:shadow-xl before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent no-underline"
                style={{
                  backgroundColor: '#3b82f6', 
                  color: 'white',
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
                onClick={() => {
                  setSelectedProjects(new Set(savedProjects.map(p => p.id)));
                  setIsBulkDeleteDialogOpen(true);
                }}
                disabled={savedProjects.length === 0}
              >
                <Trash2 className="mr-1" style={{ width: '16px', height: '16px' }} />
                Delete All
              </Button>
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
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleCancelSelection}>
                  <X className="!size-4" />
                  Cancel
                </Button>
                {selectedProjects.size > 0 && (
                  <Button
                    variant="destructive"
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                  >
                    <Trash2 className="!size-4" />
                    Delete Selected ({selectedProjects.size})
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsSelectionMode(true)}
                  disabled={savedProjects.length === 0}
                >
                  Select Projects
                </Button>
                <CreateButton onClick={handleCreateProject} disabled={isCreatingProject} />
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
                {allSelected ? "Deselect All" : "Select All"}
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
          <div className="grid grid-cols-4" style={{ gap: '20px' }}>
            {console.log("🎨 [RENDER] Rendering project cards:", savedProjects.length, savedProjects)}
            {savedProjects.map((project) => {
              console.log("🎨 [RENDER] Rendering project:", project.id, project.name);
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
        className={`group bg-background rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02] relative ${
          isSelected 
            ? 'shadow-lg' 
            : 'hover:shadow-lg'
        }`}
        style={{
          border: '2px solid transparent',
          backgroundImage: isSelected 
            ? 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899)'
            : 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(45deg, #e5e7eb, #d1d5db)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: isSelected 
            ? '0 0 25px rgba(59, 130, 246, 0.4), 0 0 50px rgba(139, 92, 246, 0.2)' 
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
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
        {/* Delete button overlay - positioned at top-right of entire card */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log("🗑️ [DELETE] Delete clicked for:", project.id);
            if (confirm(`Delete project "${project.name}"?`)) {
              deleteProject(project.id);
            }
          }}
          className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 z-30"
          style={{ 
            opacity: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            color: 'white',
            border: 'none',
            outline: 'none',
            boxShadow: 'none'
          }}
          title="Delete project"
        >
          <Trash2 className="h-3 w-3" />
        </button>

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
                  className="font-semibold text-gray-900 text-sm line-clamp-1 cursor-pointer hover:text-blue-600 transition-colors"
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
              <p className="text-xs text-gray-500">
                Created: {project.createdAt.toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500">
                Last edited: {Math.floor((Date.now() - project.updatedAt.getTime()) / (1000 * 60 * 60 * 24))} days ago
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelect(project.id, e.target.checked);
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-xs text-gray-600">Select</span>
            </label>
            
            <button
              onClick={() => {
                console.log("🔗 [CLICK DEBUG] Click: Open Project:", project.id);
                window.location.href = `/editor/project/${encodeURIComponent(project.id)}`;
              }}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors"
            >
              <span>▶</span>
              <span>Open</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}