'use client'

import { usePathname } from "next/navigation";
import { SidebarWrapper } from "./sidebar-wrapper";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <div className="flex min-h-screen">
      {!isLoginPage && <SidebarWrapper />}
      <main className={`flex-1 overflow-y-auto ${!isLoginPage ? 'ml-64' : ''}`}>
        {children}
      </main>
    </div>
  );
} 