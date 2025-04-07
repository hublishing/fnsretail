'use client'

import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <div className="flex min-h-screen">
      {!isLoginPage && <AppSidebar />}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
} 