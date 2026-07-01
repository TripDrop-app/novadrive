"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";

export default function GroceryHome() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/grocery")
      .then((r) => r.json())
      .then((state) => {
        if (state.catalogEmpty) {
          router.replace("/grocery/catalog");
          return;
        }
        if (state.phase === "shopping") {
          router.replace("/grocery/list");
          return;
        }
        router.replace("/grocery/swipe");
      })
      .catch(() => router.replace("/grocery/catalog"));
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="text-muted">{t("common.loading")}</p>
    </div>
  );
}
