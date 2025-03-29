import { 
  LayoutDashboard, 
  ShoppingCart, 
  Search, 
  FileText,
  History
} from "lucide-react"

const menuItems = [
  {
    title: "대시보드",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "장바구니",
    href: "/cart",
    icon: ShoppingCart,
  },
  {
    title: "상품검색",
    href: "/dynamic-table",
    icon: Search,
  },
  {
    title: "패치노트",
    href: "/patch-notes",
    icon: History,
  },
] 