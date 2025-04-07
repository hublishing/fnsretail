import { Calendar, Home, Inbox, Settings } from "lucide-react"
import { Menu, LogOut, History, LayoutDashboard, ShoppingCart, Search, FileText, PlusCircle, NotebookText, List } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
  return (
    <Sidebar>
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
    </Sidebar>
  )
}
