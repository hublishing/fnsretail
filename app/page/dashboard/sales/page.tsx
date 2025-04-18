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
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"

// 데이터 타입 정의
interface SalesData {
  type: 'channel' | 'category';
  name: string;
  quantity: number;
  revenue: number;
}

interface FilterData {
  category2: string[];
  category3: string[];
  channel: string[];
  country: string[];
  brand: string[];
  manager: string[];
}

export default function DashboardPage() {
  const today = new Date().toISOString().split('T')[0]; // 오늘 날짜를 YYYY-MM-DD 형식으로 가져옴
  
  // 어제 날짜 계산
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(yesterdayStr);
  const [endDate, setEndDate] = useState(yesterdayStr);
  const [isLoading, setIsLoading] = useState(true);
  const [channelData, setChannelData] = useState<SalesData[]>([]);
  const [categoryData, setCategoryData] = useState<SalesData[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 필터 상태
  const [filterData, setFilterData] = useState<FilterData>({
    category2: [],
    category3: [],
    channel: [],
    country: [],
    brand: [],
    manager: []
  });
  const [selectedCategory2, setSelectedCategory2] = useState<string>('');
  const [selectedCategory3, setSelectedCategory3] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedManager, setSelectedManager] = useState<string>('');

  // 초기화 핸들러
  const handleReset = async () => {
    setIsLoading(true);
    try {
      // 날짜 초기화 (어제 날짜로)
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
      
      // 필터 초기화
      setSelectedCategory2('');
      setSelectedCategory3('');
      setSelectedChannel('');
      setSelectedCountry('');
      setSelectedBrand('');
      setSelectedManager('');
      
      // 데이터 초기화
      const params = new URLSearchParams();
      params.append('startDate', yesterdayStr);
      params.append('endDate', yesterdayStr);
      
      // 필터 데이터 로드
      const filterRes = await fetch(`/api/dashboard/filters?${params.toString()}`);
      const filterData = await filterRes.json();
      setFilterData(filterData);
      
      // 대시보드 데이터 로드
      const response = await fetch(`/api/dashboard/channel-sales?${params.toString()}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setChannelData(data.channelData || []);
      setCategoryData(data.categoryData || []);
    } catch (err: any) {
      console.error('초기화 오류:', err);
      setError(err.message || '초기화 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 데이터 로드 함수
  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      
      // 판매 데이터 로드
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      if (selectedCategory2) params.append('category2', selectedCategory2);
      if (selectedCategory3) params.append('category3', selectedCategory3);
      if (selectedChannel) params.append('channel', selectedChannel);
      if (selectedCountry) params.append('country', selectedCountry);
      
      const response = await fetch(`/api/dashboard/channel-sales?${params.toString()}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      } 
      
      setChannelData(data.channelData || []);
      setCategoryData(data.categoryData || []);
    } catch (err: any) {
      console.error('데이터 로드 오류:', err);
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 초기 로드 및 날짜 변경 시 데이터 다시 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 필터 데이터 로드
        const filterParams = new URLSearchParams();
        filterParams.append('startDate', startDate);
        filterParams.append('endDate', endDate);
        const filterRes = await fetch(`/api/dashboard/filters?${filterParams.toString()}`);
        const filterData = await filterRes.json();
        setFilterData(filterData);
        
        // 대시보드 데이터 로드
        const params = new URLSearchParams();
        params.append('startDate', startDate);
        params.append('endDate', endDate);
        if (selectedCategory2) params.append('category2', selectedCategory2);
        if (selectedCategory3) params.append('category3', selectedCategory3);
        if (selectedChannel) params.append('channel', selectedChannel);
        if (selectedCountry) params.append('country', selectedCountry);
        if (selectedBrand) params.append('brand', selectedBrand);
        if (selectedManager) params.append('manager', selectedManager);
        
        const response = await fetch(`/api/dashboard/channel-sales?${params.toString()}`);
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setChannelData(data.channelData || []);
        setCategoryData(data.categoryData || []);
      } catch (err: any) {
        console.error('데이터 로드 오류:', err);
        setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [startDate, endDate, selectedCategory2, selectedCategory3, selectedChannel, selectedCountry, selectedBrand, selectedManager]);

  // 필터 선택 핸들러
  const handleCountryChange = async (value: string) => {
    setIsLoading(true);
    try {
      // 상태 업데이트 - 국가 선택 시 다른 필터 초기화
      setSelectedCountry(value);
      setSelectedCategory2('');
      setSelectedCategory3('');
      setSelectedChannel('');
      setSelectedBrand('');
      setSelectedManager('');
      
      // 필터 데이터 로드
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      if (value) params.append('country', value);
      const res = await fetch(`/api/dashboard/filters?${params.toString()}`);
      const filterData = await res.json();
      setFilterData(filterData);
      
      // 대시보드 데이터 로드
      const dashboardParams = new URLSearchParams();
      dashboardParams.append('startDate', startDate);
      dashboardParams.append('endDate', endDate);
      if (value) dashboardParams.append('country', value);
      
      const response = await fetch(`/api/dashboard/channel-sales?${dashboardParams.toString()}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setChannelData(data.channelData || []);
      setCategoryData(data.categoryData || []);
    } catch (err: any) {
      console.error('데이터 로드 오류:', err);
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrandChange = async (value: string) => {
    setIsLoading(true);
    try {
      // 상태 업데이트 - 브랜드 선택 시 다른 필터 초기화
      setSelectedBrand(value);
      setSelectedCountry('');
      setSelectedCategory2('');
      setSelectedCategory3('');
      setSelectedChannel('');
      setSelectedManager('');
      
      // 필터 데이터 로드
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      if (value) params.append('brand', value);
      const res = await fetch(`/api/dashboard/filters?${params.toString()}`);
      const filterData = await res.json();
      setFilterData(filterData);
      
      // 대시보드 데이터 로드
      const dashboardParams = new URLSearchParams();
      dashboardParams.append('startDate', startDate);
      dashboardParams.append('endDate', endDate);
      if (value) dashboardParams.append('brand', value);
      
      const response = await fetch(`/api/dashboard/channel-sales?${dashboardParams.toString()}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setChannelData(data.channelData || []);
      setCategoryData(data.categoryData || []);
    } catch (err: any) {
      console.error('데이터 로드 오류:', err);
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategory2Change = async (value: string) => {
    setIsLoading(true);
    try {
      // 상태 업데이트
      setSelectedCategory2(value);
      setSelectedCategory3('');
      setSelectedChannel('');
      
      // 필터 데이터 로드
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      if (selectedCountry) params.append('country', selectedCountry);
      if (selectedBrand) params.append('brand', selectedBrand);
      if (value) params.append('category2', value);
      const res = await fetch(`/api/dashboard/filters?${params.toString()}`);
      const filterData = await res.json();
      setFilterData(filterData);
      
      // 대시보드 데이터 로드
      const dashboardParams = new URLSearchParams();
      dashboardParams.append('startDate', startDate);
      dashboardParams.append('endDate', endDate);
      if (selectedCountry) dashboardParams.append('country', selectedCountry);
      if (selectedBrand) dashboardParams.append('brand', selectedBrand);
      if (value) dashboardParams.append('category2', value);
      
      const response = await fetch(`/api/dashboard/channel-sales?${dashboardParams.toString()}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setChannelData(data.channelData || []);
      setCategoryData(data.categoryData || []);
    } catch (err: any) {
      console.error('데이터 로드 오류:', err);
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategory3Change = async (value: string) => {
    setIsLoading(true);
    try {
      // 상태 업데이트
      setSelectedCategory3(value);
      setSelectedChannel('');
      
      // 필터 데이터 로드
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      if (selectedCountry) params.append('country', selectedCountry);
      if (selectedBrand) params.append('brand', selectedBrand);
      if (selectedCategory2) params.append('category2', selectedCategory2);
      if (value) params.append('category3', value);
      const res = await fetch(`/api/dashboard/filters?${params.toString()}`);
      const filterData = await res.json();
      setFilterData(filterData);
      
      // 대시보드 데이터 로드
      const dashboardParams = new URLSearchParams();
      dashboardParams.append('startDate', startDate);
      dashboardParams.append('endDate', endDate);
      if (selectedCountry) dashboardParams.append('country', selectedCountry);
      if (selectedBrand) dashboardParams.append('brand', selectedBrand);
      if (selectedCategory2) dashboardParams.append('category2', selectedCategory2);
      if (value) dashboardParams.append('category3', value);
      
      const response = await fetch(`/api/dashboard/channel-sales?${dashboardParams.toString()}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setChannelData(data.channelData || []);
      setCategoryData(data.categoryData || []);
    } catch (err: any) {
      console.error('데이터 로드 오류:', err);
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChannelChange = async (value: string) => {
    setIsLoading(true);
    try {
      // 상태 업데이트
      setSelectedChannel(value);
      
      // 대시보드 데이터 로드
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      if (selectedCountry) params.append('country', selectedCountry);
      if (selectedCategory2) params.append('category2', selectedCategory2);
      if (selectedCategory3) params.append('category3', selectedCategory3);
      if (value) params.append('channel', value);
      
      const response = await fetch(`/api/dashboard/channel-sales?${params.toString()}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setChannelData(data.channelData || []);
      setCategoryData(data.categoryData || []);
    } catch (err: any) {
      console.error('데이터 로드 오류:', err);
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManagerChange = async (value: string) => {
    setIsLoading(true);
    try {
      // 상태 업데이트
      setSelectedManager(value);
      
      // 대시보드 데이터 로드
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      if (selectedCountry) params.append('country', selectedCountry);
      if (selectedCategory2) params.append('category2', selectedCategory2);
      if (selectedCategory3) params.append('category3', selectedCategory3);
      if (selectedChannel) params.append('channel', selectedChannel);
      if (selectedBrand) params.append('brand', selectedBrand);
      if (value) params.append('manager', value);
      
      const response = await fetch(`/api/dashboard/channel-sales?${params.toString()}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setChannelData(data.channelData || []);
      setCategoryData(data.categoryData || []);
    } catch (err: any) {
      console.error('데이터 로드 오류:', err);
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 날짜 선택 핸들러 수정
  const handleDateSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      setStartDate(format(range.from, 'yyyy-MM-dd'));
    }
    if (range?.to) {
      setEndDate(format(range.to, 'yyyy-MM-dd'));
    }
  };

  // 날짜 퀵 선택 버튼 핸들러
  const handleQuickDateSelect = (period: 'today' | 'yesterday' | 'week' | 'month') => {
    const today = new Date();
    let targetStartDate = '';
    let targetEndDate = '';

    if (period === 'today') {
      targetStartDate = today.toISOString().split('T')[0];
      targetEndDate = targetStartDate;
    } else if (period === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      targetStartDate = yesterday.toISOString().split('T')[0];
      targetEndDate = targetStartDate;
    } else if (period === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      targetStartDate = weekAgo.toISOString().split('T')[0];
      targetEndDate = today.toISOString().split('T')[0];
    } else if (period === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      targetStartDate = monthAgo.toISOString().split('T')[0];
      targetEndDate = today.toISOString().split('T')[0];
    }
    
    setStartDate(targetStartDate);
    setEndDate(targetEndDate);
  };

  return (
    <div className="container mx-auto py-5">
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>
      
      {/* 날짜 필터 */}
      <div className="mb-6 py-5 px-5 bg-card rounded-lg shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {startDate && endDate ? (
                    <>
                      {format(new Date(startDate), 'PPP', { locale: ko })} -{" "}
                      {format(new Date(endDate), 'PPP', { locale: ko })}
                    </>
                  ) : (
                    <span>날짜 선택</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  defaultMonth={new Date(startDate)}
                  selected={{ from: new Date(startDate), to: new Date(endDate) }}
                  onSelect={handleDateSelect}
                  locale={ko}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
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
            </div>
            </div>
            <div className="flex gap-2">
            <Select value={selectedBrand} onValueChange={handleBrandChange}>
                <SelectTrigger className={`w-[150px] ${selectedBrand ? 'border-blue-500 text-blue-700 dark:text-blue-300' : ''}`}>
                  <SelectValue placeholder="브랜드 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(filterData?.brand || [])
                    .filter(value => value && value !== 'nan')
                    .map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            <div className="flex gap-2 ml-4">
              <Select value={selectedCountry} onValueChange={handleCountryChange}>
                <SelectTrigger className={`w-[150px] ${selectedCountry ? 'border-blue-500 text-blue-700 dark:text-blue-300' : ''}`}>
                  <SelectValue placeholder="국가 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(filterData?.country || [])
                    .filter(value => value && value !== 'nan')
                    .map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={selectedCategory2} onValueChange={handleCategory2Change}>
                <SelectTrigger className={`w-[150px] ${selectedCategory2 ? 'border-blue-500 text-blue-700 dark:text-blue-300' : ''}`}>
                  <SelectValue placeholder="구분 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(filterData?.category2 || [])
                    .filter(value => value && value !== 'nan')
                    .map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={selectedCategory3} onValueChange={handleCategory3Change}>
                <SelectTrigger className={`w-[150px] ${selectedCategory3 ? 'border-blue-500 text-blue-700 dark:text-blue-300' : ''}`}>
                  <SelectValue placeholder="분류 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(filterData?.category3 || [])
                    .filter(value => value && value !== 'nan')
                    .map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={selectedChannel} onValueChange={handleChannelChange}>
                <SelectTrigger className={`w-[150px] ${selectedChannel ? 'border-blue-500 text-blue-700 dark:text-blue-300' : ''}`}>
                  <SelectValue placeholder="채널 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(filterData?.channel || [])
                    .filter(value => value && value !== 'nan')
                    .map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={selectedManager} onValueChange={handleManagerChange}>
                <SelectTrigger className={`w-[150px] ${selectedManager ? 'border-blue-500 text-blue-700 dark:text-blue-300' : ''}`}>
                  <SelectValue placeholder="매니저 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(filterData?.manager || [])
                    .filter(value => value && value !== 'nan')
                    .map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleReset}
                className="h-10 px-4 text-sm"
              >
                초기화
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
      
      {/* 판매 데이터 표 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 채널별 판매 데이터 */}
        <Card className="">
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
                      <TableRow key={item.name}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{Math.round(item.revenue).toLocaleString()}원</TableCell>
                        <TableCell className="text-right">{percentage}%</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted">
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

        {/* 카테고리별 판매 데이터 */}
        <Card className="">
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
                    <TableHead className="w-1/3">카테고리</TableHead>
                    <TableHead className="text-right">판매수량</TableHead>
                    <TableHead className="text-right">매출액</TableHead>
                    <TableHead className="text-right">비중</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryData.map((item) => {
                    // 전체 매출액 계산
                    const totalRevenue = categoryData.reduce((sum, category) => sum + category.revenue, 0);
                    // 비중 계산 (소수점 2자리까지)
                    const percentage = ((item.revenue / totalRevenue) * 100).toFixed(2);
                    
                    return (
                      <TableRow key={item.name}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{Math.round(item.revenue).toLocaleString()}원</TableCell>
                        <TableCell className="text-right">{percentage}%</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted">
                    <TableCell className="font-semibold">합계</TableCell>
                    <TableCell className="text-right font-semibold">
                      {categoryData.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {Math.round(categoryData.reduce((sum, item) => sum + item.revenue, 0)).toLocaleString()}원
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