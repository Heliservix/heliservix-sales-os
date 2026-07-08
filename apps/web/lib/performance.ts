"use client";

import { useCallback, useEffect, useRef, useState, type RefObject, type SetStateAction } from "react";

type StorageStateOptions<T> = {
  initialValue: () => T;
  merge?: (value: T) => T;
  writeDelayMs?: number;
};

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function comparePrimitiveValues(left: string | number | undefined, right: string | number | undefined) {
  const leftValue = left ?? "";
  const rightValue = right ?? "";
  return typeof leftValue === "number" && typeof rightValue === "number"
    ? leftValue - rightValue
    : collator.compare(String(leftValue), String(rightValue));
}

export function useDeferredLocalStorageState<T>(key: string, options: StorageStateOptions<T>) {
  const lastSerializedRef = useRef<string | undefined>(undefined);
  const hasMountedRef = useRef(false);
  const latestStateRef = useRef<T | undefined>(undefined);
  const hasPendingWriteRef = useRef(false);
  const writeDelayMs = options.writeDelayMs ?? 180;
  const [isReady, setIsReady] = useState(false);
  const [state, setState] = useState<T>(() => {
    const fallback = options.initialValue();
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as T;
      return options.merge ? options.merge(parsed) : parsed;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    latestStateRef.current = state;
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      lastSerializedRef.current ??= JSON.stringify(state);
      return;
    }
    hasPendingWriteRef.current = true;
    const timeout = window.setTimeout(() => {
      writeLocalStorageValue(key, state, lastSerializedRef);
      hasPendingWriteRef.current = false;
    }, writeDelayMs);
    return () => window.clearTimeout(timeout);
  }, [key, state, writeDelayMs]);

  useEffect(() => {
    const flushPendingWrite = () => {
      if (!hasPendingWriteRef.current || latestStateRef.current === undefined) return;
      writeLocalStorageValue(key, latestStateRef.current, lastSerializedRef);
      hasPendingWriteRef.current = false;
    };
    window.addEventListener("pagehide", flushPendingWrite);
    return () => {
      window.removeEventListener("pagehide", flushPendingWrite);
      flushPendingWrite();
    };
  }, [key]);

  const updateState = useCallback((updater: SetStateAction<T>) => {
    setState((current) => typeof updater === "function" ? (updater as (value: T) => T)(current) : updater);
  }, []);

  return [state, updateState, isReady] as const;
}

function writeLocalStorageValue<T>(
  key: string,
  value: T,
  lastSerializedRef: RefObject<string | undefined>
) {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === lastSerializedRef.current) return;
    window.localStorage.setItem(key, serialized);
    lastSerializedRef.current = serialized;
  } catch {
    // Storage quota or privacy-mode errors should not break the local UI.
  }
}

export function prepareStableCrudRows<T>(rows: T[], config: {
  query: string;
  filter: string;
  sortKey: string;
  sortDirection: "asc" | "desc";
  searchable: (row: T) => Array<string | number | undefined>;
  filterValue: (row: T) => Array<string | number | undefined>;
  sortValue: (row: T, key: string) => string | number | undefined;
}) {
  const query = config.query.trim().toLowerCase();
  const filter = config.filter;
  const prepared = rows
    .map((row) => ({
      row,
      haystack: query ? config.searchable(row).join(" ").toLowerCase() : "",
      filters: filter === "All" ? undefined : new Set(config.filterValue(row).map(String)),
      sortValue: config.sortValue(row, config.sortKey)
    }))
    .filter((item) => (!query || item.haystack.includes(query)) && (filter === "All" || item.filters?.has(filter)));

  prepared.sort((left, right) => {
    const comparison = comparePrimitiveValues(left.sortValue, right.sortValue);
    return config.sortDirection === "asc" ? comparison : -comparison;
  });

  return prepared.map((item) => item.row);
}
