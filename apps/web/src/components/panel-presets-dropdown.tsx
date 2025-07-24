"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Check } from "lucide-react";
import { usePanelLayoutStore, PanelLayout } from "@/stores/panel-layout-store";
import { usePanelStore } from "@/stores/panel-store";
import { cn } from "@/lib/utils";

export function PanelPresetsDropdown() {
  const { activeLayout, setActiveLayout } = usePanelLayoutStore();
  const { resetLayout } = usePanelStore();

  const menuItems: { label: string; layout: PanelLayout }[] = [
    { label: "Default", layout: "default" },
    { label: "Media", layout: "media" },
    { label: "Properties", layout: "properties" },
    { label: "Vertical Preview", layout: "vertical-preview" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="text" size="icon">
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        {menuItems.map(({ label, layout }) => (
          <DropdownMenuItem
            key={layout}
            onClick={() => setActiveLayout(layout)}
            className="flex items-center justify-between"
          >
            {label}
            {activeLayout === layout && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => resetLayout(activeLayout)}>
          Reset Preset
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 