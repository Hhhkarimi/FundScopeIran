"use client";

import { useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "fundscope-watchlist:v1";
const CHANGE_EVENT = "fundscope-watchlist-change";
const EMPTY_SNAPSHOT = "[]";
let memorySnapshot = EMPTY_SNAPSHOT;

function normalize(raw: string | null): string {
  if (!raw) return EMPTY_SNAPSHOT;
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return EMPTY_SNAPSHOT;
    return JSON.stringify(
      Array.from(new Set(value.filter((item): item is string => typeof item === "string"))).sort()
    );
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

function getSnapshot() {
  if (typeof window === "undefined") return EMPTY_SNAPSHOT;
  try {
    memorySnapshot = normalize(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Private browsing or a strict storage policy can block localStorage.
  }
  return memorySnapshot;
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function write(ids: string[]) {
  memorySnapshot = JSON.stringify(Array.from(new Set(ids)).sort());
  try {
    window.localStorage.setItem(STORAGE_KEY, memorySnapshot);
  } catch {
    // Keep the watchlist available for this tab when persistent storage is blocked.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useWatchlist() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_SNAPSHOT);
  const ids = useMemo(() => new Set<string>(JSON.parse(snapshot)), [snapshot]);

  function toggle(regNo: string) {
    const next = new Set(ids);
    if (next.has(regNo)) next.delete(regNo);
    else next.add(regNo);
    write([...next]);
  }

  return { ids, count: ids.size, has: (regNo: string) => ids.has(regNo), toggle };
}
