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
  ...props
}: {
  active?: boolean
  payload?: any[]
  label?: string
  formatter?: (value: number) => string
  indicator?: "line" | "dot" | "dashed"
} & Omit<React.ComponentProps<typeof ChartTooltip>, 'payload' | 'label'>) {
  if (!active || !payload?.length) {
    return null
  }

  const formattedPayload = payload.map(item => ({
    ...item,
    value: item.name === '원가율' ? `${item.value.toFixed(1)}%` : formatter?.(item.value) || item.value.toLocaleString(),
    fill: item.fill || item.color || item.stroke,
    indicator
  }))

  return (
    <ChartTooltip
      label={label}
      payload={formattedPayload}
      indicator={indicator}
      {...props}
    />
  )
} 