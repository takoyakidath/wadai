"use client";

import { useEffect, useState } from "react";
import {
  approveSubmission,
  listSubmissions,
  rejectSubmission,
  type SubmissionDTO,
} from "@/lib/admin-api-client";
import { CATEGORY_LABELS } from "@/lib/categories";

type EditState = {
  body: string;
  categoryKey: string;
  depth: number;
  isStarter: boolean;
  deepenParentId: string;
  relatedTopicIds: string;
  aiExtend: boolean;
};

function initialEdit(s: SubmissionDTO): EditState {
  return {
    body: s.body,
    categoryKey: s.categoryKey ?? "",
    depth: 1,
    isStarter: true,
    deepenParentId: "",
    relatedTopicIds: "",
    aiExtend: false,
  };
}

export default function AdminSubmissionsPage() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [submissions, setSubmissions] = useState<SubmissionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);
  const [approveResult, setApproveResult] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setSubmissions(await listSubmissions(status));
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function toggleExpand(s: SubmissionDTO) {
    if (expandedId === s.id) {
      setExpandedId(null);
      setEdit(null);
    } else {
      setExpandedId(s.id);
      setEdit(initialEdit(s));
    }
  }

  async function handleApprove(id: string) {
    if (!edit) return;
    setBusy(true);
    setError(null);
    setApproveResult(null);
    try {
      const result = await approveSubmission(id, {
        body: edit.body,
        categoryKey: edit.categoryKey || undefined,
        depth: edit.depth,
        isStarter: edit.isStarter,
        deepenParentId: edit.deepenParentId.trim() || undefined,
        relatedTopicIds: edit.relatedTopicIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        aiExtend: edit.aiExtend,
      });
      setExpandedId(null);
      setEdit(null);
      if (edit.aiExtend) {
        setApproveResult(
          result.aiExtendedTopicIds.length > 0
            ? `AIでLv.${edit.depth + 1}〜${edit.depth + result.aiExtendedTopicIds.length}を自動生成しました（話題ID: ${result.aiExtendedTopicIds.join(", ")}）`
            : "採用しましたが、AIでの深め先生成はできませんでした（すでにLv.4か、生成に失敗しました）。",
        );
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "採用に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt("却下理由（任意）");
    if (reason === null) return;
    setBusy(true);
    setError(null);
    try {
      await rejectSubmission(id, reason);
      setExpandedId(null);
      setEdit(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "却下に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-sm ${
              status === s
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "bg-neutral-100 dark:bg-neutral-800"
            }`}
          >
            {{ pending: "未処理", approved: "採用済み", rejected: "却下済み", all: "すべて" }[s]}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
      {approveResult && <p className="text-sm text-emerald-600 dark:text-emerald-400">{approveResult}</p>}
      {loading && <p className="text-sm text-neutral-500">読み込み中…</p>}
      {!loading && submissions.length === 0 && (
        <p className="text-sm text-neutral-500">該当する申請はありません。</p>
      )}

      <ul className="flex flex-col gap-2">
        {submissions.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-black/10 dark:border-white/10"
          >
            <button
              type="button"
              onClick={() => toggleExpand(s)}
              className="flex w-full items-start justify-between gap-2 p-3 text-left"
            >
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs text-neutral-500">
                  <span>#{s.id}</span>
                  <span>{s.status}</span>
                  {s.flagged && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                      ⚠️ {s.flagReasons.join(", ")}
                    </span>
                  )}
                  <span>{new Date(s.createdAt).toLocaleString("ja-JP")}</span>
                </div>
                <p className="text-sm">{s.body}</p>
              </div>
            </button>

            {expandedId === s.id && edit && (
              <div className="flex flex-col gap-3 border-t border-black/10 p-3 dark:border-white/10">
                <label className="flex flex-col gap-1 text-xs font-medium">
                  本文（編集可）
                  <textarea
                    value={edit.body}
                    maxLength={200}
                    rows={2}
                    onChange={(e) => setEdit({ ...edit, body: e.target.value })}
                    className="rounded-lg border border-black/10 bg-white p-2 text-sm font-normal dark:border-white/10 dark:bg-neutral-900"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    カテゴリ
                    <select
                      value={edit.categoryKey}
                      onChange={(e) => setEdit({ ...edit, categoryKey: e.target.value })}
                      className="rounded-lg border border-black/10 bg-white p-2 text-sm font-normal dark:border-white/10 dark:bg-neutral-900"
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
                      value={edit.depth}
                      onChange={(e) => setEdit({ ...edit, depth: Number(e.target.value) })}
                      className="rounded-lg border border-black/10 bg-white p-2 text-sm font-normal dark:border-white/10 dark:bg-neutral-900"
                    >
                      {[1, 2, 3, 4].map((d) => (
                        <option key={d} value={d}>
                          Lv.{d}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={edit.isStarter}
                    onChange={(e) => setEdit({ ...edit, isStarter: e.target.checked })}
                  />
                  初期ガチャに出す（スターター）
                </label>
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={edit.aiExtend}
                    disabled={edit.depth >= 4}
                    onChange={(e) => setEdit({ ...edit, aiExtend: e.target.checked })}
                  />
                  🤖 採用後、AIで深め先をLv.4まで自動生成する
                  {edit.depth >= 4 && "（すでにLv.4のため不可）"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    深め先にする話題ID（任意）
                    <input
                      value={edit.deepenParentId}
                      onChange={(e) => setEdit({ ...edit, deepenParentId: e.target.value })}
                      placeholder="例: 12"
                      className="rounded-lg border border-black/10 bg-white p-2 text-sm font-normal dark:border-white/10 dark:bg-neutral-900"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    関連させる話題ID（カンマ区切り・任意）
                    <input
                      value={edit.relatedTopicIds}
                      onChange={(e) => setEdit({ ...edit, relatedTopicIds: e.target.value })}
                      placeholder="例: 1,5"
                      className="rounded-lg border border-black/10 bg-white p-2 text-sm font-normal dark:border-white/10 dark:bg-neutral-900"
                    />
                  </label>
                </div>

                {s.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(s.id)}
                      disabled={busy}
                      className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-bold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
                    >
                      ✅ この内容で採用
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(s.id)}
                      disabled={busy}
                      className="flex-1 rounded-lg border border-black/10 py-2 text-sm disabled:opacity-40 dark:border-white/10"
                    >
                      ❌ 却下
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
