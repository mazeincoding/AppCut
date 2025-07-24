"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import {
  RiGithubLine,
  RiStarSLine,
  RiArrowRightFill,
  RiMenu4Fill,
  RiArrowRightLine,
  RiMenuFold4Fill,
} from "react-icons/ri";
import { HeaderBase } from "./header-base";
import Image from "next/image";
import { useState } from "react";
import { useGitHubStars } from "@/hooks/useGhStars";

interface HeaderProps {
  initialStars?: string;
}

export function Header({ initialStars }: HeaderProps) {
  const { stars, isLoading } = useGitHubStars(initialStars);
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

  const centerContent = null;

  const rightContent = (
    <div className="flex items-center gap-6">
      {/* Navigation Links */}
      <div className="hidden md:flex items-center gap-6">
        <Link href="/blog">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
            Blog
          </span>
        </Link>
        <Link href="/contributors">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
            Contributors
          </span>
        </Link>
      </div>
      <div className="hidden md:flex items-center  gap-4">
        <Link
          href="https://github.com/OpenCut-app/OpenCut"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex"
        >
          <div className="flex items-center gap-1 py-1.5 group text-sm font-medium rounded-full px-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200">
            <RiGithubLine className="h-5 w-5 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
            <div className="flex items-center gap-1">
              <RiStarSLine className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[2rem]">
                {isLoading ? (
                  <div className="w-8 h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                ) : (
                  `${stars}+`
                )}
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Desktop Projects Button */}
      <div className="hidden md:flex items-center">
        <Link href="/projects">
          <Button
            size="sm"
            className="text-sm font-medium border-0 rounded-full px-6 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
          >
            Projects
            <RiArrowRightFill className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      </div>

      {/* Mobile Menu Button */}

      <div className="flex md:hidden items-center justify-center">
        <Link
          href="https://github.com/OpenCut-app/OpenCut"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <span className="flex items-center gap-1 justify-center w-full px-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-all cursor-pointer mb-2">
            <RiGithubLine className="h-5 w-5" />
            <RiStarSLine className="h-4 w-4 fill-amber-500 text-amber-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[2rem]">
              {stars}+
            </span>
          </span>
        </Link>
        <Button
          variant="default"
          size="sm"
          className="md:hidden p-2 rounded-full"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? (
            <RiMenuFold4Fill className="h-5 w-5" />
          ) : (
            <RiMenu4Fill className="h-5 w-5" />
          )}
        </Button>
      </div>
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
                  <span className="block w-full text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-all cursor-pointer">
                    Blog
                  </span>
                </Link>
                <Link
                  href="/contributors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="block w-full text-left py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-all cursor-pointer">
                    Contributors
                  </span>
                </Link>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
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
