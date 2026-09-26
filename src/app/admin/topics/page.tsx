"use client";

import { useEffect, useState } from "react";
import {
  addTopicRelation,
  getTopicDetail,
  listTopics,
  removeTopicRelation,
  updateTopic,
  type AdminTopicDTO,
  type AdminTopicDetailDTO,
} from "@/lib/admin-api-client";
import { CATEGORY_LABELS } from "@/lib/categories";

export default function AdminTopicsPage() {
  const [search, setSearch] = useState("");
  const [topics, setTopics] = useState<AdminTopicDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminTopicDetailDTO | null>(null);
  const [newRelationId, setNewRelationId] = useState("");
  const [newRelationType, setNewRelationType] = useState<"deepen" | "related">("deepen");

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setTopics(await listTopics(search));
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleExpand(t: AdminTopicDTO) {
    if (expandedId === t.id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(t.id);
    setDetail(null);
    try {
      setDetail(await getTopicDetail(t.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "詳細の取得に失敗しました。");
    }
  }

  async function toggleStatus(t: AdminTopicDTO) {
    const next = t.status === "published" ? "archived" : "published";
    await updateTopic(t.id, { status: next });
    await refresh();
    if (expandedId === t.id) setDetail(await getTopicDetail(t.id));
  }

  async function handleAddRelation() {
    if (!detail || newRelationId.trim() === "") return;
    try {
      await addTopicRelation(detail.id, newRelationId.trim(), newRelationType);
      setNewRelationId("");
      setDetail(await getTopicDetail(detail.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "接続の追加に失敗しました。");
    }
  }

  async function handleRemoveRelation(relationId: string) {
    if (!detail) return;
    await removeTopicRelation(detail.id, relationId);
    setDetail(await getTopicDetail(detail.id));
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          refresh();
        }}
        className="flex gap-2"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="本文で検索"
          className="flex-1 rounded-lg border border-black/10 bg-white p-2 text-sm dark:border-white/10 dark:bg-neutral-900"
        />
        <button type="submit" className="rounded-lg border border-black/10 px-3 text-sm dark:border-white/10">
          検索
        </button>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
      {loading && <p className="text-sm text-neutral-500">読み込み中…</p>}

      <ul className="flex flex-col gap-2">
        {topics.map((t) => (
          <li key={t.id} className="rounded-xl border border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between gap-2 p-3">
              <button type="button" onClick={() => toggleExpand(t)} className="flex-1 text-left">
                <div className="mb-1 flex items-center gap-2 text-xs text-neutral-500">
                  <span>#{t.id}</span>
                  <span>Lv.{t.depth}</span>
                  {t.categoryKey && <span>{t.categoryLabel}</span>}
                  <span className={t.status === "published" ? "" : "text-amber-600"}>{t.status}</span>
                  <span>抽選 {t.drawCount}回</span>
                </div>
                <p className="text-sm">{t.body}</p>
              </button>
              <button
                type="button"
                onClick={() => toggleStatus(t)}
                className="shrink-0 rounded-lg border border-black/10 px-2 py-1 text-xs dark:border-white/10"
              >
                {t.status === "published" ? "非公開にする" : "公開する"}
              </button>
            </div>

            {expandedId === t.id && detail && (
              <div className="flex flex-col gap-3 border-t border-black/10 p-3 text-sm dark:border-white/10">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    カテゴリ
                    <select
                      defaultValue={detail.categoryKey ?? ""}
                      onChange={async (e) => {
                        await updateTopic(detail.id, { categoryKey: e.target.value || null });
                        await refresh();
                      }}
                      className="rounded-lg border border-black/10 bg-white p-2 dark:border-white/10 dark:bg-neutral-900"
                    >
                      <option value="">未選択</option>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    深度
                    <select
                      defaultValue={detail.depth}
                      onChange={async (e) => {
                        await updateTopic(detail.id, { depth: Number(e.target.value) });
                        await refresh();
                      }}
                      className="rounded-lg border border-black/10 bg-white p-2 dark:border-white/10 dark:bg-neutral-900"
                    >
                      {[1, 2, 3, 4].map((d) => (
                        <option key={d} value={d}>
                          Lv.{d}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium text-neutral-500">接続</p>
                  <ul className="flex flex-col gap-1">
                    {detail.relations.length === 0 && (
                      <li className="text-xs text-neutral-500">まだ接続がありません。</li>
                    )}
                    {detail.relations.map((r) => (
                      <li key={r.relationId} className="flex items-center justify-between gap-2">
                        <span className="text-xs">
                          {r.type === "deepen" ? "🔍 深める→" : "🔀 関連↔"} #{r.topic.id} {r.topic.body}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRelation(r.relationId)}
                          className="text-xs text-red-600 dark:text-red-300"
                        >
                          削除
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-2">
                  <select
                    value={newRelationType}
                    onChange={(e) => setNewRelationType(e.target.value as "deepen" | "related")}
                    className="rounded-lg border border-black/10 bg-white p-2 text-xs dark:border-white/10 dark:bg-neutral-900"
                  >
                    <option value="deepen">深める先</option>
                    <option value="related">関連</option>
                  </select>
                  <input
                    value={newRelationId}
                    onChange={(e) => setNewRelationId(e.target.value)}
                    placeholder="話題ID"
                    className="flex-1 rounded-lg border border-black/10 bg-white p-2 text-xs dark:border-white/10 dark:bg-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddRelation}
                    className="rounded-lg border border-black/10 px-2 text-xs dark:border-white/10"
                  >
                    追加
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
