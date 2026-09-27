"use client";

import { useEffect, useState } from "react";
import {
  aiSuggestChain,
  aiSuggestSave,
  createInviteToken,
  listInviteTokens,
  type InviteTokenDTO,
} from "@/lib/admin-api-client";
import { CATEGORY_LABELS } from "@/lib/categories";

export default function AdminAiPage() {
  return (
    <div className="flex flex-col gap-8">
      <InviteTokenSection />
      <ChainSuggestSection />
    </div>
  );
}

function InviteTokenSection() {
  const [tokens, setTokens] = useState<InviteTokenDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setTokens(await listInviteTokens());
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(refresh);
  }, []);

  async function handleCreate() {
    setError(null);
    try {
      await createInviteToken();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "作成に失敗しました。");
    }
  }

  const joinBase = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">招待トークン（AI機能の利用者を招待）</h2>
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-bold text-white dark:bg-white dark:text-neutral-900"
        >
          + 発行する
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
      {loading && <p className="text-sm text-neutral-500">読み込み中…</p>}
      <ul className="flex flex-col gap-2">
        {tokens.map((t) => (
          <li key={t.id} className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs">{t.token}</code>
              {t.usedByUsername ? (
                <span className="text-xs text-neutral-500">使用済み: {t.usedByUsername}</span>
              ) : (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">未使用</span>
              )}
            </div>
            {!t.usedByUsername && (
              <p className="mt-1 break-all text-xs text-neutral-500">
                {joinBase}/join?invite={t.token}
              </p>
            )}
            <p className="mt-1 text-xs text-neutral-400">
              期限: {t.expiresAt ? new Date(t.expiresAt).toLocaleDateString("ja-JP") : "なし"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChainSuggestSection() {
  const [categoryKey, setCategoryKey] = useState("");
  const [chain, setChain] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[] | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setSavedIds(null);
    try {
      setChain(await aiSuggestChain(categoryKey || undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!chain) return;
    setSaving(true);
    setError(null);
    try {
      const ids = await aiSuggestSave(categoryKey || undefined, chain);
      setSavedIds(ids);
      setChain(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold">AIで話題チェーンを生成（Lv.1〜4）</h2>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        AIが新しいテーマで4段階の質問チェーンを1つ提案します。内容を確認・編集してから保存してください。
      </p>
      <div className="flex gap-2">
        <select
          value={categoryKey}
          onChange={(e) => setCategoryKey(e.target.value)}
          className="rounded-lg border border-black/10 bg-white p-2 text-sm dark:border-white/10 dark:bg-neutral-900"
        >
          <option value="">カテゴリ未指定</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg border border-black/10 px-3 py-2 text-sm disabled:opacity-40 dark:border-white/10"
        >
          {loading ? "生成中…" : "🤖 生成する"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
      {savedIds && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          保存しました（話題ID: {savedIds.join(", ")}）
        </p>
      )}

      {chain && (
        <div className="flex flex-col gap-2 rounded-xl border border-black/10 p-3 dark:border-white/10">
          {chain.map((text, i) => (
            <label key={i} className="flex flex-col gap-1 text-xs font-medium">
              Lv.{i + 1}
              <textarea
                value={text}
                maxLength={200}
                rows={1}
                onChange={(e) => {
                  const next = [...chain];
                  next[i] = e.target.value;
                  setChain(next);
                }}
                className="rounded-lg border border-black/10 bg-white p-2 text-sm font-normal dark:border-white/10 dark:bg-neutral-900"
              />
            </label>
          ))}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-1 rounded-lg bg-neutral-900 py-2 text-sm font-bold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {saving ? "保存中…" : "✅ この内容で保存"}
          </button>
        </div>
      )}
    </section>
  );
}
