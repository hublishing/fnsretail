"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import { Menu, Package, Users, Settings, LogOut, TableIcon, ShoppingCartIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { signOut, getSession } from "@/app/actions/auth"

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

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [userEmail, setUserEmail] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchUserEmail = async () => {
      const session = await getSession()
      if (session?.email) {
        setUserEmail(session.email)
      }
    }
    fetchUserEmail()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 오류:', error)
    }
  }

  const routes = [
    {
      href: '/dashboard',
      label: '대시보드',
    },
    {
      href: '/dynamic-table',
      label: '상품 검색',
    },
    {
      href: '/cart',
      label: '담은 상품',
    },
  ]

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">메뉴 열기</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="pr-0">
          <MobileNav items={menuItems} pathname={pathname} />
        </SheetContent>
      </Sheet>
      <div className="hidden md:block w-64 border-r bg-background">
        <div className="flex h-screen flex-col">
          <div className="flex h-14 items-center border-b px-4">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold">Project M</span>
            </Link>
          </div>
          <ScrollArea className="flex-1">
            <nav className="grid items-start gap-2 p-4">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    pathname === route.href
                      ? 'bg-gray-900 text-white'
                      : 'text-[hsl(var(--primary)/.9)] hover:text-white hover:bg-gray-700'
                  )}
                >
                  {route.label}
                </Link>
              ))}
            </nav>
          </ScrollArea>
          <div className="border-t p-4">
            <div className="flex flex-col gap-2">
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