"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  ResponsiveContainer
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"

// 샘플 월간 매출 데이터
const monthlyRevenueData = [
  { month: "1월", 매출: 4000000, 비용: 2400000, 이익: 1600000 },
  { month: "2월", 매출: 3500000, 비용: 2100000, 이익: 1400000 },
  { month: "3월", 매출: 4800000, 비용: 2800000, 이익: 2000000 },
  { month: "4월", 매출: 3900000, 비용: 2200000, 이익: 1700000 },
  { month: "5월", 매출: 5200000, 비용: 3000000, 이익: 2200000 },
  { month: "6월", 매출: 4200000, 비용: 2500000, 이익: 1700000 },
  { month: "7월", 매출: 3800000, 비용: 2300000, 이익: 1500000 },
  { month: "8월", 매출: 5000000, 비용: 2900000, 이익: 2100000 },
  { month: "9월", 매출: 5500000, 비용: 3200000, 이익: 2300000 },
  { month: "10월", 매출: 4900000, 비용: 2700000, 이익: 2200000 },
  { month: "11월", 매출: 6000000, 비용: 3500000, 이익: 2500000 },
  { month: "12월", 매출: 6800000, 비용: 4000000, 이익: 2800000 }
];

// 샘플 채널별 매출 데이터
const channelRevenueData = [
  { name: "아마존", value: 35000000 },
  { name: "이베이", value: 25000000 },
  { name: "쇼피", value: 18000000 },
  { name: "티몰", value: 12000000 },
  { name: "기타", value: 10000000 }
];

// 파이 차트 색상
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function RevenuePage() {
  const [period, setPeriod] = useState("monthly");

  // 총 매출 계산
  const totalRevenue = monthlyRevenueData.reduce((sum, item) => sum + item.매출, 0);
  // 총 이익 계산
  const totalProfit = monthlyRevenueData.reduce((sum, item) => sum + item.이익, 0);
  // 평균 이익률 계산
  const averageProfitMargin = (totalProfit / totalRevenue) * 100;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">매출 대시보드</h1>
      </div>

      {/* 개요 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 매출</CardDescription>
            <CardTitle className="text-2xl">{(totalRevenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              전월 대비 <span className="text-green-500">+12.5%</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 이익</CardDescription>
            <CardTitle className="text-2xl">{(totalProfit)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              전월 대비 <span className="text-green-500">+8.2%</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>평균 이익률</CardDescription>
            <CardTitle className="text-2xl">{averageProfitMargin.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              목표치: 42.0%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 차트 탭 */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">매출 추이</TabsTrigger>
          <TabsTrigger value="profit">이익 추이</TabsTrigger>
          <TabsTrigger value="channel">채널별 매출</TabsTrigger>
        </TabsList>
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>월간 매출 추이</CardTitle>
              <CardDescription>
                최근 12개월 매출 및 비용 추이
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ChartContainer 
                  config={{
                    매출: {
                      label: "매출",
                      color: "#0ea5e9"
                    },
                    비용: {
                      label: "비용",
                      color: "#f43f5e"
                    }
                  }}
                >
                  <AreaChart data={monthlyRevenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="매출" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorRevenue)" />
                    <Area type="monotone" dataKey="비용" stroke="#f43f5e" fillOpacity={1} fill="url(#colorCost)" />
                  </AreaChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="profit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>월간 이익 추이</CardTitle>
              <CardDescription>
                최근 12개월 이익 추이
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ChartContainer 
                  config={{
                    이익: {
                      label: "이익",
                      color: "#10b981"
                    }
                  }}
                >
                  <BarChart data={monthlyRevenueData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="이익" fill="#10b981" />
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="channel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>채널별 매출 비중</CardTitle>
              <CardDescription>
                채널별 매출 분포
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center">
                <ChartContainer 
                  config={{
                    // 채널 색상 설정
                    아마존: { color: COLORS[0] },
                    이베이: { color: COLORS[1] },
                    쇼피: { color: COLORS[2] },
                    티몰: { color: COLORS[3] },
                    기타: { color: COLORS[4] }
                  }}
                >
                  <PieChart>
                    <Pie
                      data={channelRevenueData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {channelRevenueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => (value)} />
                    <Legend />
                  </PieChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
