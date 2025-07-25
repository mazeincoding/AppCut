"use client";

import { cn } from "@/lib/utils";
import { Tab, tabs, useMediaPanelStore } from "./store";
import { usePanelStore } from "@/stores/panel-store";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useRef, useState, useEffect } from "react";

export function TabBar() {
  const { activeTab, setActiveTab } = useMediaPanelStore();
  const { aiPanelWidth, aiPanelMinWidth } = usePanelStore();
  
  // Responsive layout calculations for tab labels
  const isCollapsed = aiPanelWidth <= (aiPanelMinWidth + 2); // Small buffer for collapsed state
  const isCompact = aiPanelWidth < 18; // Less than ~230px equivalent
  const showLabels = !isCollapsed && !isCompact; // Show labels only when there's enough space
  
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
    <div className="border-timeline rounded-sm mb-8 mt-4">
      <div
        ref={scrollContainerRef}
        className={cn(
          "h-18 bg-panel-accent py-2 flex justify-start items-center overflow-x-auto scrollbar-x-hidden relative transition-all duration-200",
          showLabels ? "px-6 gap-12" : "px-3 gap-2"
        )}
      >
        {(Object.keys(tabs) as Tab[]).map((tabKey) => {
          const tab = tabs[tabKey];
          return (
            <div
              className={cn(
                "flex items-center cursor-pointer rounded-lg transition-all duration-200 hover:bg-white/10 flex-shrink-0 group",
                // Responsive layout classes
                showLabels ? "flex-col gap-2 px-3 pt-3 pb-2 mx-1 min-w-[52px]" : "justify-center p-2 mx-0.5 min-w-[40px]",
                // Active/inactive states
                activeTab === tabKey ? "text-primary bg-primary/10" : "text-muted-foreground bg-white/5"
              )}
              onClick={() => setActiveTab(tabKey)}
              key={tabKey}
              style={{
                transform: 'scale(1)'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tabKey) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <tab.icon className={cn(
                "transition-all duration-200",
                showLabels ? "!size-[1.5rem]" : "!size-[1.2rem]",
                activeTab !== tabKey && "group-hover:text-blue-500"
              )} />
              {showLabels && (
                <span className="text-[0.65rem] tracking-wide mt-1 leading-none">
                  {tab.label}<br />
                  <span className="text-[0.2rem] leading-none">&nbsp;</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
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
        className="rounded-[0.4rem] w-4 h-7 !bg-white/20 hover:!bg-white/30"
        onClick={onClick}
      >
        <Icon className="!size-4 text-foreground" />
      </Button>
    </div>
  );
}
