import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ClientLayout } from "./components/client-layout";

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
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
} 