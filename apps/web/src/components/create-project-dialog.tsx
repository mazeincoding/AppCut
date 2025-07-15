import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "./ui/input";
import { useState } from "react";

export function CreateProjectDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (projectName: string) => void;
}) {
  const [projectName, setProjectName] = useState("New project");
  const isValidProjectName = projectName.trim().length > 0;
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Enter a name for your new project.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Project name"
          onKeyDown={(e) => {
            if (e.key === "Enter" && isValidProjectName) {
              e.preventDefault();
              onConfirm(projectName);
            }
          }}
          onChange={(e) => setProjectName(e.target.value)}
          value={projectName}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={!isValidProjectName}
            onClick={() => {
              if (isValidProjectName) {
                onConfirm(projectName);
              }
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
