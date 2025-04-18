"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar as CalendarIcon, TrendingUp, TrendingDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DateRange } from 'react-day-picker'
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { CustomTooltip } from "@/components/ui/chart-tooltip"

// 파이 차트 색상
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#663399', '#FF6347', '#4682B4', '#DA70D6', '#32CD32'];

// 필터 인터페이스
interface Filters {
  brand_group: string | null;
  team: string | null;
  channel_category_2: string | null;
  channel_category_3: string | null;
  channel_name: string | null;
  manager: string | null;
  dateRange: DateRange | undefined;
}

// 데이터 인터페이스
interface ChartData {
  pieCharts: {
    category2: Array<{ name: string; value: number; type: string }>;
    category3: Array<{ name: string; value: number; type: string }>;
    channel: Array<{ name: string; value: number; type: string }>;
    manager: Array<{ name: string; value: number; type: string }>;
  };
  trendData: Array<{
    order_date: string;
    revenue: number;
    cost: number;
    profit: number;
    target_day: number;
  }>;
  summary: {
    totalRevenue: number;
    totalCost: number;
    achievementRate: number;
    dateCount: number;
    totalGrossAmount: number;
    growthRate: number;
    totalQuantity: number;
    quantityGrowthRate: number;
    previousRevenue: number;
    previousQuantity: number;
    previousCost: number;
    costRate: number;
    targetCostRate: number;
    costComparisonRate: number;
  };
}

// 필터 옵션 인터페이스
interface FilterOptions {
  brand_group: string[];
  team: string[];
  category2: string[];
  category3: string[];
  channel: string[];
  manager: string[];
}

// 상수 값 정의
const ALL_VALUE = "ALL";

export default function RevenuePage() {
  // 상태 관리
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    brand_group: [],
    team: [],
    category2: [],
    category3: [],
    channel: [],
    manager: []
  });
  
  // 현재 달의 1일부터 오늘까지를 기본 날짜 범위로 설정
  const getDefaultDateRange = (): DateRange => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    return {
      from: firstDayOfMonth,
      to: today
    };
  };
  
  const [filters, setFilters] = useState<Filters>({
    brand_group: null,
    team: null,
    channel_category_2: null,
    channel_category_3: null,
    channel_name: null,
    manager: null,
    dateRange: getDefaultDateRange()
  });

  // 필터 변경 핸들러
  const handleFilterChange = async (key: keyof Filters, value: any) => {
    try {
      // 기존 필터 값 변경
      const newFilters = { ...filters, [key]: value === ALL_VALUE ? null : value };
      
      // 계층적 필터링: 상위 필터가 변경되면 하위 필터 초기화
      if (key === 'brand_group') {
        newFilters.team = null;
        newFilters.channel_category_2 = null;
        newFilters.channel_category_3 = null;
        newFilters.channel_name = null;
        newFilters.manager = null;
      } else if (key === 'team') {
        newFilters.channel_category_2 = null;
        newFilters.channel_category_3 = null;
        newFilters.channel_name = null;
        newFilters.manager = null;
      } else if (key === 'channel_category_2') {
        newFilters.channel_category_3 = null;
        newFilters.channel_name = null;
        newFilters.manager = null;
      } else if (key === 'channel_category_3') {
        newFilters.channel_name = null;
        newFilters.manager = null;
      } else if (key === 'channel_name') {
        newFilters.manager = null;
      }
      
      // 상태 업데이트
      setFilters(newFilters);
      
      // 필터 옵션 새로 불러오기
      await loadFilterOptions(newFilters);
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    }
  };
  
  // 필터 옵션만 로드하는 함수
  const loadFilterOptions = async (currentFilters = filters) => {
    try {
      // URL 파라미터 생성
      const params = new URLSearchParams();
      params.append('filterOptionsOnly', 'true');
      
      if (currentFilters.brand_group) params.append('brand_group', currentFilters.brand_group);
      if (currentFilters.team) params.append('team', currentFilters.team);
      if (currentFilters.channel_category_2) params.append('channel_category_2', currentFilters.channel_category_2);
      if (currentFilters.channel_category_3) params.append('channel_category_3', currentFilters.channel_category_3);
      if (currentFilters.channel_name) params.append('channel_name', currentFilters.channel_name);
      if (currentFilters.manager) params.append('manager', currentFilters.manager);
      
      // API 요청
      const response = await fetch(`/api/dashboard/revenue?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '필터 옵션을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setFilterOptions(data.filterOptions);
    } catch (err) {
    }
  };

  // 데이터 로드 함수
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // URL 파라미터 생성
      const params = new URLSearchParams();
      if (filters.brand_group) params.append('brand_group', filters.brand_group);
      if (filters.team) params.append('team', filters.team);
      if (filters.channel_category_2) params.append('channel_category_2', filters.channel_category_2);
      if (filters.channel_category_3) params.append('channel_category_3', filters.channel_category_3);
      if (filters.channel_name) params.append('channel_name', filters.channel_name);
      if (filters.manager) params.append('manager', filters.manager);
      
      if (filters.dateRange?.from) {
        params.append('startDate', format(filters.dateRange.from, 'yyyy-MM-dd'));
      }
      if (filters.dateRange?.to) {
        params.append('endDate', format(filters.dateRange.to, 'yyyy-MM-dd'));
      }
      
      // API 요청
      const response = await fetch(`/api/dashboard/revenue?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '데이터를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setChartData(data.chartData);
      setFilterOptions(data.filterOptions);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드 및 필터 변경 시 데이터 로드
  useEffect(() => {
    loadData();
  }, [filters]);

  // 초기 필터 옵션 로드
  useEffect(() => {
    loadFilterOptions();
  }, []);

  // 포맷팅 함수
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', { 
      style: 'currency', 
      currency: 'KRW',
      maximumFractionDigits: 0 
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  };
  
  // 빠른 날짜 선택 핸들러
  const handleQuickDateSelect = (type: 'yesterday' | 'week' | 'month' | 'lastMonth') => {
    const today = new Date();
    let to = new Date();
    let from = new Date();
    
    switch (type) {
      case 'yesterday':
        // 어제
        from.setDate(today.getDate() - 1);
        to.setDate(today.getDate() - 1);
        break;
      case 'week':
        // 최근 일주일
        from.setDate(today.getDate() - 7);
        break;
      case 'month':
        // 이번달 (1일부터 오늘까지)
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        // 저번달 (저번달 1일부터 말일까지)
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
    }
    
    const newDateRange = { from, to };
    setFilters(prev => ({ ...prev, dateRange: newDateRange }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">매출 대시보드</h1>
      </div>

      {/* 필터 영역 */}
      <div className="grid gap-4 md:grid-cols-6">
        <div>
          <label className="text-sm font-medium mb-1 block">브랜드</label>
          <Select
            value={filters.brand_group || ALL_VALUE}
            onValueChange={(value) => handleFilterChange('brand_group', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="브랜드 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>전체</SelectItem>
              {filterOptions.brand_group
                .filter(option => option !== '기타')
                .map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">팀</label>
          <Select
            value={filters.team || ALL_VALUE}
            onValueChange={(value) => handleFilterChange('team', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="팀 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>전체</SelectItem>
              {filterOptions.team.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">구분</label>
          <Select
            value={filters.channel_category_2 || ALL_VALUE}
            onValueChange={(value) => handleFilterChange('channel_category_2', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="구분 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>전체</SelectItem>
              {filterOptions.category2.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">분류</label>
          <Select
            value={filters.channel_category_3 || ALL_VALUE}
            onValueChange={(value) => handleFilterChange('channel_category_3', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="분류 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>전체</SelectItem>
              {filterOptions.category3.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">채널</label>
          <Select
            value={filters.channel_name || ALL_VALUE}
            onValueChange={(value) => handleFilterChange('channel_name', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="채널 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>전체</SelectItem>
              {filterOptions.channel.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">담당자</label>
          <Select
            value={filters.manager || ALL_VALUE}
            onValueChange={(value) => handleFilterChange('manager', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="담당자 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>전체</SelectItem>
              {filterOptions.manager.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">기간</label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange?.from ? (
                    filters.dateRange.to ? (
                      <>
                        {format(filters.dateRange.from, 'PPP', { locale: ko })} -{" "}
                        {format(filters.dateRange.to, 'PPP', { locale: ko })}
                      </>
                    ) : (
                      format(filters.dateRange.from, 'PPP', { locale: ko })
                    )
                  ) : (
                    <span>날짜 선택</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={filters.dateRange}
                  onSelect={(range) => handleFilterChange('dateRange', range)}
                  initialFocus
                  locale={ko}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs" 
                onClick={() => handleQuickDateSelect('yesterday')}
              >
                어제
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs" 
                onClick={() => handleQuickDateSelect('week')}
              >
                일주일
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs" 
                onClick={() => handleQuickDateSelect('month')}
              >
                이번달
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs" 
                onClick={() => handleQuickDateSelect('lastMonth')}
              >
                저번달
              </Button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        // 로딩 상태
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-36" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[400px] w-full" />
            </CardContent>
          </Card>
        </div>
      ) : error ? (
        // 에러 상태
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {error}
        </div>
      ) : (
        // 데이터 표시
        <>
          {/* 개요 카드 */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>총 거래액</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(chartData?.summary.totalGrossAmount || 0)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  <span className={chartData?.summary.growthRate && chartData.summary.growthRate >= 0 ? "text-green-500" : "text-red-500"}>
                    {chartData?.summary.growthRate && (
                      <>
                        {chartData.summary.growthRate >= 0 ? (
                          <TrendingUp className="w-4 h-4 inline-block mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 inline-block mr-1" />
                        )}
                        {chartData.summary.growthRate.toFixed(1)}%
                      </>
                    )}
                  </span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex justify-between">
                  <div className="flex flex-col">
                    <CardDescription>총 매출</CardDescription>
                    <CardTitle className="text-2xl">{formatCurrency(chartData?.summary.totalRevenue || 0)}</CardTitle>
                    
                    <p className="text-xs text-muted-foreground pt-3">
                      목표 금액: {formatCurrency(chartData?.trendData?.reduce((sum, item) => sum + (item.target_day || 0), 0) || 0)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    
                    <div className="w-24 h-24">
                    <RadialBarChart
                      width={96}
                      height={96}
                      data={[
                        {
                          achievement: chartData?.summary.achievementRate || 0,
                          fill: "hsl(var(--chart-1))"
                        }
                      ]}
                      startAngle={90}  // 12시 방향에서 시작 (90도)
                      endAngle={chartData?.summary.achievementRate ? (90 - (chartData.summary.achievementRate * 3.6)) : 90}  // 시계방향으로 진행
                      innerRadius={30}
                      outerRadius={48}
                      barSize={10}
                    >
                      <PolarGrid gridType="circle"radialLines={false}stroke="none"className="first:fill-muted last:fill-background"polarRadius={[35, 25]}/>
                      <RadialBar background dataKey="achievement" cornerRadius={5} fill="hsl(var(--chart-1))"/>
                      <PolarRadiusAxis type="number" domain={[0, 100]} tick={false} tickLine={false} axisLine={false}>
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    className="text-xs text-muted-foreground"
                                  >
                                    {Math.round(chartData?.summary.achievementRate || 0)}%
                                  </tspan>
                                </text>
                              )
                            }
                          }}
                        />
                      </PolarRadiusAxis>
                    </RadialBarChart>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
            <div className="flex gap-4 md:col-span-2">
              <Card className="flex-1">
                <CardHeader className="pb-2">
                  <CardDescription>판매수량</CardDescription>
                  <CardTitle className="text-2xl">{chartData?.summary.totalQuantity?.toLocaleString() || 0}개</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    <span className={chartData?.summary.quantityGrowthRate && chartData.summary.quantityGrowthRate >= 0 ? "text-green-500" : "text-red-500"}>
                      {chartData?.summary.quantityGrowthRate && (
                        <>
                          {chartData.summary.quantityGrowthRate >= 0 ? (
                            <TrendingUp className="w-4 h-4 inline-block mr-1" />
                          ) : (
                            <TrendingDown className="w-4 h-4 inline-block mr-1" />
                          )}
                          {chartData.summary.quantityGrowthRate.toFixed(1)}%
                        </>
                      )}
                    </span>
                  </p>
                </CardContent>
              </Card>
              <Card className="flex-1">
                <CardHeader className="pb-2">
                  <CardDescription>판매단가</CardDescription>
                  <CardTitle className="text-2xl">
                    {chartData?.summary.totalQuantity && chartData.summary.totalQuantity > 0 
                      ? formatCurrency(chartData.summary.totalRevenue / chartData.summary.totalQuantity)
                      : formatCurrency(0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    <span className={chartData?.summary.totalQuantity && chartData.summary.previousQuantity && 
                      (chartData.summary.totalRevenue / chartData.summary.totalQuantity) >= 
                      (chartData.summary.previousRevenue / chartData.summary.previousQuantity) ? "text-green-500" : "text-red-500"}>
                      {chartData?.summary.totalQuantity && chartData.summary.previousQuantity && (
                        <>
                          {((chartData.summary.totalRevenue / chartData.summary.totalQuantity) >= 
                            (chartData.summary.previousRevenue / chartData.summary.previousQuantity)) ? (
                            <TrendingUp className="w-4 h-4 inline-block mr-1" />
                          ) : (
                            <TrendingDown className="w-4 h-4 inline-block mr-1" />
                          )}
                          {(((chartData.summary.totalRevenue / chartData.summary.totalQuantity) / 
                            (chartData.summary.previousRevenue / chartData.summary.previousQuantity) - 1) * 100).toFixed(1)}%
                        </>
                      )}
                    </span>
                  </p>
                </CardContent>
              </Card>
              <Card className="flex-1">
                <CardHeader className="pb-2">
                  <CardDescription>총 원가</CardDescription>
                  <CardTitle className="text-2xl">
                    {(() => {
                      const costRate = chartData?.summary?.costRate || 0;
                      console.log('원가율 데이터:', {
                        costRate,
                        summary: chartData?.summary
                      });
                      return `${costRate.toFixed(1)}%`;
                    })()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      if (!chartData?.summary) {
                        console.log('summary가 없음');
                        return null;
                      }
                      
                      const { costRate, targetCostRate, costComparisonRate } = chartData.summary;
                      
                      console.log('원가율 비교 데이터:', {
                        costRate,
                        targetCostRate,
                        costComparisonRate,
                        formattedCostRate: `${costRate.toFixed(1)}%`,
                        formattedTargetCostRate: `${targetCostRate.toFixed(1)}%`,
                        formattedComparisonRate: `${costComparisonRate.toFixed(1)}%`
                      });
                      
                      if (costRate === undefined || targetCostRate === undefined || costComparisonRate === undefined) {
                        console.log('원가율 데이터가 불완전함');
                        return null;
                      }
                      
                      return (
                        <span className={costComparisonRate >= 0 ? "text-green-500" : "text-red-500"}>
                          {costComparisonRate <= 0 ? (
                            <TrendingDown className="w-4 h-4 inline-block mr-1" />
                          ) : (
                            <TrendingUp className="w-4 h-4 inline-block mr-1" />
                          )}
                          {costComparisonRate <= 0 ? Math.abs(costComparisonRate).toFixed(2) : costComparisonRate.toFixed(2)}%
                        </span>
                      );
                    })()}
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>총 이익</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency((chartData?.summary.totalRevenue || 0) - (chartData?.summary.totalCost || 0))}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  이익률: {formatPercent(((chartData?.summary.totalRevenue || 0) - (chartData?.summary.totalCost || 0)) / (chartData?.summary.totalRevenue || 1) * 100)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 일별 매출 바차트 추가 */}
          <Card>
            <CardHeader>
              <CardTitle>일별 매출</CardTitle>
              <CardDescription>
                {filters.dateRange?.from && filters.dateRange?.to 
                  ? `${format(filters.dateRange.from, 'yyyy-MM-dd')} ~ ${format(filters.dateRange.to, 'yyyy-MM-dd')}`
                  : '선택된 기간'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <div style={{ width: '100%', height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={chartData?.trendData || []}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="order_date"
                      tickLine={false}
                      tickMargin={5}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(date: string) => format(new Date(date), 'MM-dd')}
                      height={30}
                    />
                    <Tooltip 
                      content={
                        <CustomTooltip 
                          formatter={formatCurrency}
                          indicator="dot"
                        />
                      }
                      labelFormatter={(date: string) => format(new Date(date), 'yyyy-MM-dd')}
                    />
                    <Bar dataKey="revenue" name="실제 매출" fill="hsl(var(--chart-1))" radius={5} />
                    <Bar dataKey="target_day" name="목표 매출" fill="hsl(var(--chart-2))" radius={5} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            <CardFooter className="pt-0 pb-4 text-xs text-muted-foreground flex items-center justify-between">
              <div>실제 매출과 목표 매출 비교</div>
              {chartData?.trendData && chartData.trendData.length >= 2 && (
                <div className="font-medium">
                  {(() => {
                    const latest = chartData.trendData[chartData.trendData.length - 1];
                    const latestRevenue = latest.revenue;
                    const latestTarget = latest.target_day;
                    
                    if (latestTarget === 0) return "목표 정보 없음";
                    
                    const achievementRate = (latestRevenue / latestTarget) * 100;
                    return `최근 일자 달성률: ${achievementRate.toFixed(1)}%`;
                  })()}
                </div>
              )}
            </CardFooter>
          </Card>

          {/* 파이 차트 영역 */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* 구분별 차트 */}
            <Card>
              <CardHeader>
                <CardTitle>구분별 매출 비중</CardTitle>
                <CardDescription>
                  구분(channel_category_2)별 매출 분포
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  {chartData?.pieCharts.category2.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                      데이터가 없습니다
                    </div>
                  ) : (
                    <PieChart width={400} height={300}>
                      <Pie
                        data={chartData?.pieCharts.category2}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartData?.pieCharts.category2.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={
                          <CustomTooltip 
                            formatter={formatCurrency}
                            indicator="dot"
                          />
                        }
                      />
                    </PieChart>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 분류별 차트 */}
            <Card>
              <CardHeader>
                <CardTitle>분류별 매출 비중</CardTitle>
                <CardDescription>
                  분류(channel_category_3)별 매출 분포
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  {chartData?.pieCharts.category3.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                      데이터가 없습니다
                    </div>
                  ) : (
                    <PieChart width={400} height={300}>
                      <Pie
                        data={chartData?.pieCharts.category3}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartData?.pieCharts.category3.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={
                          <CustomTooltip 
                            formatter={formatCurrency}
                            indicator="dot"
                          />
                        }
                      />
                    </PieChart>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 채널별 차트 */}
            <Card>
              <CardHeader>
                <CardTitle>채널별 매출 비중</CardTitle>
                <CardDescription>
                  채널(channel_name)별 매출 분포
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  {chartData?.pieCharts.channel.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                      데이터가 없습니다
                    </div>
                  ) : (
                    <PieChart width={400} height={300}>
                      <Pie
                        data={chartData?.pieCharts.channel}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartData?.pieCharts.channel.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={
                          <CustomTooltip 
                            formatter={formatCurrency}
                            indicator="dot"
                          />
                        }
                      />
                    </PieChart>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}