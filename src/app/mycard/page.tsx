"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TopicDTO } from "@/lib/topics";
import { fetchLikedTopics, fetchRandomLikedTopic, toggleLikeWithRollback } from "@/lib/user-api-client";
import { useIsLoggedIn } from "@/hooks/useUserSession";
import { TopicCard } from "@/components/TopicCard";

export default function MyCardPage() {
  const isLoggedIn = useIsLoggedIn();
  const [topics, setTopics] = useState<TopicDTO[]>([]);
  const [picked, setPicked] = useState<TopicDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchLikedTopics()
      .then(setTopics)
      .catch((e) => setError(e instanceof Error ? e.message : "読み込みに失敗しました。"));
  }, [isLoggedIn]);

  function removeLike(topic: TopicDTO) {
    void toggleLikeWithRollback(
      topic.id,
      true,
      () => {
        setTopics((prev) => prev.filter((t) => t.id !== topic.id));
        if (picked?.id === topic.id) setPicked(null);
      },
      () => setTopics((prev) => [topic, ...prev]),
    );
  }

  async function drawRandom() {
    setLoading(true);
    setError(null);
    try {
      setPicked(await fetchRandomLikedTopic());
    } catch (e) {
      setError(e instanceof Error ? e.message : "うまくいきませんでした。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
        <header className="flex items-center gap-2">
          <Link href="/" className="text-sm text-neutral-500 dark:text-neutral-400">
            ← 戻る
          </Link>
          <h1 className="text-lg font-bold">マイカード</h1>
        </header>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          ログインすると、いいねした話題をマイカードに集められます。
        </p>
        <Link href="/login" className="text-sm underline-offset-2 hover:underline">
          🤖 ログイン
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center gap-2">
        <Link href="/" className="text-sm text-neutral-500 dark:text-neutral-400">
          ← 戻る
        </Link>
        <h1 className="text-lg font-bold">❤️ マイカード</h1>
      </header>

      <button
        type="button"
        onClick={() => void drawRandom()}
        disabled={loading || topics.length === 0}
        className="w-full rounded-2xl bg-neutral-900 py-3 text-base font-bold text-white shadow-md active:scale-95 disabled:opacity-40 dark:bg-white dark:text-neutral-900"
      >
        🎲 マイカードから1枚引く
      </button>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {picked && (
        <TopicCard topic={picked} liked onToggleLike={() => removeLike(picked)} />
      )}

      {topics.length === 0 ? (
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          まだいいねした話題がありません。ガチャ画面のカードのハートを押すと、ここに集まります。
        </p>
      ) : (
        <div className="flex flex-col gap-3 pb-4">
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} liked onToggleLike={() => removeLike(topic)} />
          ))}
        </div>
      )}
    </div>
  );
}
