"use client";

import { useEffect, useState } from "react";

export function ServiceWorkerRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      if (registration.waiting && registration.active) {
        setWaitingWorker(registration.waiting);
      }
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && registration.active) {
            setWaitingWorker(installing);
          }
        });
      });
    });
  }, []);

  if (!waitingWorker) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-between rounded-xl bg-neutral-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-white dark:text-neutral-900">
      <span>新しいバージョンがあります。</span>
      <button
        type="button"
        onClick={() => waitingWorker.postMessage("SKIP_WAITING")}
        className="font-semibold underline"
      >
        更新する
      </button>
    </div>
  );
}
