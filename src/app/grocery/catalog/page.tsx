"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";

interface CatalogItem {
  id: string;
  name: string;
  emoji: string | null;
}

export default function GroceryCatalogPage() {
  const router = useRouter();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/grocery/catalog")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addItem() {
    if (!name.trim()) return;
    const res = await fetch("/api/grocery/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), emoji: emoji.trim() || undefined }),
    });
    if (res.ok) {
      setName("");
      setEmoji("");
      load();
    }
  }

  async function deleteItem(id: string) {
    if (!confirm(t("grocery.deleteItemConfirm"))) return;
    await fetch(`/api/grocery/catalog/${id}`, { method: "DELETE" });
    load();
  }

  async function startShopping() {
    if (items.length === 0) return;
    await fetch("/api/grocery/session?action=restart", { method: "POST" });
    router.push("/grocery/swipe");
  }

  return (
    <div className="flex min-h-dvh flex-col p-4 pb-8">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-emerald-900">{t("grocery.catalogTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("grocery.catalogHint")}</p>
      </header>

      <div className="mb-6 space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-emerald-100">
        <div className="grid grid-cols-[5rem_1fr] gap-2">
          <Input
            label={t("grocery.emojiOptional")}
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="🍌"
          />
          <Input
            label={t("grocery.itemName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("grocery.itemPlaceholder")}
          />
        </div>
        <Button
          fullWidth
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={addItem}
        >
          {t("grocery.addItem")}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-center text-muted">{t("grocery.catalogEmpty")}</p>
      ) : (
        <ul className="mb-6 flex-1 divide-y divide-border rounded-2xl bg-white shadow-sm ring-1 ring-emerald-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-lg font-medium">
                {item.emoji && <span className="mr-2">{item.emoji}</span>}
                {item.name}
              </span>
              <button
                type="button"
                onClick={() => deleteItem(item.id)}
                className="text-sm text-red-600"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <Button
          fullWidth
          className="min-h-14 bg-emerald-600 text-lg hover:bg-emerald-700"
          onClick={startShopping}
        >
          {t("grocery.startSwipe")}
        </Button>
      )}

      <Link
        href="/grocery"
        className="mt-4 block text-center text-sm text-emerald-700 underline"
      >
        {t("grocery.back")}
      </Link>
    </div>
  );
}
