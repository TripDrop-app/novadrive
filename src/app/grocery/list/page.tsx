"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

interface ListItem {
  sessionItemId: string;
  name: string;
  emoji: string | null;
  inCart: boolean;
}

export default function GroceryListPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(() => {
    fetch("/api/grocery")
      .then((r) => r.json())
      .then((data) => {
        if (data.catalogEmpty) {
          router.replace("/grocery/catalog");
          return;
        }
        if (data.phase === "swiping") {
          router.replace("/grocery/swipe");
          return;
        }
        setSessionId(data.session.id);
        setItems(data.list);
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleCart(id: string, inCart: boolean) {
    await fetch(`/api/grocery/list/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inCart }),
    });
    setItems((prev) =>
      prev.map((i) => (i.sessionItemId === id ? { ...i, inCart } : i))
    );
  }

  async function removeItem(id: string) {
    if (!confirm(t("grocery.removeConfirm"))) return;
    await fetch(`/api/grocery/list/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remove: true }),
    });
    setItems((prev) => prev.filter((i) => i.sessionItemId !== id));
  }

  async function complete() {
    if (!sessionId) return;
    setCompleting(true);
    await fetch("/api/grocery/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    router.replace("/grocery/catalog");
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-muted">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col p-4 pb-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-emerald-900">{t("grocery.listTitle")}</h1>
        <Link href="/grocery/catalog" className="text-sm font-semibold text-emerald-700">
          ⚙️
        </Link>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="mb-4 text-muted">{t("grocery.listEmpty")}</p>
          <Button
            fullWidth
            className="max-w-xs bg-emerald-600 hover:bg-emerald-700"
            onClick={complete}
            disabled={completing}
          >
            {t("grocery.complete")}
          </Button>
        </div>
      ) : (
        <>
          <ul className="flex-1 space-y-3 pb-4">
            {items.map((item) => (
              <li
                key={item.sessionItemId}
                className={`flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm transition ${
                  item.inCart ? "border-emerald-300 bg-emerald-50/80 opacity-70" : "border-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleCart(item.sessionItemId, !item.inCart)}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 text-xl transition ${
                    item.inCart
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                  aria-label={t("grocery.inCart")}
                >
                  {item.inCart ? "✓" : ""}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-lg font-semibold ${item.inCart ? "line-through" : ""}`}>
                    {item.emoji && <span className="mr-2">{item.emoji}</span>}
                    {item.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.sessionItemId)}
                  className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  {t("grocery.remove")}
                </button>
              </li>
            ))}
          </ul>

          <Button
            fullWidth
            className="min-h-14 shrink-0 bg-emerald-600 text-lg hover:bg-emerald-700"
            onClick={complete}
            disabled={completing}
          >
            {t("grocery.complete")}
          </Button>
        </>
      )}
    </div>
  );
}
