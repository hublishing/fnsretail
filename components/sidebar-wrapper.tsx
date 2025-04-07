'use client'

import { Sidebar } from './sidebar'

export function SidebarWrapper() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {/* 메인 컨텐츠 */}
        </div>
      </div>
    </div>
  )
} 