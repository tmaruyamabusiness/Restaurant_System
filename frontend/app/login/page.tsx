"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

const DEMO_ACCOUNTS = [
  { label: "👑 オーナー", email: "admin@example.com", password: "admin123" },
  { label: "📋 マネージャー", email: "manager@example.com", password: "manager123" },
  { label: "🙋 スタッフ", email: "staff@example.com", password: "staff123" },
];

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async (em: string, pw: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.login({ email: em, password: pw });
      setAuth(res.user, res.access_token);
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    doLogin(email, password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="text-center text-xl font-bold text-gray-900">🍽 店舗管理システム</h1>
        <p className="mb-6 mt-1 text-center text-sm text-gray-500">レストランOMS にログイン</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            id="email"
            type="email"
            label="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Input
            id="password"
            type="password"
            label="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "ログイン中..." : "ログイン"}
          </Button>
        </form>

        <div className="mt-6 border-t border-dashed border-gray-200 pt-5">
          <p className="mb-3 text-center text-xs text-gray-400">― デモアカウントでログイン ―</p>
          <div className="flex gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                disabled={loading}
                onClick={() => doLogin(a.email, a.password)}
                className="min-h-[44px] flex-1 rounded-lg border border-gray-300 bg-gray-50 px-1 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
