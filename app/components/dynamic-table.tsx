"use client"

import { useState, useEffect, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Group,
  X,
  Plus,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface ColumnConfig {
  key: string
  label: string
  type?: 'text' | 'number' | 'date' | 'boolean'
  sortable?: boolean
  filterable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (value: any, row: any) => React.ReactNode
}

interface DynamicTableProps {
  data: any[]
  columns: ColumnConfig[]
  pageSize?: number
  showPagination?: boolean
  showSearch?: boolean
  showFilters?: boolean
  showColumnSelector?: boolean
  onRowClick?: (row: any) => void
  onSelectionChange?: (selectedRows: any[]) => void
  className?: string
}

export function DynamicTable({
  data,
  columns,
  pageSize = 10,
  showPagination = true,
  showSearch = true,
  showFilters = true,
  showColumnSelector = true,
  onRowClick,
  onSelectionChange,
  className = '',
}: DynamicTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns.map(col => col.key))
  const [selectedRows, setSelectedRows] = useState<any[]>([])

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(column => (
              <TableHead key={column.key}>{column.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              {columns.map(column => (
                <TableCell key={column.key}>
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 