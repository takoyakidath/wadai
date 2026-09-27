import type { TopicDTO } from "@/lib/topics";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const TOKEN_KEY = "wadai:user-token";
const UNAUTHORIZED_EVENT = "wadai:user-unauthorized";
const TOKEN_CHANGED_EVENT = "wadai:user-token-changed";

export function subscribeUserUnauthorized(callback: () => void): () => void {
  window.addEventListener(UNAUTHORIZED_EVENT, callback);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, callback);
}

export function subscribeUserTokenChanged(callback: () => void): () => void {
  window.addEventListener(TOKEN_CHANGED_EVENT, callback);
  return () => window.removeEventListener(TOKEN_CHANGED_EVENT, callback);
}

export function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setUserToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ローカルストレージが使えない場合は諦める
  }
  window.dispatchEvent(new Event(TOKEN_CHANGED_EVENT));
}

class UserApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function userFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getUserToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401) {
    setUserToken(null);
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new UserApiError(body.message ?? body.error ?? `request failed: ${res.status}`, res.status);
  }

  return res.json();
}

export async function registerUser(inviteToken: string, username: string, password: string): Promise<void> {
  const data = await userFetch<{ token: string }>("/register", {
    method: "POST",
    body: JSON.stringify({ inviteToken, username, password }),
  });
  setUserToken(data.token);
}

export async function loginUser(username: string, password: string): Promise<void> {
  const data = await userFetch<{ token: string }>("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setUserToken(data.token);
}

export async function logoutUser(): Promise<void> {
  try {
    await userFetch("/logout", { method: "POST" });
  } finally {
    setUserToken(null);
  }
}

export function aiDeepenTopic(id: string): Promise<TopicDTO> {
  return userFetch(`/topics/${id}/ai-deepen`, { method: "POST" });
}

export async function likeTopic(id: string): Promise<void> {
  await userFetch(`/topics/${id}/like`, { method: "POST" });
}

export async function unlikeTopic(id: string): Promise<void> {
  await userFetch(`/topics/${id}/like`, { method: "DELETE" });
}

export async function fetchLikedTopics(): Promise<TopicDTO[]> {
  const data = await userFetch<{ topics: TopicDTO[] }>("/likes");
  return data.topics;
}

export function fetchRandomLikedTopic(): Promise<TopicDTO> {
  return userFetch("/likes/random");
}

export async function toggleLikeWithRollback(
  id: string,
  wasLiked: boolean,
  apply: () => void,
  rollback: () => void,
): Promise<void> {
  apply();
  try {
    await (wasLiked ? unlikeTopic(id) : likeTopic(id));
  } catch {
    rollback();
  }
}
