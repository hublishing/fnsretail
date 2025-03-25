import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutWrapper } from "./components/layout-wrapper";
import { Sidebar } from "./components/sidebar";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Project M",
  description: "FNS Retail Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-screen">
      <body className={cn(inter.className, "h-screen")}>
        <div className="flex h-screen">
          <div className="fixed inset-y-0 left-0 w-64 bg-gray-800">
            <Sidebar />
          </div>
          <main className="flex-1 ml-64 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
