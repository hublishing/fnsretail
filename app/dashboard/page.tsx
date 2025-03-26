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
  
  // 1년 전 날짜 계산
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
  
  const [dateRange, setDateRange] = useState({
    startDate: yesterdayStr, // 기본값을 어제로 변경
    endDate: yesterdayStr    // 기본값을 어제로 변경
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<CategorySalesData[]>([]);
  const [channelData, setChannelData] = useState<ChannelSalesData[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 데이터 로드 함수
  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('대시보드 데이터 로드 시작:', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      // 카테고리별 판매 데이터 로드
      const categoryRes = await fetch(
        `/api/dashboard/category-sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      
      const categoryJson = await categoryRes.json();
      
      if (!categoryRes.ok) {
        console.error('카테고리 데이터 API 오류:', categoryJson);
        throw new Error(`카테고리 데이터 로드 실패: ${categoryJson.error || '알 수 없는 오류'}`);
      }
      
      console.log('카테고리 데이터 로드 성공:', {
        count: categoryJson.data?.length || 0
      });
      
      // 응답 구조 변경: 직접 data 배열 사용
      setCategoryData(categoryJson.data || []);
      
      // 채널별 판매 데이터 로드
      const channelRes = await fetch(
        `/api/dashboard/channel-sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
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
  }, [dateRange.startDate, dateRange.endDate]);

  // 날짜 필드 핸들러
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'startDate' | 'endDate') => {
    setDateRange({
      ...dateRange,
      [field]: e.target.value
    });
  };

  // 날짜 퀵 선택 버튼 핸들러
  const handleQuickDateSelect = (period: 'week' | 'month' | 'all') => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0]; // 오늘 날짜 YYYY-MM-DD 형식

    let startDate = '';

    if (period === 'week') {
      // 1주일 전
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      startDate = weekAgo.toISOString().split('T')[0];
    } else if (period === 'month') {
      // 1달 전
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      startDate = monthAgo.toISOString().split('T')[0];
    }
    
    setDateRange({
      startDate: startDate,
      endDate: period === 'all' ? '' : endDate
    });
  };

  return (
    <div className="container p-6 mx-auto">
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>
      
      {/* 기간 필터 */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateRange.startDate || ''}
              onChange={(e) => handleDateChange(e, 'startDate')}
              className={`w-40 ${dateRange.startDate ? 'bg-blue-50 border-blue-200' : ''} h-10`}
            />
            <span>-</span>
            <Input
              type="date"
              value={dateRange.endDate || ''}
              onChange={(e) => handleDateChange(e, 'endDate')}
              className={`w-40 ${dateRange.endDate ? 'bg-blue-50 border-blue-200' : ''} h-10`}
            />
            <div className="flex gap-1 ml-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickDateSelect('week')}
                className="px-2 h-10 text-xs"
              >
                일주일
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickDateSelect('month')}
                className="px-2 h-10 text-xs"
              >
                한달
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickDateSelect('all')}
                className="px-2 h-10 text-xs"
              >
                전체
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
      
      {/* 카테고리별/채널별 판매 데이터 표 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 카테고리별 판매 데이터 */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">
              카테고리별 판매 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-4 text-center text-gray-500">데이터를 불러오는 중...</div>
            ) : categoryData.length === 0 ? (
              <div className="py-4 text-center text-gray-500">데이터가 없습니다.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/2">카테고리</TableHead>
                    <TableHead className="text-right">판매수량</TableHead>
                    <TableHead className="text-right">매출액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryData.map((item) => (
                    <TableRow key={item.category}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Math.round(item.revenue).toLocaleString()}원</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50">
                    <TableCell className="font-semibold">합계</TableCell>
                    <TableCell className="text-right font-semibold">
                      {categoryData.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {Math.round(categoryData.reduce((sum, item) => sum + item.revenue, 0)).toLocaleString()}원
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
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
                    <TableHead className="w-1/2">채널</TableHead>
                    <TableHead className="text-right">판매수량</TableHead>
                    <TableHead className="text-right">매출액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channelData.map((item) => (
                    <TableRow key={item.channel}>
                      <TableCell className="font-medium">{item.channel}</TableCell>
                      <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Math.round(item.revenue).toLocaleString()}원</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50">
                    <TableCell className="font-semibold">합계</TableCell>
                    <TableCell className="text-right font-semibold">
                      {channelData.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {Math.round(channelData.reduce((sum, item) => sum + item.revenue, 0)).toLocaleString()}원
                    </TableCell>
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