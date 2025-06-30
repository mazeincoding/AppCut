"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  Plus,
  Calendar,
  MoreHorizontal,
  Video,
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

// Hard-coded project data
const mockProjects: TProject[] = [
  {
    id: "1",
    name: "Summer Vacation Highlights",
    createdAt: new Date("2024-12-15"),
    updatedAt: new Date("2024-12-20"),
    thumbnail:
      "https://plus.unsplash.com/premium_photo-1750854354243-81f40af63a73?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "2",
    name: "Product Demo Video",
    createdAt: new Date("2024-12-10"),
    updatedAt: new Date("2024-12-18"),
    thumbnail:
      "https://images.unsplash.com/photo-1750875936215-0c35c1742cd6?q=80&w=688&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "3",
    name: "Wedding Ceremony Edit",
    createdAt: new Date("2024-12-05"),
    updatedAt: new Date("2024-12-16"),
    thumbnail:
      "https://images.unsplash.com/photo-1750967991618-7b64a3025381?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: "4",
    name: "Travel Vlog - Japan",
    createdAt: new Date("2024-11-28"),
    updatedAt: new Date("2024-12-14"),
    thumbnail:
      "https://images.unsplash.com/photo-1750639258774-9a714379a093?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

// Mock duration data (in seconds)
const mockDurations: Record<string, number> = {
  "1": 245, // 4:05
  "2": 120, // 2:00
  "3": 1800, // 30:00
  "4": 780, // 13:00
  "5": 360, // 6:00
  "6": 180, // 3:00
};

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="pt-6 px-6 flex items-center justify-between w-full h-16">
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-muted-foreground transition-colors"
        >
          <ChevronLeft className="!size-5 shrink-0" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <div className="block md:hidden">
          <CreateButton />
        </div>
      </div>
      <main className="max-w-6xl mx-auto px-6 pt-6 pb-6">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Your Projects
            </h1>
            <p className="text-muted-foreground">
              {mockProjects.length}{" "}
              {mockProjects.length === 1 ? "project" : "projects"}
            </p>
          </div>
          <div className="hidden md:block">
            <CreateButton />
          </div>
        </div>

        {mockProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <Video className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Start creating your first video project. Import media, edit, and
              export professional videos.
            </p>
            <Link href="/editor">
              <Button size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Project
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {mockProjects.map((project, index) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectCard({ project }: { project: TProject }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Link href={`/editor/${project.id}`} className="block group">
      <Card className="overflow-hidden bg-background border-none p-0">
        <div
          className={`relative aspect-square bg-muted transition-opacity ${
            isDropdownOpen ? "opacity-65" : "opacity-100 group-hover:opacity-65"
          }`}
        >
          {/* Thumbnail preview */}
          <div className="absolute inset-0">
            <Image
              src={project.thumbnail}
              alt="Project thumbnail"
              fill
              className="object-cover"
            />
          </div>

          {/* Duration badge */}
          <div className="absolute bottom-3 right-3 bg-background text-foreground text-xs px-2 py-1 rounded">
            {formatDuration(mockDurations[project.id] || 0)}
          </div>
        </div>

        <CardContent className="px-0 pt-5">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-sm leading-snug group-hover:text-foreground/90 transition-colors line-clamp-2">
              {project.name}
            </h3>
            <DropdownMenu onOpenChange={setIsDropdownOpen}>
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
                  console.log("close");
                }}
              >
                <DropdownMenuItem>Rename</DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
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
  );
}

function CreateButton() {
  return (
    <Button className="flex">
      <Plus className="!size-4" />
      <span className="text-sm font-medium">New project</span>
    </Button>
  );
}
