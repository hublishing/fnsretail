import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ClientLayout } from "@/components/client-layout"

export const metadata: Metadata = {
  title: "Project M",
  description: "FNS Retail Management System",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="h-screen" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" href="/favicon.ico" sizes="16x16" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body className={cn("h-screen")}>
        <ClientLayout>
            <div className="grid flex-1 gap-4 p-4 w-full mx-auto">
              {children}
            </div>
        </ClientLayout>
      </body>
    </html>
  );
} 