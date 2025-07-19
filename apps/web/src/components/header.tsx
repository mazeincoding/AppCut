"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { HeaderBase } from "./header-base";
import { useSession } from "@/lib/auth-wrapper";
import { getStars } from "@/lib/fetch-github-stars";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useElectronLink } from "@/lib/electron-navigation";

export function Header() {
  const { data: session } = useSession();
  const [star, setStar] = useState<string>("");
  const { handleClick, isElectron } = useElectronLink();

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
    <Link 
      href="/" 
      className="flex items-center gap-3"
      onClick={(e) => handleClick(e, "/")}
      prefetch={false}
    >
      <Image src="/logo.svg" alt="OpenCut Logo" width={32} height={32} />
      <span className="text-xl font-medium hidden md:block">OpenCut</span>
    </Link>
  );

  const rightContent = (
    <nav className="flex items-center gap-3">
      <Link 
        href="/contributors"
        onClick={(e) => handleClick(e, "/contributors")}
        prefetch={false}
      >
        <Button variant="text" className="text-sm p-0">
          Contributors
        </Button>
      </Link>
      <Link 
        href="/projects"
        onClick={(e) => handleClick(e, "/projects")}
      >
        <Button size="sm" className="text-sm ml-4">
          Projects
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </nav>
  );

  return (
    <div className="mx-4 md:mx-0">
      <HeaderBase
        className="bg-accent border rounded-2xl max-w-3xl mx-auto mt-4 pl-4 pr-[14px]"
        leftContent={leftContent}
        rightContent={rightContent}
      />
    </div>
  );
}
