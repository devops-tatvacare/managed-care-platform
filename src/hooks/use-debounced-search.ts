"use client";

import { useEffect, useRef, useState } from "react";
import { searchGlobal } from "@/services/api/search";
import type { SearchResponse } from "@/services/types/search";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function useDebouncedSearch(query: string) {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Reset if query too short
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    timerRef.current = setTimeout(async () => {
      // Cancel previous in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await searchGlobal(query.trim(), controller.signal);
        if (!controller.signal.aborted) {
          setData(result);
          setIsLoading(false);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Search failed");
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query]);

  return { data, isLoading, error };
}
