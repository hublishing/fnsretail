'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { signOut, getSession } from '../actions/auth'

export function SidebarWrapper() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchUserEmail = async () => {
      const session = await getSession()
      if (session?.email) {
        setUserEmail(session.email)
      }
    }
    fetchUserEmail()
  }, [])

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
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {/* 메인 컨텐츠 */}
        </div>
      </div>
      <div className="fixed bottom-4 left-4 flex flex-col items-start gap-2">
        {userEmail && (
          <div className="text-sm text-gray-600">
            {userEmail}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="bg-black-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
} 