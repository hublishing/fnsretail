'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'

export function SidebarWrapper() {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return null
  }

  return <Sidebar />
} 