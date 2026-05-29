import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
        <QueryProviders>{children}</QueryProviders>
      </body>
    </html>
  );
}
