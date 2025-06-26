"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "../ui/input";
import { useProjectStore } from "@/stores/project-store";
import { Edit2, Check, X } from "lucide-react";
import { Button } from "../ui/button";

interface ProjectNameEditorProps {
  className?: string;
}

export function ProjectNameEditor({ className }: ProjectNameEditorProps) {
  const { activeProject, updateProjectName } = useProjectStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeProject) {
      setEditValue(activeProject.name);
    }
  }, [activeProject]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (activeProject) {
      setEditValue(activeProject.name);
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (editValue.trim()) {
      updateProjectName(editValue.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (activeProject) {
      setEditValue(activeProject.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!activeProject) {
    return <span className="text-sm text-muted-foreground">Loading...</span>;
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 text-sm px-3 py-1 min-w-[200px]"
          size={1}
        />
        <Button
          size="sm"
          variant="text"
          onClick={handleSave}
          className="h-7 w-7 p-0"
          disabled={!editValue.trim()}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="text"
          onClick={handleCancel}
          className="h-7 w-7 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 group">
      <span className="text-sm font-medium">{activeProject.name}</span>
      <Button
        size="sm"
        variant="text"
        onClick={handleStartEdit}
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Edit2 className="h-3 w-3" />
      </Button>
    </div>
  );
} 