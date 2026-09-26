"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCategories, submitTopic, type CategoryDTO } from "@/lib/api-client";

type Status = "idle" | "submitting" | "done" | "error";

export default function SubmitPage() {
  const [body, setBody] = useState("");
  const [categoryKey, setCategoryKey] = useState("");
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setMessage(null);
    try {
      const data = await submitTopic({ body, categoryKey: categoryKey || undefined });
      setStatus("done");
      setMessage(data.message);
      setBody("");
      setCategoryKey("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "送信に失敗しました。");
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center gap-2">
        <Link href="/" className="text-sm text-neutral-500 dark:text-neutral-400">
          ← 戻る
        </Link>
        <h1 className="text-lg font-bold">話題を送る</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          話題本文（200文字以内）
          <textarea
            required
            maxLength={200}
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="例：最近買ってよかったものは？"
            className="rounded-xl border border-black/10 bg-white p-3 text-base font-normal dark:border-white/10 dark:bg-neutral-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          カテゴリ（任意）
          <select
            value={categoryKey}
            onChange={(e) => setCategoryKey(e.target.value)}
            className="rounded-xl border border-black/10 bg-white p-3 text-base font-normal dark:border-white/10 dark:bg-neutral-900"
          >
            <option value="">未選択</option>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={status === "submitting" || body.trim().length === 0}
          className="rounded-2xl bg-neutral-900 py-3 text-base font-bold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
        >
          送信する
        </button>

        {message && (
          <p
            className={`text-sm ${
              status === "error" ? "text-red-600 dark:text-red-300" : "text-neutral-600 dark:text-neutral-300"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
