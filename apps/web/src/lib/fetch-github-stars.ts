"use server";

import { unstable_cache } from "next/cache";

interface GitHubRepoData {
  stargazers_count: number;
}

function formatStarCount(count: number): string {
  if (count >= 1_000_000) {
    return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (count >= 1_000) {
    return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return count.toString();
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
          revalidate: 3600,
          tags: ["github-stars"],
        },
      }
    );

    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        console.warn("GitHub API rate limited, using fallback");
        return "28k";
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

    return formatStarCount(count);
  } catch (error) {
    console.error("Failed to fetch GitHub stars:", error);
    return "28k";
  }
}

// Cache the function with Next.js unstable_cache for additional server-side caching
export const getGitHubStars = unstable_cache(
  fetchGitHubStarsInternal,
  ["github-stars"],
  {
    revalidate: 3600,
    tags: ["github-stars"],
  }
);

export async function refreshGitHubStars(): Promise<string> {
  "use server";
  return await getGitHubStars();
}
