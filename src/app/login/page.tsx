"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/user-api-client";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginUser(username, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 p-4">
      <Link href="/" className="text-sm text-neutral-500 dark:text-neutral-400">
        ← 戻る
      </Link>
      <h1 className="text-lg font-bold">ログイン</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        ログインすると、話題が尽きたときにAIでもっと深められます。
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          required
          placeholder="ユーザー名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-neutral-900"
        />
        <input
          required
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-neutral-900 py-3 font-bold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
        >
          ログイン
        </button>
        {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
      </form>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        招待コードをお持ちの方は <Link href="/join" className="underline">こちら</Link>
      </p>
    </div>
  );
}
