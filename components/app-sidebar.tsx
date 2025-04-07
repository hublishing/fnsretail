import * as React from "react"
import { Calendar, Home, Inbox, Settings } from "lucide-react"
import { Menu, LogOut, History, LayoutDashboard, ShoppingCart, Search, FileText, PlusCircle, NotebookText, List, ChevronDown, ChevronUp } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { signOut, getSession } from "@/app/actions/auth"
import { useRouter } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"

// Menu items.
const items = [
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
    href: "/page/list/create",
    icon: List,
  },
  {
    title: "패치노트",
    href: "/page/patch-notes",
    icon: History,
  },
]

export function AppSidebar() {
    const router = useRouter()
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
          router.push('/page/login')
        } catch (error) {
          console.error('로그아웃 오류:', error)
        }
      }
  return (
    <Sidebar>
        <SidebarHeader>
            <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <SidebarMenuButton>
                    PROJECT M
                    <ChevronDown className="ml-auto" />
                    </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-popper-anchor-width]">
                    <DropdownMenuItem>
                    <span>Acme Inc</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                    <span>Acme Corp.</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
            <SidebarGroup>
            <SidebarGroupLabel>Application</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                        <a href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                        </a>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
                </SidebarMenu>
            </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    {userEmail && (
                        <div className="text-sm text-muted-foreground">
                        {userEmail}
                        </div>
                    )}
                    <ChevronUp className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-[--radix-popper-anchor-width]"
                >
                  <DropdownMenuItem>
                    <span onClick={handleLogout}>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
  )
}
