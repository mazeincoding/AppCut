import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

export function CreateProjectDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  existingProjectNames = [],
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (projectName: string) => void;
  existingProjectNames?: string[];
}) {
  const [projectName, setProjectName] = useState("");

  // Generate unique default name when dialog opens
  useEffect(() => {
    if (isOpen) {
      const generateUniqueName = () => {
        const baseName = "New Project";

        // Check if "New Project" exists
        if (!existingProjectNames.includes(baseName)) {
          return baseName;
        }

        // Find the next available number
        let counter = 1;
        let newName = `${baseName} (${counter})`;

        while (existingProjectNames.includes(newName)) {
          counter++;
          newName = `${baseName} (${counter})`;
        }

        return newName;
      };

      setProjectName(generateUniqueName());
    }
  }, [isOpen, existingProjectNames]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName.trim()) {
      onConfirm(projectName.trim());
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setProjectName("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter a name for your new project. You can change this later.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="project-name" className="text-sm font-medium">
              Project Name
            </Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name..."
              className="mt-2"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!projectName.trim()}
            >
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
