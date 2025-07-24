"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import {
  RiTwitterXFill,
  RiGithubLine,
  RiStarSLine,
  RiArrowRightFill,
  RiMenu4Fill,
  RiArrowRightLine,
} from "react-icons/ri";
import { HeaderBase } from "./header-base";
import Image from "next/image";
import { useState } from "react";
import { useGitHubStars } from "@/hooks/useGhStars";

export function Header() {
  const { stars, isLoading, error } = useGitHubStars();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const leftContent = (
    <Link href="/" className="flex items-center gap-3 group">
      <div className="relative">
        <Image
          src="/logo.svg"
          alt="OpenCut Logo"
          width={32}
          height={32}
          className="transition-transform duration-200 group-hover:scale-110"
        />
        <div className="absolute rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-200 blur-sm"></div>
      </div>
      <span className="text-xl font-semibold hidden md:block">OpenCut</span>
    </Link>
  );

  const centerContent = (
    <div className="hidden lg:flex items-center gap-1">
      <Link href="/blog">
        <Button
          variant="default"
          size="sm"
          className="text-sm font-medium border-0 rounded-full px-6 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          Blog
        </Button>
      </Link>
      <Link href="/contributors">
        <Button
          variant="default"
          size="sm"
          className="text-sm font-medium border-0 rounded-full px-6 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          Contributors
        </Button>
      </Link>
      <Link href="/docs">
        <Button
          variant="default"
          size="sm"
          className="text-sm font-medium border-0 rounded-full px-6 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          Docs
        </Button>
      </Link>
    </div>
  );

  const rightContent = (
    <div className="flex items-center gap-3">
      <Link
        href="https://github.com/OpenCut-app/OpenCut"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:flex"
      >
        <div className="flex items-center gap-1 py-1.5 group text-sm font-medium border-0 rounded-full px-4 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
          <RiGithubLine className="h-6 w-6" />
          <div className="flex items-center gap-1">
            <RiStarSLine className="h-5 w-5 fill-amber-500 text-yellow-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {isLoading ? (
                <div className="w-8 h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
              ) : error ? (
                "28k+"
              ) : (
                `${stars}+`
              )}
            </span>
          </div>
        </div>
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-3">
        <Link href="/projects">
          <Button
            size="sm"
            className="text-sm font-medium border-0 rounded-full px-6 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            Projects
            <RiArrowRightFill className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      </div>

      {/* Mobile Menu Button */}
      <Button
        variant="default"
        size="sm"
        className="md:hidden p-2 rounded-full"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? (
          <RiTwitterXFill className="h-5 w-5" />
        ) : (
          <RiMenu4Fill className="h-5 w-5" />
        )}
      </Button>
    </div>
  );

  return (
    <>
      <div className="mx-4 md:mx-0 relative">
        <HeaderBase
          className="bg-accent rounded-2xl max-w-5xl mx-auto mt-4 pl-6 pr-4 shadow-lg hover:shadow-xl transition-all duration-300"
          leftContent={leftContent}
          centerContent={centerContent}
          rightContent={rightContent}
        />

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-4 right-4 mt-2 md:hidden z-50">
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 shadow-xl">
              <nav className="flex flex-col gap-3">
                <Link href="/blog" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    variant="default"
                    className="w-full justify-start text-sm font-medium"
                  >
                    Blog
                  </Button>
                </Link>
                <Link
                  href="/contributors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button
                    variant="default"
                    className="w-full justify-start text-sm font-medium"
                  >
                    Contributors
                  </Button>
                </Link>
                <Link href="/docs" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    variant="default"
                    className="w-full justify-start text-sm font-medium"
                  >
                    Docs
                  </Button>
                </Link>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                  <Link
                    href="https://github.com/OpenCut-app/OpenCut"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button
                      variant="default"
                      className="w-full justify-start text-sm font-medium mb-2"
                    >
                      <RiGithubLine className="h-4 w-4 mr-2" />
                      GitHub ({isLoading ? "..." : error ? "28k" : stars} ⭐)
                    </Button>
                  </Link>
                  <Link
                    href="/projects"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button className="w-full rounded-full">
                      Projects
                      <RiArrowRightLine className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
