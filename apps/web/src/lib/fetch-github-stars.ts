"use server";

import { CACHE_DURATION_SECONDS, FALLBACK_STARS } from "@/constants/gh-vars";
import { unstable_cache } from "next/cache";
import { formatCompactNumber } from "./format-numbers";

interface GitHubRepoData {
  stargazers_count: number;
}

async function fetchGitHubStarsInternal(): Promise<string> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/OpenCut-app/OpenCut",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "OpenCut-App",
        },
        next: {
          revalidate: CACHE_DURATION_SECONDS,
          tags: ["github-stars"],
        },
      }
    );

    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        console.warn("GitHub API rate limited, using fallback");
        return FALLBACK_STARS;
      }
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`
      );
    }

    const data: GitHubRepoData = await response.json();
    const count = data.stargazers_count;

    if (typeof count !== "number" || count < 0) {
      throw new Error("Invalid stargazers_count from GitHub API");
    }

    return formatCompactNumber(count);
  } catch (error) {
    console.error("Failed to fetch GitHub stars:", error);
    return FALLBACK_STARS;
  }
}

// Cache the function with Next.js unstable_cache for additional server-side caching
export const getGitHubStars = unstable_cache(
  fetchGitHubStarsInternal,
  ["github-stars"],
  {
    revalidate: CACHE_DURATION_SECONDS,
    tags: ["github-stars"],
  }
);

export async function refreshGitHubStars(): Promise<string> {
  return await getGitHubStars();
}
