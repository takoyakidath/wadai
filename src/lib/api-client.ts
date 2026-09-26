import type { TopicDTO } from "@/lib/topics";

export type CategoryDTO = { key: string; label: string };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `request failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchCategories(): Promise<CategoryDTO[]> {
  const res = await fetch(`${API_BASE}/categories`);
  const data = await json<{ categories: CategoryDTO[] }>(res);
  return data.categories;
}

export async function fetchRandomTopic(opts: {
  categoryKey?: string;
  excludeIds?: string[];
}): Promise<TopicDTO> {
  const params = new URLSearchParams();
  if (opts.categoryKey && opts.categoryKey !== "omakase") {
    params.set("category", opts.categoryKey);
  }
  if (opts.excludeIds?.length) params.set("exclude", opts.excludeIds.join(","));
  const res = await fetch(`${API_BASE}/topics/random?${params.toString()}`);
  return json<TopicDTO>(res);
}

export async function fetchDeeperTopic(id: string): Promise<TopicDTO> {
  const res = await fetch(`${API_BASE}/topics/${id}/deeper`);
  return json<TopicDTO>(res);
}

export async function fetchRelatedTopics(id: string): Promise<TopicDTO[]> {
  const res = await fetch(`${API_BASE}/topics/${id}/related`);
  const data = await json<{ topics: TopicDTO[] }>(res);
  return data.topics;
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
