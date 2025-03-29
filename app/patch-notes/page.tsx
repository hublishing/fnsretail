'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { getSession } from '@/app/actions/auth'
import { Trash2 } from 'lucide-react'

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
  const [isAdmin, setIsAdmin] = useState(false)
  const [newDate, setNewDate] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession()
      console.log('현재 세션:', session)
      setIsAdmin(session?.uid === 'a8mwwycqhaZLIb9iOcshPbpAVrj2')
      console.log('관리자 여부:', session?.uid === 'a8mwwycqhaZLIb9iOcshPbpAVrj2')
    }
    checkAuth()
  }, [])

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

  useEffect(() => {
    fetchPatchNotes()
  }, [])

  const handleDelete = async (commit_date: string, commit_title: string) => {
    if (!isAdmin) return

    if (!commit_date || !commit_title) {
      alert('삭제할 패치노트 정보가 올바르지 않습니다.')
      return
    }

    if (!confirm('이 패치노트를 삭제하시겠습니까?')) return

    try {
      const session = await getSession()
      const params = new URLSearchParams({
        commit_date,
        commit_title,
        uid: session?.user_id || ''
      })
      const response = await fetch(`/api/patch-notes?${params.toString()}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '패치노트 삭제에 실패했습니다.')
      }

      alert('패치노트가 삭제되었습니다.')
      fetchPatchNotes() // 목록 새로고침
    } catch (error) {
      alert(error instanceof Error ? error.message : '패치노트 삭제에 실패했습니다.')
    }
  }

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

  // 각 날짜별 패치노트를 작성 순서대로 정렬
  Object.keys(groupedPatchNotes).forEach(date => {
    groupedPatchNotes[date].sort((a, b) => {
      const dateA = new Date(a.updated_at)
      const dateB = new Date(b.updated_at)
      return dateB.getTime() - dateA.getTime()
    })
  })

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
                  <div className="space-y-4">
                    {groupedPatchNotes[selectedDate].map((note, index) => (
                      <div key={index} className="border-b pb-4 last:border-b-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{note.commit_title}</h3>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-muted-foreground"
                              onClick={() => handleDelete(note.commit_date, note.commit_title)}
                            >
                              ×
                            </Button>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-4 mb-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-base font-bold mt-4 mb-2" {...props} />,
                              p: ({node, ...props}) => <p className="my-2" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-4 my-2" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal pl-4 my-2" {...props} />,
                              li: ({node, ...props}) => <li className="my-1" {...props} />,
                              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-4 italic my-2" {...props} />,
                              code: ({node, ...props}: any) => props.inline ? 
                                <code className="bg-muted px-1 py-0.5 rounded" {...props} /> :
                                <code className="block bg-muted p-4 rounded-lg my-2" {...props} />
                            }}
                          >
                            {note.description}
                          </ReactMarkdown>
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