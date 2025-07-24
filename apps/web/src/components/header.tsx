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
import { PulsatingButton } from "./magicui/pulsating-button";
import { Dock, DockIcon } from "./magicui/dock";

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

  const dockContent = (
    <Dock className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9999] w-[600px] px-12">
      <DockIcon>
        <Link 
          href="/" 
          onClick={(e) => handleClick(e, "/")}
          prefetch={false}
          className="w-full h-full flex items-center justify-center"
        >
          <Image src="./logo.svg" alt="OpenCut Logo" width={24} height={24} />
        </Link>
      </DockIcon>
      
      <div className="flex items-center justify-center gap-3 bg-gray-500/30 backdrop-blur-sm rounded-xl p-3">
        <Link 
          href="/contributors"
          onClick={(e) => handleClick(e, "/contributors")}
          prefetch={false}
          className="flex items-center justify-center no-underline"
        >
          <Button 
            className="text-sm shadow-lg hover:shadow-xl no-underline whitespace-nowrap"
            style={{
              backgroundColor: 'white', 
              color: 'black',
              borderRadius: '6px',
              fontSize: '14px',
              textDecoration: 'none',
              paddingLeft: '16px',
              paddingRight: '16px',
              minWidth: '90px',
              height: '36px'
            }}
          >
            Contributors
          </Button>
        </Link>
        
        <Link 
          href="/projects"
          onClick={(e) => handleClick(e, "/projects")}
          prefetch={false}
          className="flex items-center justify-center no-underline"
        >
          <PulsatingButton 
            className="text-sm shadow-lg hover:shadow-xl no-underline flex items-center justify-center gap-1 whitespace-nowrap"
            style={{
              backgroundColor: 'white', 
              color: 'black',
              borderRadius: '6px',
              fontSize: '14px',
              textDecoration: 'none',
              paddingLeft: '20px',
              paddingRight: '20px',
              minWidth: '100px',
              height: '36px'
            }}
            pulseColor="rgba(0, 0, 0, 0.1)"
            duration="1.5s"
          >
            Projects
            <ArrowRight className="h-3 w-3" />
          </PulsatingButton>
        </Link>
      </div>
    </Dock>
  );

  const leftContent = (
    <Link 
      href="/" 
      className="flex items-center gap-3"
      onClick={(e) => handleClick(e, "/")}
      prefetch={false}
    >
      <Image src="./logo.svg" alt="OpenCut Logo" width={32} height={32} />
      <span className="text-xl font-medium">OpenCut</span>
    </Link>
  );

  const rightContent = (
    <nav className="flex items-center gap-3 bg-gray-500/20 rounded-full px-4 py-2">
      <Link href="/blog">
        <Button variant="text" className="text-sm">
          Blog
        </Button>
      </Link>
      <Link 
        href="/contributors"
        onClick={(e) => handleClick(e, "/contributors")}
        prefetch={false}
      >
        <Button variant="text" className="text-sm">
          Contributors
        </Button>
      </Link>
      <Link 
        href="/projects"
        onClick={(e) => handleClick(e, "/projects")}
        prefetch={false}
      >
        <Button 
          size="sm"
          className="text-sm ml-4"
          style={{
            backgroundColor: 'white',
            color: 'black'
          }}
        >
          Projects
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </nav>
  );

  return (
    <div className="mx-4 md:mx-0">
      <HeaderBase
        className="bg-accent rounded-2xl max-w-3xl mx-auto mt-4 pl-4 pr-[14px]"
        leftContent={leftContent}
        rightContent={rightContent}
      />
    </div>
  );
}
