import type { TopicDTO } from "@/lib/topics";
import {
  offlineCategories,
  offlineDeeperTopic,
  offlineRandomTopic,
  offlineRelatedTopics,
} from "@/lib/offline-topics";

export type CategoryDTO = { key: string; label: string };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const OFFLINE_EVENT = "wadai:offline-mode";

function setOfflineMode(offline: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OFFLINE_EVENT, { detail: offline }));
}

export function subscribeOfflineMode(callback: (offline: boolean) => void): () => void {
  const handler = (e: Event) => callback((e as CustomEvent<boolean>).detail);
  window.addEventListener(OFFLINE_EVENT, handler);
  return () => window.removeEventListener(OFFLINE_EVENT, handler);
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `request failed: ${res.status}`);
  }
  return res.json();
}

// ネットワーク自体が届かない場合（オフライン等）だけオフラインデータにフォールバックする。
// サーバーが正常に応答した 404/429 等のエラーはそのまま呼び出し元に伝える。
function isNetworkFailure(e: unknown): boolean {
  return e instanceof TypeError;
}

export async function fetchCategories(): Promise<CategoryDTO[]> {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    const data = await json<{ categories: CategoryDTO[] }>(res);
    setOfflineMode(false);
    return data.categories;
  } catch (e) {
    if (!isNetworkFailure(e)) throw e;
    setOfflineMode(true);
    return offlineCategories();
  }
}

export async function fetchRandomTopic(opts: {
  categoryKey?: string;
  excludeIds?: string[];
}): Promise<TopicDTO> {
  try {
    const params = new URLSearchParams();
    if (opts.categoryKey && opts.categoryKey !== "omakase") {
      params.set("category", opts.categoryKey);
    }
    if (opts.excludeIds?.length) params.set("exclude", opts.excludeIds.join(","));
    const res = await fetch(`${API_BASE}/topics/random?${params.toString()}`);
    const topic = await json<TopicDTO>(res);
    setOfflineMode(false);
    return topic;
  } catch (e) {
    if (!isNetworkFailure(e)) throw e;
    setOfflineMode(true);
    const topic = await offlineRandomTopic(opts);
    if (!topic) throw new Error("オフラインで表示できる話題が見つかりませんでした。");
    return topic;
  }
}

export async function fetchDeeperTopic(id: string): Promise<TopicDTO> {
  try {
    const res = await fetch(`${API_BASE}/topics/${id}/deeper`);
    const topic = await json<TopicDTO>(res);
    setOfflineMode(false);
    return topic;
  } catch (e) {
    if (!isNetworkFailure(e)) throw e;
    setOfflineMode(true);
    const topic = await offlineDeeperTopic(id);
    if (!topic) throw new Error("この話題にはこれ以上の深め方がありません。");
    return topic;
  }
}

export async function fetchRelatedTopics(id: string): Promise<TopicDTO[]> {
  try {
    const res = await fetch(`${API_BASE}/topics/${id}/related`);
    const data = await json<{ topics: TopicDTO[] }>(res);
    setOfflineMode(false);
    return data.topics;
  } catch (e) {
    if (!isNetworkFailure(e)) throw e;
    setOfflineMode(true);
    return offlineRelatedTopics(id);
  }
}

export async function submitTopic(input: {
  body: string;
  categoryKey?: string;
}): Promise<{ id: string; status: string; message: string }> {
  const res = await fetch(`${API_BASE}/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return json(res);
}
