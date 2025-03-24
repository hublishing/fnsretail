'use client'

import { DynamicTable } from '../components/dynamic-table'
import type { DataType, ColumnConfig } from '../components/dynamic-table'

// 샘플 데이터
const data = [
  {
    id: 1,
    name: "상품 A",
    price: 1000,
    stock: 50,
    category: "전자제품",
    status: true,
    createdAt: "2024-03-20",
  },
  {
    id: 2,
    name: "상품 B",
    price: 2000,
    stock: 30,
    category: "의류",
    status: false,
    createdAt: "2024-03-19",
  },
  {
    id: 3,
    name: "상품 C",
    price: 3000,
    stock: 20,
    category: "전자제품",
    status: true,
    createdAt: "2024-03-18",
  },
]

// 컬럼 설정
const columns: ColumnConfig[] = [
  {
    key: "id",
    label: "ID",
    type: "number" as DataType,
  },
  {
    key: "name",
    label: "상품명",
    type: "string" as DataType,
  },
  {
    key: "price",
    label: "가격",
    type: "number" as DataType,
    format: (value: number) => `${value.toLocaleString()}원`,
  },
  {
    key: "stock",
    label: "재고",
    type: "number" as DataType,
  },
  {
    key: "category",
    label: "카테고리",
    type: "string" as DataType,
  },
  {
    key: "status",
    label: "상태",
    type: "boolean" as DataType,
  },
  {
    key: "createdAt",
    label: "등록일",
    type: "date" as DataType,
  },
]

export default function DynamicTablePage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">상품 목록</h1>
      <DynamicTable data={data} columns={columns} />
    </div>
  )
} 