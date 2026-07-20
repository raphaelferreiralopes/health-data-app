import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TabNav } from "@/app/components/TabNav";
import { LogoMark } from "@/app/components/Logo";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "vitalis",
  description: "Kenn dich. Von innen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface font-sans text-ink">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-4 py-4 sm:px-6">
            <LogoMark className="h-6 w-6" />
            <span className="text-xl font-light tracking-tight text-ink">vitalis</span>
            <span className="hidden text-sm text-muted sm:inline">— Kenn dich. Von innen.</span>
          </div>
          <TabNav />
        </header>
        {children}
      </body>
    </html>
  );
}
