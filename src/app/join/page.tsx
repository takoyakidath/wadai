"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { registerUser } from "@/lib/user-api-client";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inviteToken, setInviteToken] = useState(searchParams.get("invite") ?? "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await registerUser(inviteToken, username, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        required
        placeholder="招待コード"
        value={inviteToken}
        onChange={(e) => setInviteToken(e.target.value)}
        className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-neutral-900"
      />
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
        placeholder="パスワード（8文字以上）"
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-neutral-900"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-neutral-900 py-3 font-bold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
      >
        登録する
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
    </form>
  );
}

export default function JoinPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 p-4">
      <Link href="/" className="text-sm text-neutral-500 dark:text-neutral-400">
        ← 戻る
      </Link>
      <h1 className="text-lg font-bold">招待コードで登録</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        登録すると、話題が尽きたときにAIでもっと深められます。
      </p>
      <Suspense fallback={null}>
        <JoinForm />
      </Suspense>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        すでに登録済みの方は <Link href="/login" className="underline">こちら</Link>
      </p>
    </div>
  );
}
