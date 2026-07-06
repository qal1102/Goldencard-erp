import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { QueryProviders } from "@/lib/query/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GoldenCard ERP",
  description: "Hệ thống ERP nội bộ cho GoldenCard",
  manifest: "/manifest.webmanifest",
  applicationName: "GoldenCard ERP",
  appleWebApp: {
    capable: true,
    title: "GoldenCard ERP",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/goldencard-app-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/goldencard-app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/goldencard-app-icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <PwaRegister />
        <QueryProviders>{children}</QueryProviders>
      </body>
    </html>
  );
}
