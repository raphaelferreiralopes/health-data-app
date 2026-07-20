import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TabNav } from "@/app/components/TabNav";
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
  title: "Gesundheitswerte",
  description: "Übersicht deiner Laborwerte, Allergietests und Befunde",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
            <h1 className="text-lg font-semibold text-slate-900">Gesundheitswerte</h1>
          </div>
          <TabNav />
        </header>
        {children}
      </body>
    </html>
  );
}
