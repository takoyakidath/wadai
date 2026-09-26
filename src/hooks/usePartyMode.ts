"use client";

import { useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "wadai:party-mode";
const LANDSCAPE_QUERY = "(orientation: landscape) and (max-width: 926px)";

function subscribeToOrientation(callback: () => void) {
  const mql = window.matchMedia(LANDSCAPE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getOrientationSnapshot() {
  return window.matchMedia(LANDSCAPE_QUERY).matches;
}

function getOrientationServerSnapshot() {
  return false;
}

function readStoredPreference(): "on" | "off" | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "on" || stored === "off" ? stored : null;
  } catch {
    return null;
  }
}

function writeStoredPreference(value: "on" | "off") {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // プライベートモード等で書き込めない場合は、その場限りの状態として扱う
  }
}

export function usePartyMode() {
  const isLandscapePhone = useSyncExternalStore(
    subscribeToOrientation,
    getOrientationSnapshot,
    getOrientationServerSnapshot,
  );
  const [enabled, setEnabled] = useState(() => readStoredPreference() === "on");
  const [hasPrompted, setHasPrompted] = useState(() => readStoredPreference() !== null);

  const shouldPrompt = isLandscapePhone && !enabled && !hasPrompted;

  function acceptPartyMode() {
    setEnabled(true);
    setHasPrompted(true);
    writeStoredPreference("on");
  }

  function dismissPrompt() {
    setHasPrompted(true);
    writeStoredPreference("off");
  }

  function toggle(next: boolean) {
    setEnabled(next);
    writeStoredPreference(next ? "on" : "off");
  }

  return {
    isLandscapePhone,
    active: enabled && isLandscapePhone,
    shouldPrompt,
    acceptPartyMode,
    dismissPrompt,
    toggle,
  };
}
