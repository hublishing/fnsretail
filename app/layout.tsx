import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SidebarWrapper } from "./components/sidebar-wrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FNS Retail",
  description: "FNS Retail Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <div className="flex h-screen bg-background">
          <SidebarWrapper />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
