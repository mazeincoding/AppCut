"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { HeaderBase } from "./header-base";
import { useSession } from "@/lib/auth-client";

export function Header() {
  const { data: session } = useSession();
  const leftContent = (
    <Link href="/" className="flex items-center gap-3">
      <Image src="/logo.png" alt="OpenCut Logo" width={24} height={24} />
      <span className="font-medium tracking-tight">OpenCut</span>
    </Link>
  );

  const rightContent = (
    <nav className="flex items-center">
      <Link href="https://github.com/OpenCut-app/OpenCut" target="_blank">
        <Button variant="ghost" className="text-sm">
          GitHub
        </Button>
      </Link>
      <Link href={session ? "/editor" : "/auth/login"}>
        <Button size="sm" className="text-sm ml-4">
          Start editing
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </nav>
  );

  return <HeaderBase leftContent={leftContent} rightContent={rightContent} />;
}
