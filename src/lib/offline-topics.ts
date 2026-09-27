import type { TopicDTO } from "@/lib/topics";
import type { CategoryDTO } from "@/lib/api-client";

type OfflineTopic = {
  id: string;
  body: string;
  categoryKey: string;
  depth: number;
  isStarter: boolean;
  deepen: string[];
  related: string[];
};

type OfflineData = {
  categories: CategoryDTO[];
  topics: OfflineTopic[];
};

let cache: OfflineData | null = null;
let loadPromise: Promise<OfflineData> | null = null;

async function loadOfflineData(): Promise<OfflineData> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = fetch("/offline-topics.json")
      .then((res) => res.json())
      .then((data: OfflineData) => {
        cache = data;
        return data;
      });
  }
  return loadPromise;
}

function toDTO(topic: OfflineTopic): TopicDTO {
  return {
    id: topic.id,
    body: topic.body,
    categoryKey: topic.categoryKey,
    depth: topic.depth,
    hasDeeper: topic.deepen.length > 0,
    hasRelated: topic.related.length > 0,
  };
}

export async function isOfflineDataAvailable(): Promise<boolean> {
  try {
    await loadOfflineData();
    return true;
  } catch {
    return false;
  }
}

export async function offlineCategories(): Promise<CategoryDTO[]> {
  const data = await loadOfflineData();
  return data.categories;
}

export async function offlineRandomTopic(opts: {
  categoryKey?: string;
  excludeIds?: string[];
}): Promise<TopicDTO | null> {
  const data = await loadOfflineData();
  let candidates = data.topics.filter((t) => t.isStarter);
  if (opts.categoryKey) {
    candidates = candidates.filter((t) => t.categoryKey === opts.categoryKey);
  }
  const excluded = new Set(opts.excludeIds ?? []);
  const filtered = candidates.filter((t) => !excluded.has(t.id));
  const pool = filtered.length > 0 ? filtered : candidates;
  if (pool.length === 0) return null;
  return toDTO(pool[Math.floor(Math.random() * pool.length)]);
}

export async function offlineDeeperTopic(id: string): Promise<TopicDTO | null> {
  const data = await loadOfflineData();
  const topic = data.topics.find((t) => t.id === id);
  if (!topic || topic.deepen.length === 0) return null;
  const nextId = topic.deepen[Math.floor(Math.random() * topic.deepen.length)];
  const next = data.topics.find((t) => t.id === nextId);
  return next ? toDTO(next) : null;
}

export async function offlineRelatedTopics(id: string): Promise<TopicDTO[]> {
  const data = await loadOfflineData();
  const topic = data.topics.find((t) => t.id === id);
  if (!topic) return [];
  const related = topic.related
    .map((relatedId) => data.topics.find((t) => t.id === relatedId))
    .filter((t): t is OfflineTopic => t !== undefined);
  return related.map(toDTO);
}
