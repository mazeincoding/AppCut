"use cache";

import { CACHE_DURATION_SECONDS, FALLBACK_STARS } from "@/constants/gh-vars";
import { formatCompactNumber } from "./format-numbers";

interface GitHubRepoData {
  stargazers_count: number;
}

const revalidate = CACHE_DURATION_SECONDS;

export async function getGitHubStars(): Promise<string> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/OpenCut-app/OpenCut",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "OpenCut-App",
        },
        next: {
          revalidate,
          tags: ["github-stars"],
        },
      }
    );

    if (!response.ok) {
      if ([403, 429].includes(response.status)) {
        console.warn("GitHub API rate limited, using fallback");
        return FALLBACK_STARS;
      }
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`
      );
    }

    const data: GitHubRepoData = await response.json();

    if (
      typeof data.stargazers_count !== "number" ||
      data.stargazers_count < 0
    ) {
      throw new Error("Invalid stargazers_count from GitHub API");
    }

    return formatCompactNumber(data.stargazers_count);
  } catch (error) {
    console.error("Failed to fetch GitHub stars:", error);
    return FALLBACK_STARS;
  }
}

export async function refreshGitHubStars(): Promise<string> {
  return await getGitHubStars();
}
