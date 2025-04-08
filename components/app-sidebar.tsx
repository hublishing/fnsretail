import * as React from "react"
import { Calendar, Home, Inbox, Settings } from "lucide-react"
import { Menu, LogOut, History, LayoutDashboard, ShoppingCart, Search, FileText, PlusCircle, NotebookText, List, ChevronDown, ChevronUp, ChevronRight as ChevronRightIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible"

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

const dashboard = [
    {
      title: "대시보드",
      icon: LayoutDashboard,
      isActive: false,
      items: [
        {
          title: "판매현황",
          url: "/page/dashboard",
        },
        {
          title: "매출현황",
          url: "#",
        },
        {
          title: "트렌드현황",
          url: "#",
        },
      ],
    },
]

const list = [
  {
    title: "상품검색",
    href: "/page/dynamic-table",
    icon: Search,
  },
  {
    title: "리스트",
    href: "#",
    icon: List,
    isActive: false,
    items: [
      {
        title: "작성",
        url: "/page/list/create",
      },
      {
        title: "조회",
        url: "#",
      },
      {
        title: "편집",
        url: "#",
      },
    ],
  },
]

const patch = [
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
                <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                    {dashboard.map((item) => (
                        <Collapsible
                          key={item.title}
                          asChild
                          defaultOpen={item.isActive}
                          className="group/collapsible"
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton tooltip={item.title}>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                                {item.items && (
                                  <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                )}
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenu className="border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5 group-data-[collapsible=icon]:hidden">
                                {item.items?.map((subItem) => (
                                  <SidebarMenuItem key={subItem.title}>
                                    <SidebarMenuButton asChild>
                                      <a href={subItem.url}>
                                        <span>{subItem.title}</span>
                                      </a>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                ))}
                              </SidebarMenu>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
                <SidebarGroupLabel>Product</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                    {list.map((item) => (
                        <Collapsible
                          key={item.title}
                          asChild
                          defaultOpen={item.isActive}
                          className="group/collapsible"
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton tooltip={item.title}>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                                {item.items && (
                                  <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                )}
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenu className="border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5 group-data-[collapsible=icon]:hidden">
                                {item.items?.map((subItem) => (
                                  <SidebarMenuItem key={subItem.title}>
                                    <SidebarMenuButton asChild>
                                      <a href={subItem.url}>
                                        <span>{subItem.title}</span>
                                      </a>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                ))}
                              </SidebarMenu>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
                <SidebarGroupLabel>Infomation</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                    {patch.map((item) => (
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
                  <DropdownMenuItem onClick={handleLogout}>
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
  )
}
