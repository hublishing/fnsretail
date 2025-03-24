'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from './actions/auth'

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession()
        if (!session) {
          router.push('/login')
        }
      } catch (error) {
        console.error('인증 확인 오류:', error)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return null // 로딩 중에는 아무것도 표시하지 않음
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-8">FNS Retail에 오신 것을 환영합니다</h1>
      <p className="text-xl text-gray-600">시스템을 이용하시려면 사이드바의 메뉴를 선택해주세요.</p>
    </div>
  )
}

