"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

interface SwipeItem {
  sessionItemId: string;
  itemId: string;
  name: string;
  emoji: string | null;
}

interface State {
  session: { id: string; phase: string };
  progress: { done: number; total: number };
  currentItem: SwipeItem | null;
}

const THRESHOLD = 90;

export default function GrocerySwipePage() {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const startX = useRef(0);
  const dragging = useRef(false);

  const load = useCallback(() => {
    fetch("/api/grocery")
      .then((r) => r.json())
      .then((data) => {
        if (data.catalogEmpty) {
          router.replace("/grocery/catalog");
          return;
        }
        if (data.phase === "shopping") {
          router.replace("/grocery/list");
          return;
        }
        setState({
          session: data.session,
          progress: data.progress,
          currentItem: data.currentItem,
        });
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(decision: "need" | "skip") {
    if (!state?.currentItem || animating) return;
    setAnimating(true);
    setOffset(decision === "need" ? 400 : -400);

    const res = await fetch("/api/grocery/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: state.session.id,
        sessionItemId: state.currentItem.sessionItemId,
        decision,
      }),
    });

    if (!res.ok) {
      setOffset(0);
      setAnimating(false);
      return;
    }

    const result = await res.json();
    setTimeout(() => {
      setOffset(0);
      setAnimating(false);
      if (result.phase === "shopping") {
        router.replace("/grocery/list");
      } else {
        setState({
          session: state.session,
          progress: result.progress,
          currentItem: result.next,
        });
      }
    }, 200);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (animating) return;
    dragging.current = true;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || animating) return;
    setOffset(e.clientX - startX.current);
  }

  function onPointerUp() {
    if (!dragging.current || animating) return;
    dragging.current = false;
    if (offset > THRESHOLD) decide("need");
    else if (offset < -THRESHOLD) decide("skip");
    else setOffset(0);
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-muted">{t("common.loading")}</p>
      </div>
    );
  }

  if (!state?.currentItem) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <p className="mb-4 text-lg font-semibold">{t("grocery.swipeDone")}</p>
        <Button onClick={() => router.push("/grocery/list")}>{t("grocery.goList")}</Button>
      </div>
    );
  }

  const item = state.currentItem;
  const rotate = offset * 0.05;
  const needOpacity = Math.min(1, Math.max(0, offset / THRESHOLD));
  const skipOpacity = Math.min(1, Math.max(0, -offset / THRESHOLD));

  return (
    <div className="flex min-h-dvh flex-col p-4 pb-8">
      <header className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-emerald-800">
          {state.progress.done + 1} / {state.progress.total}
        </span>
        <Link href="/grocery/catalog" className="text-sm font-semibold text-emerald-700">
          {t("grocery.catalog")} ⚙️
        </Link>
      </header>

      <p className="mb-6 text-center text-sm text-muted">{t("grocery.swipeHint")}</p>

      <div className="relative mx-auto flex flex-1 w-full max-w-sm items-center justify-center">
        <div
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 rounded-xl border-2 border-red-400 bg-red-50 px-4 py-2 text-lg font-bold text-red-600"
          style={{ opacity: skipOpacity }}
        >
          {t("grocery.skip")}
        </div>
        <div
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-xl border-2 border-emerald-500 bg-emerald-50 px-4 py-2 text-lg font-bold text-emerald-700"
          style={{ opacity: needOpacity }}
        >
          {t("grocery.buy")}
        </div>

        <div
          className="touch-none select-none w-full cursor-grab active:cursor-grabbing"
          style={{
            transform: `translateX(${offset}px) rotate(${rotate}deg)`,
            transition: animating || dragging.current ? "none" : "transform 0.2s ease-out",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="flex aspect-[3/4] flex-col items-center justify-center rounded-3xl bg-white p-8 shadow-xl ring-1 ring-emerald-100">
            {item.emoji && <span className="mb-4 text-7xl">{item.emoji}</span>}
            <h1 className="text-center text-3xl font-bold tracking-tight">{item.name}</h1>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Button
          variant="danger"
          fullWidth
          className="min-h-14 text-lg"
          onClick={() => decide("skip")}
          disabled={animating}
        >
          ← {t("grocery.skip")}
        </Button>
        <Button
          fullWidth
          className="min-h-14 bg-emerald-600 text-lg hover:bg-emerald-700"
          onClick={() => decide("need")}
          disabled={animating}
        >
          {t("grocery.buy")} →
        </Button>
      </div>
    </div>
  );
}
