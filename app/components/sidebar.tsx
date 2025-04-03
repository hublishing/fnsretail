"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import { Menu, LogOut, History, LayoutDashboard, ShoppingCart, Search, FileText, PlusCircle, NotebookText, List } from "lucide-react"
import { Switch } from "@/app/components/ui/switch"
import { SheetTitle } from "@/app/components/ui/sheet"

import { cn } from "@/lib/utils"
import { Button } from "@/app/components/ui/button"
import { ScrollArea } from "@/app/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/app/components/ui/sheet"
import { signOut, getSession } from "@/app/actions/auth"

const menuItems = [
  {
    title: "대시보드",
    href: "/page/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "상품검색",
    href: "/page/dynamic-table",
    icon: Search,
  },
  {
    title: "리스트",
    href: "/page/list",
    icon: List,
  },
  {
    title: "패치노트",
    href: "/page/patch-notes",
    icon: History,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [userEmail, setUserEmail] = React.useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = React.useState(false)
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  React.useEffect(() => {
    const fetchUserEmail = async () => {
      const session = await getSession()
      if (session?.email) {
        setUserEmail(session.email)
      }
    }
    fetchUserEmail()
  }, [])

  React.useEffect(() => {
    // 다크모드 상태를 localStorage에서 불러오기
    const savedDarkMode = localStorage.getItem('darkMode')
    if (savedDarkMode) {
      setIsDarkMode(savedDarkMode === 'true')
      document.documentElement.classList.toggle('dark', savedDarkMode === 'true')
    }
  }, [])

  // 화면 너비에 따라 사이드바 상태 변경
  React.useEffect(() => {
    const handleResize = () => {
      setIsCollapsed(window.innerWidth <= 1440)
    }

    // 초기 상태 설정
    handleResize()

    // 리사이즈 이벤트 리스너 등록
    window.addEventListener('resize', handleResize)

    // 클린업 함수
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    localStorage.setItem('darkMode', String(newDarkMode))
    document.documentElement.classList.toggle('dark', newDarkMode)
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/page/login')
    } catch (error) {
      console.error('로그아웃 오류:', error)
    }
  }

  return (
    <>
      {/* 메뉴 버튼 - 1440px 이하일 때만 표시 */}
      <Button
        variant="ghost"
        className={cn(
          "fixed left-4 top-4 z-50 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
          isCollapsed ? "block" : "hidden"
        )}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">메뉴 열기</span>
      </Button>

      {/* 오버레이 사이드바 - 1440px 이하일 때만 표시 */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className={cn("pr-0 w-64", isCollapsed ? "block" : "hidden")}>
          <SheetTitle className="sr-only">메인 메뉴</SheetTitle>
          <div className="flex h-screen flex-col">
            <div className="flex h-14 items-center border-b px-4">
              <Link href="/" className="flex items-center space-x-2">
                <span className="font-bold">Project M</span>
              </Link>
            </div>
            <ScrollArea className="flex-1">
              <nav className="grid items-start gap-2 p-4">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      pathname === item.href ? "bg-accent" : "transparent"
                    )}
                  >
                    {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                    <span>{item.title}</span>
                  </Link>
                ))}
              </nav>
            </ScrollArea>
            <div className="border-t p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">다크 모드</span>
                  <Switch
                    checked={isDarkMode}
                    onCheckedChange={toggleDarkMode}
                  />
                </div>
                {userEmail && (
                  <div className="text-sm text-muted-foreground">
                    {userEmail}
                  </div>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  로그아웃
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 고정 사이드바 - 1441px 이상일 때만 표시 */}
      <div className={cn(
        "hidden border-r bg-background",
        !isCollapsed ? "block w-64" : ""
      )}>
        <div className="flex h-screen flex-col">
          <div className="flex h-14 items-center border-b px-4">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold">Project M</span>
            </Link>
          </div>
          <ScrollArea className="flex-1">
            <nav className="grid items-start gap-2 p-4">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    pathname === item.href
                      ? 'bg-gray-900 text-white'
                      : 'text-[hsl(var(--primary)/.9)] hover:text-white hover:bg-gray-700'
                  )}
                >
                  {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                  {item.title}
                </Link>
              ))}
            </nav>
          </ScrollArea>
          <div className="border-t p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">다크 모드</span>
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={toggleDarkMode}
                />
              </div>
              {userEmail && (
                <div className="text-sm text-muted-foreground">
                  {userEmail}
                </div>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 