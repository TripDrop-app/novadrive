"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) {
          router.replace(from.startsWith("/login") ? "/" : from);
          return;
        }
        setHasUsers(d.hasUsers === true);
      })
      .catch(() => setHasUsers(false));
  }, [router, from]);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.hint ?? t("auth.invalidCredentials"));
        return;
      }
      router.replace(from.startsWith("/login") ? "/" : from);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (hasUsers === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <p className="text-muted">{t("common.loading")}</p>
      </div>
    );
  }

  if (!hasUsers) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{t("app.name")}</h1>
        </div>
        <Card className="w-full max-w-sm space-y-3 text-center">
          <h2 className="text-lg font-semibold">{t("auth.notReadyTitle")}</h2>
          <p className="text-sm text-muted">{t("auth.notReadyHint")}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">{t("app.name")}</h1>
        <p className="text-sm text-muted">{t("app.subtitle")}</p>
      </div>

      <Card className="w-full max-w-sm space-y-4">
        <h2 className="text-lg font-semibold">{t("auth.loginTitle")}</h2>
        <p className="text-xs text-muted">{t("auth.inviteOnlyHint")}</p>

        <form onSubmit={submitLogin} className="space-y-3">
          <Input
            label={t("auth.username")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <Input
            label={t("auth.password")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? t("common.loading") : t("auth.loginBtn")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
