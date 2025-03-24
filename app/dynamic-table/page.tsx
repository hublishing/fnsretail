'use client'

import { DynamicTable } from '../components/dynamic-table'

export default function DynamicTablePage() {
  const data = [
    { id: 1, name: '상품 1', price: 1000, stock: 10 },
    { id: 2, name: '상품 2', price: 2000, stock: 20 },
    { id: 3, name: '상품 3', price: 3000, stock: 30 },
  ]

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: '상품명' },
    { key: 'price', label: '가격' },
    { key: 'stock', label: '재고' },
  ]

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">상품 목록</h1>
      <DynamicTable data={data} columns={columns} />
    </div>
  )
} 