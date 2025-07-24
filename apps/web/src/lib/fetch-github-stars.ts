export async function getStars(): Promise<string> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/OpenCut-app/OpenCut",
      {
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      console.warn(`GitHub API error: ${res.status} ${res.statusText}`);
      return "1.5k"; // Return fallback immediately instead of throwing
    }
    
    const data = (await res.json()) as { stargazers_count: number };
    const count = data.stargazers_count;

    if (typeof count !== "number") {
      console.warn("Invalid stargazers_count from GitHub API");
      return "1.5k"; // Return fallback immediately instead of throwing
    }

    if (count >= 1_000_000)
      return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (count >= 1_000)
      return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
    return count.toString();
  } catch (error) {
    console.warn("Failed to fetch GitHub stars:", error);
    return "1.5k";
  }
}
