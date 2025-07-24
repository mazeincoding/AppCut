"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { refreshGitHubStars } from "@/lib/fetch-github-stars";

interface GitHubStarsState {
  stars: string;
  isLoading: boolean;
  error: boolean;
}

interface CacheData {
  data: string | null;
  timestamp: number;
}

const CLIENT_CACHE_DURATION = 5 * 60 * 1000;
const MAX_POLL_RETRIES = 50;
const POLL_TIMEOUT = 10000;
const FALLBACK_STARS = "28k";

let fetchPromise: Promise<string> | null = null;

function isCacheValid(cache: CacheData): boolean {
  const now = Date.now();
  return cache.data !== null && now - cache.timestamp < CLIENT_CACHE_DURATION;
}

export function useGitHubStars(initialStars?: string) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<GitHubStarsState>(() => ({
    stars: initialStars || FALLBACK_STARS,
    isLoading: false,
    error: false,
  }));

  const cacheRef = useRef<CacheData>({
    data: initialStars || null,
    timestamp: initialStars ? Date.now() : 0,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isCacheValid(cacheRef.current) && cacheRef.current.data) {
      setState({
        stars: cacheRef.current.data,
        isLoading: false,
        error: false,
      });
      return;
    }

    // If we have initial stars and no cache, set cache
    if (initialStars && !cacheRef.current.data) {
      cacheRef.current = {
        data: initialStars,
        timestamp: Date.now(),
      };
      return;
    }

    if (fetchPromise) {
      setState((prev) => ({ ...prev, isLoading: true }));

      const pollStartTime = Date.now();
      let pollRetries = 0;

      const pollForResult = () => {
        const elapsed = Date.now() - pollStartTime;

        if (elapsed > POLL_TIMEOUT || pollRetries >= MAX_POLL_RETRIES) {
          if (isMountedRef.current) {
            setState({
              stars: cacheRef.current.data || FALLBACK_STARS,
              isLoading: false,
              error: true,
            });
          }
          return;
        }

        if (!fetchPromise) {
          if (isMountedRef.current) {
            setState({
              stars: cacheRef.current.data || FALLBACK_STARS,
              isLoading: false,
              error: !cacheRef.current.data,
            });
          }
          return;
        }

        pollRetries++;
        setTimeout(pollForResult, 100);
      };

      pollForResult();
      return;
    }

    // Start new fetch
    const fetchStars = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: false }));

      startTransition(async () => {
        try {
          if (fetchPromise) {
            const stars = await fetchPromise;
            if (isMountedRef.current) {
              setState({
                stars,
                isLoading: false,
                error: false,
              });
            }
            return;
          }

          fetchPromise = refreshGitHubStars();
          const stars = await fetchPromise;

          if (isMountedRef.current) {
            // Update component-level cache
            cacheRef.current = {
              data: stars,
              timestamp: Date.now(),
            };

            setState({
              stars,
              isLoading: false,
              error: false,
            });
          }
        } catch (error) {
          console.warn("Failed to refresh GitHub stars:", error);

          if (isMountedRef.current) {
            setState({
              stars: cacheRef.current.data || FALLBACK_STARS,
              isLoading: false,
              error: true,
            });
          }
        } finally {
          fetchPromise = null;
        }
      });
    };

    // Small delay to avoid blocking initial render
    const timeoutId = setTimeout(fetchStars, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [initialStars]);

  return {
    stars: state.stars,
    isLoading: state.isLoading || isPending,
    error: state.error,
  };
}
