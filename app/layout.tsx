import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Ticket Radar / 票券釋票雷達",
  description: "Safe low-frequency ticket release monitoring dashboard.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Ticket Radar",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
