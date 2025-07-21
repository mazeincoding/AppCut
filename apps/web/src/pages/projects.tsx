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

  const handleCreateProject = async () => {
    try {
      const projectId = await createNewProject("New Project");
      
      // Add small delay to ensure state has stabilized before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      router.push(`/editor/project/${encodeURIComponent(projectId)}`);
    } catch (error) {
      throw error; // Re-throw to trigger error boundary
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
          className="flex items-center gap-1 hover:text-muted-foreground transition-colors"
          prefetch={false}
        >
          <ChevronLeft className="!size-5 shrink-0" />
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
            <CreateButton onClick={handleCreateProject} />
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
                <CreateButton onClick={handleCreateProject} />
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
          <NoProjects onCreateProject={handleCreateProject} />
        ) : (
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {console.log("🎨 [RENDER] Rendering project cards:", savedProjects.length, savedProjects)}
            {savedProjects.map((project) => {
              console.log("🎨 [RENDER] Rendering project:", project.id, project.name);
              const isSelected = selectedProjects.has(project.id);
              return (
                <div 
                  key={project.id} 
                  className={`group bg-white border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
                    isSelected 
                      ? 'border-blue-500 ring-2 ring-blue-200 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Thumbnail Preview Area - Compact */}
                  <div className="relative h-24 bg-gray-100 flex items-center justify-center">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt="Project thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center text-gray-400">
                        <Video className="h-6 w-6 mr-2" />
                        <span className="text-xs">No preview</span>
                      </div>
                    )}
                    
                    {/* Delete button overlay */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("🗑️ [DELETE] Delete clicked for:", project.id);
                        if (confirm(`Delete project "${project.name}"?`)) {
                          deleteProject(project.id);
                        }
                      }}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors opacity-0 hover:opacity-100 group-hover:opacity-100"
                      title="Delete project"
                    >
                      ×
                    </button>
                  </div>

                  {/* Project Info Section - Compact */}
                  <div className="p-3">
                    <div className="mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
                        {project.name}
                      </h3>
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
                            handleSelectProject(project.id, e.target.checked);
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
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (projectId: string, checked: boolean) => void;
}

function ProjectCard({
  project,
  isSelectionMode = false,
  isSelected = false,
  onSelect,
}: ProjectCardProps) {
  console.log("🎨 [CARD] ProjectCard rendering for:", project.id, project.name);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const { deleteProject, renameProject, duplicateProject } = useProjectStore();

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDeleteProject = async () => {
    await deleteProject(project.id);
    setIsDropdownOpen(false);
  };

  const handleRenameProject = async (newName: string) => {
    await renameProject(project.id, newName);
    setIsRenameDialogOpen(false);
  };

  const handleDuplicateProject = async () => {
    setIsDropdownOpen(false);
    await duplicateProject(project.id);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      onSelect?.(project.id, !isSelected);
    }
  };

  return (
    <>
      {isSelectionMode ? (
        <div onClick={handleCardClick} className="block group cursor-pointer">
          <Card
            className={`overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-all ${
              isSelectionMode && isSelected ? "ring-2 ring-primary" : ""
            }`}
          >
            <div
              className={`relative aspect-square bg-muted transition-opacity min-h-[200px] ${
                isDropdownOpen
                  ? "opacity-65"
                  : "opacity-100 group-hover:opacity-65"
              }`}
            >
              {/* Selection checkbox */}
              {isSelectionMode && (
                <div className="absolute top-3 left-3 z-10">
                  <div className="w-5 h-5 rounded bg-background/80 backdrop-blur-sm border flex items-center justify-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        onSelect?.(project.id, checked as boolean)
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
              )}

              {/* Thumbnail preview or placeholder */}
              <div className="absolute inset-0">
                {project.thumbnail ? (
                  <img
                    src={project.thumbnail}
                    alt="Project thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                    <Video className="h-12 w-12 flex-shrink-0 text-slate-600" />
                  </div>
                )}
              </div>
            </div>

            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-sm text-foreground leading-snug group-hover:text-foreground/90 transition-colors line-clamp-2">
                  {project.name}
                </h3>
                {!isSelectionMode && (
                  <DropdownMenu
                    open={isDropdownOpen}
                    onOpenChange={setIsDropdownOpen}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="text"
                        size="sm"
                        className={`size-6 p-0 transition-all shrink-0 ml-2 ${
                          isDropdownOpen
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                        onClick={(e) => e.preventDefault()}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onCloseAutoFocus={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDropdownOpen(false);
                          setIsRenameDialogOpen(true);
                        }}
                      >
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDuplicateProject();
                        }}
                      >
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDropdownOpen(false);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="!size-4" />
                  <span>Created {formatDate(project.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Link href={`/editor/project/${encodeURIComponent(project.id)}`} className="block group" prefetch={false}>
          <Card
            className={`overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-all ${
              isSelectionMode && isSelected ? "ring-2 ring-primary" : ""
            }`}
          >
            <div
              className={`relative aspect-square bg-muted transition-opacity min-h-[200px] ${
                isDropdownOpen
                  ? "opacity-65"
                  : "opacity-100 group-hover:opacity-65"
              }`}
            >
              {/* Thumbnail preview or placeholder */}
              <div className="absolute inset-0">
                {project.thumbnail ? (
                  <img
                    src={project.thumbnail}
                    alt="Project thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                    <Video className="h-12 w-12 flex-shrink-0 text-slate-600" />
                  </div>
                )}
              </div>
            </div>

            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-sm text-foreground leading-snug group-hover:text-foreground/90 transition-colors line-clamp-2">
                  {project.name}
                </h3>
                <DropdownMenu
                  open={isDropdownOpen}
                  onOpenChange={setIsDropdownOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="text"
                      size="sm"
                      className={`size-6 p-0 transition-all shrink-0 ml-2 ${
                        isDropdownOpen
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    onCloseAutoFocus={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDropdownOpen(false);
                        setIsRenameDialogOpen(true);
                      }}
                    >
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDuplicateProject();
                      }}
                    >
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDropdownOpen(false);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="!size-4" />
                  <span>Created {formatDate(project.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}
      <DeleteProjectDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteProject}
      />
      <RenameProjectDialog
        isOpen={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        onConfirm={handleRenameProject}
        projectName={project.name}
      />
    </>
  );
}

function CreateButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button className="flex" onClick={onClick}>
      <Plus className="!size-4" />
      <span className="text-sm font-medium">New project</span>
    </Button>
  );
}

function NoProjects({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
        <Video className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No projects yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Start creating your first video project. Import media, edit, and export
        professional videos.
      </p>
      <Button size="lg" className="gap-2" onClick={onCreateProject}>
        <Plus className="h-4 w-4" />
        Create Your First Project
      </Button>
    </div>
  );
}