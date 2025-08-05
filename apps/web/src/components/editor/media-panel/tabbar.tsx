"use client";

import { Tab, tabs, useMediaPanelStore } from "./store";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
export function TabBar() {
  const { activeTab, setActiveTab } = useMediaPanelStore();

  return (
    <div className="flex">
      <div className="h-full flex md:flex-col justify-start items-center gap-1 p-1 overflow-x-scroll scrollbar-x-hidden relative w-full ">
        {(Object.keys(tabs) as Tab[]).map((tabKey) => {
          const tab = tabs[tabKey];
          return (
            <Tooltip key={tabKey}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "min-w-9 min-h-9 flex items-center justify-center shadow-none border-none",
                    "bg-inherit text-gray-500",
                    activeTab === tabKey ? "hover:text-! text-primary " : ""
                  )}
                  onClick={() => setActiveTab(tabKey)}
                >
                  <tab.icon className="size-6!" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                {tab.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
