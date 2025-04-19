"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * 커스텀 차트 툴팁 컴포넌트
 * 
 * @param indicator 인디케이터 스타일 (dot, line, dashed)
 * @param label 툴팁 제목
 * @param payload 툴팁에 표시할 데이터 배열
 * @param hideLabel 제목 숨김 여부
 * @param hideIndicator 인디케이터 숨김 여부
 * @param className 추가 CSS 클래스
 * @param formatter 값 포맷팅 함수
 */
export function ChartTooltip({
  indicator = "dot",
  label,
  payload,
  hideLabel,
  hideIndicator,
  className,
  formatter,
}: {
  label?: string
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
  payload?: Array<{
    name: string
    value: number
    fill?: string
    color?: string
    dataKey?: string
    stroke?: string
  }>
  formatter?: (value: number) => string
} & React.ComponentProps<"div">) {
  const tooltipLabel = hideLabel || !label ? null : (
    <div className="font-medium">{label}</div>
  )

  if (!payload?.length) {
    return null
  }

  const nestLabel = payload.length === 1 && indicator !== "dot"
  
  // 기본 포맷터 (없으면 천 단위 콤마만 적용)
  const defaultFormatter = (value: number) => value.toLocaleString()
  const formatValue = formatter || defaultFormatter

  return (
    <div
      className={cn(
        "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          // item.fill이 있으면 그것을 사용, 없으면 color, 둘 다 없으면 기본 색상 사용
          const indicatorColor = item.fill || item.color || item.stroke || `hsl(var(--chart-${index + 1}))`

          return (
            <div
              key={index}
              className={cn(
                "flex w-full items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                indicator === "dot" && "items-center"
              )}
            >
              <>
                {!hideIndicator && (
                  <div
                    className={cn(
                      "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                      {
                        "h-2.5 w-2.5": indicator === "dot",
                        "w-1": indicator === "line",
                        "w-0 border-[1.5px] border-dashed bg-transparent":
                          indicator === "dashed",
                        "my-0.5": nestLabel && indicator === "dashed",
                      }
                    )}
                    style={
                      {
                        "--color-bg": indicatorColor,
                        "--color-border": indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                )}
                <div
                  className={cn(
                    "flex flex-1 justify-between leading-none",
                    nestLabel ? "items-end" : "items-center"
                  )}
                >
                  <div className="grid gap-1.5">
                    {nestLabel ? tooltipLabel : null}
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium tabular-nums text-foreground pl-2">
                    {formatValue(item.value)}
                  </span>
                </div>
              </>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Recharts에서 사용할 수 있는 커스텀 툴팁 래퍼 컴포넌트
 */
export function CustomTooltip({ 
  active, 
  payload, 
  label,
  formatter,
  indicator = "dot",
  showAchievement = false,
  showYoY = false,
  ...props
}: {
  active?: boolean
  payload?: any[]
  label?: string
  formatter?: (value: number) => string
  indicator?: "line" | "dot" | "dashed"
  showAchievement?: boolean
  showYoY?: boolean
} & Omit<React.ComponentProps<typeof ChartTooltip>, 'payload' | 'label'>) {
  if (!active || !payload?.length) {
    return null
  }

  const formattedPayload = payload.map(item => {
    const value = item.name === '원가율' ? `${item.value.toFixed(1)}%` : formatter?.(item.value) || item.value.toLocaleString();
    const fill = item.payload?.fill || item.payload?.color || item.payload?.stroke || `hsl(var(--chart-${item.dataKey === 'revenue' ? 1 : item.dataKey === 'target_day' ? 2 : 8}))`;
    
    return {
      ...item,
      value,
      fill,
      indicator
    };
  });

  // 달성률 계산 및 추가 (showAchievement가 true일 때만)
  if (showAchievement) {
    const revenue = payload.find(item => item.name === '실제 매출')?.value || 0;
    const target = payload.find(item => item.name === '목표 매출')?.value || 0;
    const achievementRate = target > 0 ? Math.round((revenue / target) * 100) : 0;

    formattedPayload.push({
      name: '달성률',
      value: `${achievementRate}%`,
      fill: achievementRate >= 100 ? 'hsl(var(--chart-6))' : 'hsl(var(--chart-7))',
      type: 'achievement'
    });
  }

  // YoY 계산 및 추가 (showYoY가 true일 때만)
  if (showYoY) {
    const revenue = payload.find(item => item.name === '실제 매출')?.value || 0;
    const previousRevenue = payload.find(item => item.name === '전년 매출')?.value || 0;
    
    // 전년대비 계산
    const previousComparison = previousRevenue > 0 ? Math.round((revenue / previousRevenue) * 100) : 0;
    formattedPayload.push({
      name: '전년대비',
      value: `${previousComparison}%`,
      fill: previousComparison >= 100 ? 'hsl(var(--chart-6))' : 'hsl(var(--chart-7))',
      type: 'previousComparison'
    });

    // YoY 계산
    const yoy = previousRevenue > 0 ? Math.round(((revenue / previousRevenue) - 1) * 100) : 0;
    formattedPayload.push({
      name: 'YoY',
      value: `${yoy}%`,
      fill: yoy >= 0 ? 'hsl(var(--chart-6))' : 'hsl(var(--chart-7))',
      type: 'yoy'
    });
  }

  return (
    <ChartTooltip
      label={label}
      payload={formattedPayload}
      indicator={indicator}
      {...props}
    />
  )
} 