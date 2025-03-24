'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { signOut } from '../actions/auth'

export function SidebarWrapper() {
  const [isOpen, setIsOpen] = useState(true)
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 오류:', error)
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} />
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {/* 메인 컨텐츠 */}
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="fixed bottom-4 left-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
      >
        로그아웃
      </button>
    </div>
  )
} 