import { BottomNav, DesktopNav } from "./bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50 md:flex">
      <DesktopNav />
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background md:mx-0 md:max-w-none md:flex-1">
        <header className="sticky top-0 z-40 border-b border-border bg-white/95 px-4 py-3 backdrop-blur md:px-8">
          <h1 className="text-lg font-bold text-primary md:hidden">Перална</h1>
          <p className="text-xs text-muted md:hidden">tripdrop.app</p>
          <p className="hidden text-sm font-semibold text-foreground md:block">Перална</p>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 pb-24 md:px-8 md:py-6 md:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
