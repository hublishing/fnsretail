'use client'

import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { usePathname } from 'next/navigation'

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/page/login'

  if (isLoginPage) {
    return (
      <main className="h-full">
        {children}
      </main>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <header className="bg-background sticky inset-x-0 top-0 isolate z-10 flex shrink-0 items-center gap-2 border-b" style={{ "--header-height": "56px" } as React.CSSProperties}>
          <div className="flex h-14 w-full items-center gap-2 px-4">
            <SidebarTrigger />
          </div>
        </header>
        <div className="bg-muted/50 min-h-[calc(100vh-var(--header-height))]"> 
            {children} 
        </div>
      </main>
    </SidebarProvider>
  )
}