"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { TopicDTO } from "@/lib/topics";
import {
  fetchCategories,
  fetchDeeperTopic,
  fetchRandomTopic,
  fetchRelatedTopics,
  subscribeOfflineMode,
  type CategoryDTO,
} from "@/lib/api-client";
import { aiDeepenTopic, fetchLikedTopics, logoutUser, toggleLikeWithRollback } from "@/lib/user-api-client";
import { categoryIcon, categoryTheme } from "@/lib/categories";
import { useIsLoggedIn } from "@/hooks/useUserSession";
import { TopicCard } from "@/components/TopicCard";
import { ActionButtons } from "@/components/ActionButtons";
import { RelatedSheet } from "@/components/RelatedSheet";
import { PartyModeCard } from "@/components/PartyModeCard";
import { RelationshipPicker } from "@/components/RelationshipPicker";
import { usePartyMode } from "@/hooks/usePartyMode";

const RECENT_EXCLUDE_LIMIT = 12;

export function GachaScreen() {
  // 「今日は誰と話す？」を毎回の起動時に1回だけ聞く（永続化しない）。選ぶまではガチャ画面を出さない。
  const [modeChosen, setModeChosen] = useState(false);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [categoryKey, setCategoryKey] = useState("omakase");
  const [history, setHistory] = useState<TopicDTO[]>([]);
  const [relatedChoices, setRelatedChoices] = useState<TopicDTO[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const party = usePartyMode();
  const isLoggedIn = useIsLoggedIn();
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likedIdsForLoginState, setLikedIdsForLoginState] = useState(isLoggedIn);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabScroll, setTabScroll] = useState({ left: false, right: false });

  // ログイン状態が切り替わったら、前のユーザーのいいね状態が一瞬でも見えないように同じレンダーで消す。
  if (isLoggedIn !== likedIdsForLoginState) {
    setLikedIdsForLoginState(isLoggedIn);
    setLikedIds(new Set());
  }

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
    return subscribeOfflineMode(setOffline);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchLikedTopics()
      .then((topics) => setLikedIds(new Set(topics.map((t) => t.id))))
      .catch(() => {});
  }, [isLoggedIn]);

  function updateTabScroll() {
    const el = tabsRef.current;
    if (!el) return;
    setTabScroll({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }

  useEffect(() => {
    updateTabScroll();
  }, [categories]);

  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLElement>(`[data-key="${categoryKey}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [categoryKey]);

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

  const canAiDeepen = current !== null && !current.hasDeeper && current.depth < 4 && isLoggedIn;
  // これ以上「深める」手段が無い状態（グラフ上の深め先が無く、AIでの深掘りも不可能な深度）。
  // この時は深めるボタンを非活性にし、代わりに「広げる」を目立たせる（企画書§5の分岐方針）。
  const maxedOut = current !== null && !current.hasDeeper && current.depth >= 4;

  function deepen() {
    if (!current) return;
    return withLoading(async () => {
      if (current.hasDeeper) {
        const topic = await fetchDeeperTopic(current.id);
        setHistory((prev) => [...prev, topic]);
        return;
      }
      if (canAiDeepen) {
        const topic = await aiDeepenTopic(current.id);
        setHistory((prev) => [...prev, topic]);
        return;
      }
      if (current.depth < 4 && !isLoggedIn) {
        throw new Error("ログインするとAIでさらに深められます。");
      }
      throw new Error("この話題にはこれ以上の深め方がありません。");
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

  function toggleLike(topic: TopicDTO) {
    const wasLiked = likedIds.has(topic.id);
    void toggleLikeWithRollback(
      topic.id,
      wasLiked,
      () =>
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.delete(topic.id);
          else next.add(topic.id);
          return next;
        }),
      () =>
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(topic.id);
          else next.delete(topic.id);
          return next;
        }),
    );
  }

  function pickRelated(topic: TopicDTO) {
    setHistory((prev) => [...prev, topic]);
    setRelatedChoices(null);
  }

  function widenSwipe() {
    if (!current) return;
    return withLoading(async () => {
      const topics = await fetchRelatedTopics(current.id);
      if (topics.length === 0) {
        throw new Error("この話題にはまだ広げる先がありません。");
      }
      setHistory((prev) => [...prev, topics[0]]);
    });
  }

  function selectCategory(key: string) {
    setCategoryKey(key);
    roll(key);
  }

  function chooseMode(key: string) {
    setModeChosen(true);
    selectCategory(key);
  }

  const actionProps = {
    onLighten: lighten,
    onDeepen: () => void deepen(),
    onWiden: () => void widen(),
    onReroll: () => void roll(),
    canLighten: history.length > 1,
    disabled: loading,
    deepenLabel: canAiDeepen ? "🤖 AIで深める" : "🔍 深める",
    deepenDisabled: maxedOut,
    widenHighlight: maxedOut,
  };

  if (!modeChosen) {
    return <RelationshipPicker onChoose={chooseMode} />;
  }

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
        <div>
          <h1 className="text-lg font-bold">🎲 ワダイ</h1>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">話題に困ったら、1回まわす。</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
          <Link href="/submit" className="underline-offset-2 hover:underline">
            ＋ 話題を送る
          </Link>
          {isLoggedIn && (
            <Link href="/mycard" className="underline-offset-2 hover:underline">
              ❤️ マイカード
            </Link>
          )}
          {isLoggedIn ? (
            <button type="button" onClick={() => void logoutUser()} className="underline-offset-2 hover:underline">
              ログアウト
            </button>
          ) : (
            <Link href="/login" className="underline-offset-2 hover:underline">
              🤖 ログイン
            </Link>
          )}
        </div>
      </header>

      {offline && (
        <div className="rounded-xl bg-amber-100 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200">
          📶 オフライン中：一部の話題のみ表示されます
        </div>
      )}

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

      <div className="relative">
        <div
          ref={tabsRef}
          onScroll={updateTabScroll}
          className="flex gap-2 overflow-x-auto scroll-smooth pb-1"
        >
          {categories.map((c) => {
            const active = categoryKey === c.key;
            const theme = categoryTheme(c.key);
            return (
              <button
                key={c.key}
                data-key={c.key}
                type="button"
                onClick={() => selectCategory(c.key)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? theme.activeTab
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                {categoryIcon(c.key)} {c.label}
              </button>
            );
          })}
        </div>
        {tabScroll.left && (
          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[var(--background)] to-transparent" />
        )}
        {tabScroll.right && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[var(--background)] to-transparent" />
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div
        className={`flex flex-1 flex-col justify-center gap-3 transition-opacity ${
          loading ? "opacity-50" : ""
        }`}
      >
        {history.length > 1 && (
          <div className="mx-auto -mb-6 w-11/12">
            <TopicCard key={history[history.length - 2].id} topic={history[history.length - 2]} faded />
          </div>
        )}
        {current ? (
          <TopicCard
            key={current.id}
            topic={current}
            liked={likedIds.has(current.id)}
            onToggleLike={isLoggedIn ? () => toggleLike(current) : undefined}
            onTapDeepen={() => void deepen()}
            onSwipeUp={() => void roll()}
            onSwipeSide={() => void widenSwipe()}
            swipeDisabled={loading}
          />
        ) : (
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            モードを選んで、🎲でスタート。
          </p>
        )}
        {current && (
          <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-600">
            🔁 交代しながら答えてみよう
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 pb-2">
        {current ? (
          <div className="flex gap-2">
            <ActionButtons {...actionProps} compact />
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
