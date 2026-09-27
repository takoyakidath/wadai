"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { adminLogout, getAdminToken, subscribeAdminUnauthorized } from "@/lib/admin-api-client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (isLoginPage) {
        setReady(true);
        return;
      }
      if (!getAdminToken()) {
        router.replace("/admin/login");
        return;
      }
      setReady(true);
    });
  }, [isLoginPage, router]);

  useEffect(() => {
    // トークンが期限切れ/無効になった場合、APIが401を返した時点で即ログイン画面へ戻す
    // （それまでは「ログインが必要です」というエラーだけが画面に残ってしまうため）
    return subscribeAdminUnauthorized(() => {
      if (!isLoginPage) router.replace("/admin/login");
    });
  }, [isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!ready) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between border-b border-black/10 pb-3 dark:border-white/10">
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/admin">申請キュー</Link>
          <Link href="/admin/topics">話題一覧</Link>
        </nav>
        <button
          type="button"
          onClick={async () => {
            await adminLogout();
            router.replace("/admin/login");
          }}
          className="text-sm text-neutral-500 dark:text-neutral-400"
        >
          ログアウト
        </button>
      </header>
      {children}
    </div>
  );
}
