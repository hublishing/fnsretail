"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { getSession } from '@/app/actions/auth'

interface PatchInfoFormData {
  commit_date: string
  commit_title: string
  description: string
}

export default function PatchInfoPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<PatchInfoFormData>({
    commit_date: '',
    commit_title: '',
    description: ''
  })

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession()
      if (!session || session.uid !== 'a8mwwycqhaZLIb9iOcshPbpAVrj2') {
        router.push('/')
        return
      }
      setIsLoading(false)
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const response = await fetch('/api/patch-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || '패치정보 저장에 실패했습니다.')
      }

      alert('패치정보가 저장되었습니다.')
      router.push('/patch-notes')
    } catch (error: any) {
      setError(error.message)
      console.error('패치정보 저장 오류:', error)
    }
  }

  if (isLoading) {
    return <div className="p-4">로딩 중...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">패치정보 입력</h1>
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">커밋 날짜</label>
              <Input
                type="date"
                value={formData.commit_date}
                onChange={(e) => setFormData({ ...formData, commit_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">커밋 제목</label>
              <Input
                type="text"
                value={formData.commit_title}
                onChange={(e) => setFormData({ ...formData, commit_title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">설명</label>
              <Input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            <Button type="submit">저장</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 