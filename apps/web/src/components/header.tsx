"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { HeaderBase } from "./header-base";
import { useSession } from "@opencut/auth/client";
import { getStars } from "@/lib/fetch-github-stars";
import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useScroll, useMotionValueEvent } from "motion/react";

export function Header() {
  const { data: session } = useSession();
  const [star, setStar] = useState<string>("");
  const [visible, setVisible] = useState(true); // Start visible on page load
  const [mounted, setMounted] = useState(false);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    setMounted(true);
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current === "number") {
      const direction = current - scrollYProgress.getPrevious()!;

      if (scrollYProgress.get() < 0.05) {
        setVisible(true); // Always visible at top
      } else {
        if (direction < 0) {
          setVisible(true); // Show when scrolling up
        } else {
          setVisible(false); // Hide when scrolling down
        }
      }
    }
  });

  useEffect(() => {
    const fetchStars = async () => {
      try {
        const data = await getStars();
        setStar(data);
      } catch (err) {
        console.error("Failed to fetch GitHub stars", err);
      }
    };

    fetchStars();
  }, []);

  const leftContent = (
    <Link href="/" className="flex items-center gap-3">
      <Image src="/logo.svg" alt="OpenCut Logo" width={32} height={32} />
      <span className="text-xl font-medium hidden md:block">OpenCut</span>
    </Link>
  );

  const rightContent = (
    <nav className="flex items-center gap-3">
      <Link href="/contributors">
        <Button variant="text" className="text-sm p-0">
          Contributors
        </Button>
      </Link>
      {process.env.NODE_ENV === "development" ? (
        <Link href="/projects">
          <Button size="sm" className="text-sm ml-4">
            Projects
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      ) : (
        <Link href="https://github.com/OpenCut-app/OpenCut" target="_blank">
          <Button size="sm" className="text-sm ml-4">
            GitHub {star}+
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      )}
    </nav>
  );

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 mx-4 md:mx-0">
        <HeaderBase
          className="bg-accent/95 backdrop-blur-md border rounded-2xl max-w-3xl mx-auto mt-4 pl-4 pr-[14px] shadow-lg"
          leftContent={leftContent}
          rightContent={rightContent}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50 mx-4 md:mx-0"
      initial={{
        opacity: 1,
        y: 0,
      }}
      animate={{
        y: visible ? 0 : -100,
        opacity: visible ? 1 : 0,
      }}
      transition={{
        duration: 0.8,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      style={{
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <HeaderBase
        className="bg-accent/95 backdrop-blur-md border rounded-2xl max-w-3xl mx-auto mt-4 pl-4 pr-[14px] shadow-lg"
        leftContent={leftContent}
        rightContent={rightContent}
      />
    </motion.div>
  );
}
