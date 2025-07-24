"use client";

import { useState, useEffect, useTransition } from "react";
import { refreshGitHubStars } from "@/lib/fetch-github-stars";

interface GitHubStarsState {
  stars: string;
  isLoading: boolean;
  error: boolean;
}

const FALLBACK_STARS = "28k";

let clientCache: {
  data: string | null;
  timestamp: number;
  isLoading: boolean;
} = {
  data: null,
  timestamp: 0,
  isLoading: false,
};

const CLIENT_CACHE_DURATION = 5 * 60 * 1000;

function isClientCacheValid(): boolean {
  const now = Date.now();
  return (
    clientCache.data !== null &&
    now - clientCache.timestamp < CLIENT_CACHE_DURATION
  );
}

export function useGitHubStars(initialStars?: string) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<GitHubStarsState>(() => ({
    stars: initialStars || clientCache.data || FALLBACK_STARS,
    isLoading: false,
    error: false,
  }));

  useEffect(() => {
    let isMounted = true;

    if (isClientCacheValid() && clientCache.data) {
      setState({
        stars: clientCache.data,
        isLoading: false,
        error: false,
      });
      return;
    }

    if (initialStars && !clientCache.data) {
      clientCache.data = initialStars;
      clientCache.timestamp = Date.now();
      return;
    }

    if (clientCache.isLoading) {
      setState((prev) => ({ ...prev, isLoading: true }));

      const checkCache = () => {
        if (!clientCache.isLoading) {
          if (isMounted) {
            setState({
              stars: clientCache.data || FALLBACK_STARS,
              isLoading: false,
              error: !clientCache.data,
            });
          }
        } else {
          setTimeout(checkCache, 100);
        }
      };
      checkCache();
      return;
    }

    const fetchStars = async () => {
      clientCache.isLoading = true;

      setState((prev) => ({ ...prev, isLoading: true, error: false }));

      startTransition(async () => {
        try {
          const stars = await refreshGitHubStars();

          if (isMounted) {
            // Update client cache
            clientCache.data = stars;
            clientCache.timestamp = Date.now();
            clientCache.isLoading = false;

            setState({
              stars,
              isLoading: false,
              error: false,
            });
          }
        } catch (error) {
          console.warn("Failed to refresh GitHub stars:", error);
          clientCache.isLoading = false;

          if (isMounted) {
            setState({
              stars: clientCache.data || FALLBACK_STARS,
              isLoading: false,
              error: true,
            });
          }
        }
      });
    };

    const timeoutId = setTimeout(fetchStars, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [initialStars]);

  return {
    stars: state.stars,
    isLoading: state.isLoading || isPending,
    error: state.error,
  };
}
