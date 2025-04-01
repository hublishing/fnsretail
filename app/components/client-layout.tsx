'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from "./sidebar"
import { cn } from "@/lib/utils"
import { useEffect, useState } from 'react'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/page/login'
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsCollapsed(window.innerWidth <= 1440)
    }

    // 초기 상태 설정
    handleResize()

    // 리사이즈 이벤트 리스너 등록
    window.addEventListener('resize', handleResize)

    // 클린업 함수
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="h-screen flex">
      {!isLoginPage && <Sidebar />}
      <main className={cn(
        "flex-1 overflow-y-auto",
        isLoginPage ? "w-full" : isCollapsed ? "pl-16" : ""
      )}>
        {children}
      </main>
    </div>
  )
} 