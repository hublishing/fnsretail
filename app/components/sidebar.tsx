"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Package, Users, Settings, LogOut } from "lucide-react"
import { useState } from 'react'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const menuItems = [
  {
    title: "상품 관리",
    href: "/dynamic-table",
    icon: Package,
  },
  {
    title: "고객 관리",
    href: "/customers",
    icon: Users,
  },
  {
    title: "주문 관리",
    href: "/orders",
    icon: Package,
  },
  {
    title: "설정",
    href: "/settings",
    icon: Settings,
  },
]

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [activeItem, setActiveItem] = useState('')

  return (
    <div className={`bg-gray-800 text-white w-64 min-h-screen transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold">FNS Retail</h1>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <nav>
          {menuItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`block py-2 px-4 rounded mb-1 ${
                pathname === item.href
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
              onClick={() => setActiveItem(item.title)}
            >
              {item.title}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}

interface MobileNavProps {
  items: typeof menuItems
  pathname: string
}

function MobileNav({ items, pathname }: MobileNavProps) {
  return (
    <nav className="grid items-start gap-2">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              pathname === item.href ? "bg-accent" : "transparent"
            )}
          >
            <Icon className="mr-2 h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        )
      })}
    </nav>
  )
} 