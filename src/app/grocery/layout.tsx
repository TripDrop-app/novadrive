import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Намирници",
  description: "Листа за купување",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#059669",
};

export default function GroceryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-emerald-50 to-white text-foreground">
      <div className="mx-auto min-h-dvh max-w-lg">{children}</div>
    </div>
  );
}
