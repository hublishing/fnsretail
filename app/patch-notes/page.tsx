'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'

interface PatchNote {
  commit_date: string
  commit_title: string
  description: string
  updated_at: string
}

export default function PatchNotesPage() {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPatchNotes = async () => {
      try {
        const response = await fetch('/api/patch-notes')
        if (!response.ok) {
          throw new Error('패치노트를 불러오는데 실패했습니다.')
        }
        const data = await response.json()
        setPatchNotes(data)
        // 가장 최근 날짜 선택
        if (data.length > 0) {
          setSelectedDate(data[0].commit_date)
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchPatchNotes()
  }, [])

  // 날짜별로 패치노트 그룹화
  const groupedPatchNotes = patchNotes.reduce((acc, note) => {
    const date = note.commit_date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(note)
    return acc
  }, {} as Record<string, PatchNote[]>)

  // 날짜 목록 (중복 제거)
  const dates = Object.keys(groupedPatchNotes).sort((a, b) => b.localeCompare(a))

  if (loading) {
    return <div className="p-4">로딩 중...</div>
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">패치노트</h1>
      <div className="grid grid-cols-12 gap-4">
        {/* 왼쪽: 날짜 목록 */}
        <div className="col-span-3">
          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-4">날짜</h2>
              <div className="space-y-2">
                {dates.map((date) => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`w-full text-left p-2 rounded ${
                      selectedDate === date
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {format(new Date(date), 'yyyy년 MM월 dd일', { locale: ko })}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽: 선택된 날짜의 패치노트 */}
        <div className="col-span-9">
          <Card>
            <CardContent className="p-4">
              {selectedDate ? (
                <div>
                  <h2 className="text-lg font-semibold mb-4">
                    {format(new Date(selectedDate), 'yyyy년 MM월 dd일', { locale: ko })}
                  </h2>
                  <div className="space-y-4">
                    {groupedPatchNotes[selectedDate].map((note, index) => (
                      <div key={index} className="border-b pb-4 last:border-b-0">
                        <h3 className="font-medium mb-2">{note.commit_title}</h3>
                        <div className="text-sm text-muted-foreground prose prose-sm max-w-none">
                          <ReactMarkdown>{note.description}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  날짜를 선택해주세요
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 