import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-background pb-24">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold text-primary">Перална</h1>
        <p className="text-xs text-muted">tripdrop.app</p>
      </header>
      <main className="px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
