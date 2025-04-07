'use client'

import { usePathname } from 'next/navigation'
import { 
  Sidebar, 
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarInset
} from "./ui/sidebar"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/page/login'

  if (isLoginPage) {
    return <main className="h-screen">{children}</main>
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader title="Project M" />
        <SidebarContent>
          {/* 사이드바 내용 */}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}