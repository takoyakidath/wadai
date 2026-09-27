"use client";

import { useSyncExternalStore } from "react";
import { getUserToken, subscribeUserTokenChanged, subscribeUserUnauthorized } from "@/lib/user-api-client";

function subscribe(callback: () => void) {
  const unsubChanged = subscribeUserTokenChanged(callback);
  const unsubUnauthorized = subscribeUserUnauthorized(callback);
  return () => {
    unsubChanged();
    unsubUnauthorized();
  };
}

function getSnapshot() {
  return getUserToken() !== null;
}

function getServerSnapshot() {
  return false;
}

export function useIsLoggedIn(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
