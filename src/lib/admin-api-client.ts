const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const TOKEN_KEY = "wadai:admin-token";

export type SubmissionDTO = {
  id: string;
  body: string;
  categoryKey: string | null;
  categoryLabel: string | null;
  status: "pending" | "approved" | "rejected";
  flagged: boolean;
  flagReasons: string[];
  createdAt: string;
};

export type AdminTopicDTO = {
  id: string;
  body: string;
  depth: number;
  isStarter: boolean;
  status: "draft" | "published" | "archived";
  source: "seed" | "user_submission";
  drawCount: number;
  categoryKey: string | null;
  categoryLabel: string | null;
};

export type TopicRelationDTO = {
  relationId: string;
  type: "deepen" | "related";
  topic: { id: string; body: string; depth: number };
};

export type AdminTopicDetailDTO = AdminTopicDTO & { relations: TopicRelationDTO[] };

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ローカルストレージが使えない場合は諦める（このセッションではログイン維持されない）
  }
}

class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401) {
    setAdminToken(null);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new AdminApiError(body.message ?? body.error ?? `request failed: ${res.status}`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function adminLogin(username: string, password: string): Promise<void> {
  const data = await adminFetch<{ token: string }>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setAdminToken(data.token);
}

export async function adminLogout(): Promise<void> {
  try {
    await adminFetch("/admin/logout", { method: "POST" });
  } finally {
    setAdminToken(null);
  }
}

export function listSubmissions(status: string): Promise<SubmissionDTO[]> {
  return adminFetch<{ submissions: SubmissionDTO[] }>(`/admin/submissions?status=${status}`).then(
    (d) => d.submissions,
  );
}

export function approveSubmission(
  id: string,
  input: {
    body: string;
    categoryKey?: string;
    depth: number;
    isStarter: boolean;
    deepenParentId?: string;
    relatedTopicIds?: string[];
  },
): Promise<{ topic: { id: string } }> {
  return adminFetch(`/admin/submissions/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function rejectSubmission(id: string, reason: string): Promise<void> {
  return adminFetch(`/admin/submissions/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function listTopics(search: string): Promise<AdminTopicDTO[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  return adminFetch<{ topics: AdminTopicDTO[] }>(`/admin/topics${params}`).then((d) => d.topics);
}

export function getTopicDetail(id: string): Promise<AdminTopicDetailDTO> {
  return adminFetch(`/admin/topics/${id}`);
}

export function updateTopic(
  id: string,
  input: Partial<{
    body: string;
    depth: number;
    categoryKey: string | null;
    isStarter: boolean;
    status: "draft" | "published" | "archived";
  }>,
): Promise<void> {
  return adminFetch(`/admin/topics/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function addTopicRelation(
  id: string,
  toTopicId: string,
  type: "deepen" | "related",
): Promise<void> {
  return adminFetch(`/admin/topics/${id}/relations`, {
    method: "POST",
    body: JSON.stringify({ toTopicId, type }),
  });
}

export function removeTopicRelation(topicId: string, relationId: string): Promise<void> {
  return adminFetch(`/admin/topics/${topicId}/relations/${relationId}`, { method: "DELETE" });
}
