'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from "./sidebar"
import { cn } from "@/lib/utils"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  return (
    <div className="h-screen flex">
      {!isLoginPage && <Sidebar />}
      <main className={cn(
        "flex-1 overflow-y-auto",
        isLoginPage ? "w-full" : ""
      )}>
        {children}
      </main>
    </div>
  )
} 