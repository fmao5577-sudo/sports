import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SHEKO SPORTS",
    template: "%s · SHEKO SPORTS",
  },
  description: "Live football scores, current squads, verified transfers, injuries and real news.",
  applicationName: "SHEKO SPORTS",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: "SHEKO SPORTS",
    description: "A global football command center with live data, transfer verification and bilingual broadcast UI.",
    images: ["/og.jpg"],
  },
  appleWebApp: {
    capable: true,
    title: "SHEKO SPORTS",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#070b14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark">
      <body className="antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
