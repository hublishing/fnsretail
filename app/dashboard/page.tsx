'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar } from 'lucide-react'
import { Input } from "@/components/ui/input"

// 데이터 타입 정의
interface CategorySalesData {
  category: string
  quantity: number
  revenue: number
}

interface ChannelSalesData {
  channel: string
  quantity: number
  revenue: number
}

export default function DashboardPage() {
  const today = new Date().toISOString().split('T')[0]; // 오늘 날짜를 YYYY-MM-DD 형식으로 가져옴
  
  // 어제 날짜 계산
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const [selectedDate, setSelectedDate] = useState(yesterdayStr);
  const [isLoading, setIsLoading] = useState(true);
  const [channelData, setChannelData] = useState<ChannelSalesData[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 데이터 로드 함수
  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('대시보드 데이터 로드 시작:', {
        date: selectedDate
      });
      
      // 채널별 판매 데이터 로드
      const channelRes = await fetch(
        `/api/dashboard/channel-sales?date=${selectedDate}`
      );
      
      const channelJson = await channelRes.json();
      
      if (!channelRes.ok) {
        console.error('채널 데이터 API 오류:', channelJson);
        throw new Error(`채널 데이터 로드 실패: ${channelJson.error || '알 수 없는 오류'}`);
      }
      
      console.log('채널 데이터 로드 성공:', {
        count: channelJson.data?.length || 0
      });
      
      // 응답 구조 변경: 직접 data 배열 사용
      setChannelData(channelJson.data || []);
    } catch (err: any) {
      console.error('데이터 로드 오류:', err);
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 초기 로드 및 날짜 변경 시 데이터 다시 로드
  useEffect(() => {
    loadDashboardData();
  }, [selectedDate]);

  // 날짜 필드 핸들러
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  // 날짜 퀵 선택 버튼 핸들러
  const handleQuickDateSelect = (period: 'today' | 'yesterday' | 'week' | 'month') => {
    const today = new Date();
    let targetDate = '';

    if (period === 'today') {
      targetDate = today.toISOString().split('T')[0];
    } else if (period === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      targetDate = yesterday.toISOString().split('T')[0];
    } else if (period === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      targetDate = weekAgo.toISOString().split('T')[0];
    } else if (period === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      targetDate = monthAgo.toISOString().split('T')[0];
    }
    
    setSelectedDate(targetDate);
  };

  return (
    <div className="container p-6 mx-auto">
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>
      
      {/* 날짜 필터 */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="w-40 bg-blue-50 border-blue-200 h-10"
            />
            <div className="flex gap-1 ml-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickDateSelect('today')}
                className="px-2 h-10 text-xs"
              >
                오늘
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickDateSelect('yesterday')}
                className="px-2 h-10 text-xs"
              >
                어제
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickDateSelect('week')}
                className="px-2 h-10 text-xs"
              >
                일주일 전
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickDateSelect('month')}
                className="px-2 h-10 text-xs"
              >
                한달 전
              </Button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-md border border-red-300">
          <p className="font-bold mb-1">오류 발생:</p>
          <p>{error}</p>
          <div className="mt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadDashboardData}
              className="text-xs"
            >
              다시 시도
            </Button>
          </div>
        </div>
      )}
      
      {/* 채널별 판매 데이터 표 */}
      <div className="grid grid-cols-1 gap-6">
        {/* 채널별 판매 데이터 */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">
              채널별 판매 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-4 text-center text-gray-500">데이터를 불러오는 중...</div>
            ) : channelData.length === 0 ? (
              <div className="py-4 text-center text-gray-500">데이터가 없습니다.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">채널</TableHead>
                    <TableHead className="text-right">판매수량</TableHead>
                    <TableHead className="text-right">매출액</TableHead>
                    <TableHead className="text-right">비중</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channelData.map((item) => {
                    // 전체 매출액 계산
                    const totalRevenue = channelData.reduce((sum, channel) => sum + channel.revenue, 0);
                    // 비중 계산 (소수점 2자리까지)
                    const percentage = ((item.revenue / totalRevenue) * 100).toFixed(2);
                    
                    return (
                      <TableRow key={item.channel}>
                        <TableCell className="font-medium">{item.channel}</TableCell>
                        <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{Math.round(item.revenue).toLocaleString()}원</TableCell>
                        <TableCell className="text-right">{percentage}%</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-gray-50">
                    <TableCell className="font-semibold">합계</TableCell>
                    <TableCell className="text-right font-semibold">
                      {channelData.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {Math.round(channelData.reduce((sum, item) => sum + item.revenue, 0)).toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-right font-semibold">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 