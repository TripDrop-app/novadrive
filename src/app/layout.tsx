import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Перална — Управување со перална",
  description: "Оперативен контролен панел за самопослужна перална",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Перална",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A6EFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mk">
      <body>{children}</body>
    </html>
  );
}
