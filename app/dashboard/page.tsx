'use client'

import { useEffect, useState } from 'react'
import { getSession } from '../actions/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function DashboardPage() {
  const [user, setUser] = useState<{ email: string | undefined } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const session = await getSession()
        if (session) {
          setUser({ email: session.email })
        }
      } catch (error) {
        console.error('사용자 정보 로드 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [])

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">로딩 중...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>접속 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <p>이메일: {user?.email || '로그인 필요'}</p>
            <p>마지막 접속: {new Date().toLocaleString('ko-KR')}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
          </CardHeader>
          <CardContent>
            <p>아직 활동 내역이 없습니다.</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>빠른 링크</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li><a href="/dynamic-table" className="text-blue-600 hover:underline">상품 검색</a></li>
              <li><a href="/cart" className="text-blue-600 hover:underline">담은 상품</a></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 