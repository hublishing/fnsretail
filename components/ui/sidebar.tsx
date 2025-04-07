"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  children?: React.ReactNode
}

export function Sidebar({ className, children, ...props }: SidebarProps) {
  return (
    <div
      className={cn(
        "flex h-screen w-64 flex-col border-r bg-background",
        className
      )}
      {...props}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}

interface SidebarItemProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  children?: React.ReactNode
  icon?: React.ReactNode
  active?: boolean
}

export function SidebarItem({
  className,
  children,
  icon,
  active,
  ...props
}: SidebarItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
        active && "bg-accent",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </div>
  )
}

interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  children?: React.ReactNode
}

export function SidebarHeader({
  className,
  children,
  ...props
}: SidebarHeaderProps) {
  return (
    <div
      className={cn("flex h-14 items-center border-b px-4", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  children?: React.ReactNode
}

export function SidebarFooter({
  className,
  children,
  ...props
}: SidebarFooterProps) {
  return (
    <div
      className={cn("flex h-14 items-center border-t px-4", className)}
      {...props}
    >
      {children}
    </div>
  )
} 