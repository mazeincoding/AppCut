"use client";

import { cn } from "@/lib/utils";
import { Tab, tabs, useMediaPanelStore } from "./store";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useRef, useState, useEffect } from "react";

export function TabBar() {
  const { activeTab, setActiveTab } = useMediaPanelStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const [isAtStart, setIsAtStart] = useState(true);

  const scrollToEnd = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
      });
      setIsAtEnd(true);
      setIsAtStart(false);
    }
  };

  const scrollToStart = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: 0,
      });
      setIsAtStart(true);
      setIsAtEnd(false);
    }
  };

  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      const isAtEndNow = scrollLeft + clientWidth >= scrollWidth - 1;
      const isAtStartNow = scrollLeft <= 1;
      setIsAtEnd(isAtEndNow);
      setIsAtStart(isAtStartNow);
    }
  };

  // We're using useEffect because we need to sync with external DOM scroll events
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollPosition();
    container.addEventListener("scroll", checkScrollPosition);

    const resizeObserver = new ResizeObserver(checkScrollPosition);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", checkScrollPosition);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="flex">
      <ScrollButton
        direction="left"
        onClick={scrollToStart}
        isVisible={!isAtStart}
      />
      <div
        ref={scrollContainerRef}
        className="h-12 bg-panel-accent px-3 flex justify-start items-center gap-5 overflow-x-auto scrollbar-x-hidden relative w-full"
      >
        {(Object.keys(tabs) as Tab[]).map((tabKey) => {
          const tab = tabs[tabKey];
          return (
            <div
              className={cn(
                "flex flex-col gap-0.5 items-center cursor-pointer",
                activeTab === tabKey ? "text-primary" : "text-muted-foreground"
              )}
              onClick={() => setActiveTab(tabKey)}
              key={tabKey}
            >
              <tab.icon className="!size-[1.1rem]" />
              <span className="text-[0.65rem]">{tab.label}</span>
            </div>
          );
        })}
      </div>
      <ScrollButton
        direction="right"
        onClick={scrollToEnd}
        isVisible={!isAtEnd}
      />
    </div>
  );
}

function ScrollButton({
  direction,
  onClick,
  isVisible,
}: {
  direction: "left" | "right";
  onClick: () => void;
  isVisible: boolean;
}) {
  if (!isVisible) return null;

  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <div className="bg-panel-accent w-12 h-full flex items-center justify-center">
      <Button
        size="icon"
        className="rounded-[0.4rem] w-4 h-7 !bg-foreground/10"
        onClick={onClick}
      >
        <Icon className="!size-4 text-foreground" />
      </Button>
    </div>
  );
}
