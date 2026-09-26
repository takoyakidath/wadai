"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TopicDTO } from "@/lib/topics";
import {
  fetchCategories,
  fetchDeeperTopic,
  fetchRandomTopic,
  fetchRelatedTopics,
  type CategoryDTO,
} from "@/lib/api-client";
import { TopicCard } from "@/components/TopicCard";
import { ActionButtons } from "@/components/ActionButtons";
import { RelatedSheet } from "@/components/RelatedSheet";
import { PartyModeCard } from "@/components/PartyModeCard";
import { usePartyMode } from "@/hooks/usePartyMode";

const RECENT_EXCLUDE_LIMIT = 12;

export function GachaScreen() {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [categoryKey, setCategoryKey] = useState("omakase");
  const [history, setHistory] = useState<TopicDTO[]>([]);
  const [relatedChoices, setRelatedChoices] = useState<TopicDTO[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const party = usePartyMode();

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const current = history[history.length - 1] ?? null;

  async function withLoading(fn: () => Promise<void>) {
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "うまくいきませんでした。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  function recentIds(extra: TopicDTO[] = []) {
    return [...history, ...extra].slice(-RECENT_EXCLUDE_LIMIT).map((t) => t.id);
  }

  function roll(nextCategory = categoryKey) {
    return withLoading(async () => {
      const topic = await fetchRandomTopic({
        categoryKey: nextCategory,
        excludeIds: recentIds(),
      });
      setHistory([topic]);
    });
  }

  function deepen() {
    if (!current) return;
    return withLoading(async () => {
      const topic = await fetchDeeperTopic(current.id);
      setHistory((prev) => [...prev, topic]);
    });
  }

  function lighten() {
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  function widen() {
    if (!current) return;
    return withLoading(async () => {
      const topics = await fetchRelatedTopics(current.id);
      setRelatedChoices(topics);
    });
  }

  function pickRelated(topic: TopicDTO) {
    setHistory((prev) => [...prev, topic]);
    setRelatedChoices(null);
  }

  function selectCategory(key: string) {
    setCategoryKey(key);
    roll(key);
  }

  const actionProps = {
    onLighten: lighten,
    onDeepen: () => void deepen(),
    onWiden: () => void widen(),
    onReroll: () => void roll(),
    canLighten: history.length > 1,
    disabled: loading,
  };

  if (party.active && current) {
    return (
      <div className="fixed inset-0 z-10 flex flex-col bg-neutral-50 dark:bg-neutral-950">
        <PartyModeCard
          topic={current}
          mirrored
          actions={<ActionButtons {...actionProps} compact />}
        />
        <div className="h-px bg-black/10 dark:bg-white/10" />
        <PartyModeCard
          topic={current}
          mirrored={false}
          actions={<ActionButtons {...actionProps} compact />}
        />
        <button
          type="button"
          onClick={() => party.toggle(false)}
          className="absolute top-2 right-2 rounded-full bg-black/10 px-3 py-1 text-xs dark:bg-white/10"
        >
          通常表示に戻す
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">🎲 ワダイ</h1>
        <Link
          href="/submit"
          className="text-sm text-neutral-500 underline-offset-2 hover:underline dark:text-neutral-400"
        >
          ＋ 話題を送る
        </Link>
      </header>

      {party.shouldPrompt && (
        <div className="flex items-center justify-between rounded-xl bg-neutral-900 px-3 py-2 text-xs text-white dark:bg-white dark:text-neutral-900">
          <span>📱 テーブルモードで表示しますか？</span>
          <div className="flex gap-2">
            <button type="button" onClick={party.acceptPartyMode} className="font-semibold">
              使う
            </button>
            <button type="button" onClick={party.dismissPrompt} className="opacity-70">
              いいえ
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => selectCategory(c.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              categoryKey === c.key
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-1 flex-col justify-center gap-3">
        {history.length > 1 && (
          <div className="mx-auto -mb-6 w-11/12">
            <TopicCard topic={history[history.length - 2]} faded />
          </div>
        )}
        {current ? (
          <TopicCard topic={current} />
        ) : (
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            話題に困ったら、1回まわす。
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 pb-2">
        {current ? (
          <div className="flex gap-2">
            <ActionButtons {...actionProps} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => roll()}
            disabled={loading}
            className="w-full rounded-2xl bg-neutral-900 py-4 text-lg font-bold text-white shadow-md active:scale-95 disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            🎲 話題を回す
          </button>
        )}
      </div>

      {relatedChoices && (
        <RelatedSheet
          topics={relatedChoices}
          onPick={pickRelated}
          onClose={() => setRelatedChoices(null)}
        />
      )}
    </div>
  );
}
