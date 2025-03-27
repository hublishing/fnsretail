'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getSession } from '@/app/actions/auth';
import { ProductDetailModal } from "@/components/product-detail-modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Product {
  product_id: string;
  name: string;
  org_price: number;
  shop_price: number;
  img_desc1: string;
  product_desc: string;
  extra_column2: string;
  cost_ratio: number;
  category_3: string;
  main_wh_available_stock_excl_production_stock: number;
  total_stock: number;
  drop_yn: string;
  soldout_rate: number;
  supply_name: string;
  exclusive2: string;
  brand?: string;
  category_1?: string;
  total_order_qty?: number;
}

export default function CartPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'default' | 'qty_desc' | 'qty_asc' | 'stock_desc' | 'stock_asc'>('qty_desc');
  const [sortedProducts, setSortedProducts] = useState<Product[]>([]);

  // 사용자 세션 로드
  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await getSession();
        setUser(session);
        
        if (session) {
          try {
            // 장바구니 데이터 불러오기 로직...
            const docRef = doc(db, 'userCarts', session.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.products && Array.isArray(data.products)) {
                setProducts(data.products);
                // 기본적으로 판매 많은 순으로 정렬
                const sortedItems = [...data.products].sort((a, b) => (b.total_order_qty || 0) - (a.total_order_qty || 0));
                setSortedProducts(sortedItems);
              }
            }
          } catch (error) {
            console.error('장바구니 데이터 불러오기 오류:', error);
          }
        }
      } catch (error) {
        console.error('세션 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSession();
  }, []);

  const handleRemoveFromCart = async (productId: string) => {
    try {
      const updatedProducts = products.filter(p => p.product_id !== productId);
      
      if (user) {
        // 로그인 상태: Firestore 업데이트
        const docRef = doc(db, 'userCarts', user.uid);
        await setDoc(docRef, {
          products: updatedProducts,
          updatedAt: new Date().toISOString()
        });
      } else {
        // 로그아웃 상태: 로컬 스토리지 업데이트
        localStorage.setItem('cartProducts', JSON.stringify(updatedProducts));
      }
      
      setProducts(updatedProducts);
      alert('상품이 제거되었습니다.');
    } catch (error) {
      console.error('상품 제거 오류:', error);
      alert('상품을 제거하는 중 오류가 발생했습니다.');
    }
  }

  // 정렬 상태 변경 시 상품 정렬
  useEffect(() => {
    if (!products.length) return;
    
    let sortedItems = [...products];
    if (sortOption === 'qty_desc') {
      sortedItems.sort((a, b) => (b.total_order_qty || 0) - (a.total_order_qty || 0));
    } else if (sortOption === 'qty_asc') {
      sortedItems.sort((a, b) => (a.total_order_qty || 0) - (b.total_order_qty || 0));
    } else if (sortOption === 'stock_desc') {
      sortedItems.sort((a, b) => (b.total_stock || 0) - (a.total_stock || 0));
    } else if (sortOption === 'stock_asc') {
      sortedItems.sort((a, b) => (a.total_stock || 0) - (b.total_stock || 0));
    }
    setSortedProducts(sortedItems);
  }, [products, sortOption]);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">담은 상품 목록</h1>
      
      {products.length === 0 ? (
        <p className="text-center text-gray-500">담은 상품이 없습니다.</p>
      ) : (
        <>
          <div className="flex justify-end mb-2">
            <Select
              value={sortOption}
              onValueChange={(value) => {
                setSortOption(value as 'default' | 'qty_desc' | 'qty_asc' | 'stock_desc' | 'stock_asc');
                
                // 상품을 바로 정렬
                let sortedItems = [...products];
                if (value === 'qty_desc') {
                  sortedItems.sort((a, b) => (b.total_order_qty || 0) - (a.total_order_qty || 0));
                } else if (value === 'qty_asc') {
                  sortedItems.sort((a, b) => (a.total_order_qty || 0) - (b.total_order_qty || 0));
                } else if (value === 'stock_desc') {
                  sortedItems.sort((a, b) => (b.total_stock || 0) - (a.total_stock || 0));
                } else if (value === 'stock_asc') {
                  sortedItems.sort((a, b) => (a.total_stock || 0) - (b.total_stock || 0));
                }
                setSortedProducts(sortedItems);
              }}
            >
              <SelectTrigger className="w-[140px] border-none focus:ring-0 focus:ring-offset-0 shadow-none h-10">
                <SelectValue placeholder="정렬 기준" />
              </SelectTrigger>
              <SelectContent className="min-w-[140px]">
                <SelectItem value="qty_desc">판매 많은 순</SelectItem>
                <SelectItem value="qty_asc">판매 적은 순</SelectItem>
                <SelectItem value="stock_desc">재고 많은 순</SelectItem>
                <SelectItem value="stock_asc">재고 적은 순</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">관리</TableHead>
                  <TableHead className="text-center">상품코드</TableHead>
                  <TableHead className="text-center">상품이미지</TableHead>
                  <TableHead className="text-center">상품명</TableHead>
                  <TableHead className="text-center">원가</TableHead>
                  <TableHead className="text-center">판매가</TableHead>
                  <TableHead className="text-center">카테고리</TableHead>
                  <TableHead className="text-center">원가율</TableHead>
                  <TableHead className="text-center">재고</TableHead>
                  <TableHead className="text-center">품절률</TableHead>
                  <TableHead className="text-center">드랍여부</TableHead>
                  <TableHead className="text-center">공급처명</TableHead>
                  <TableHead className="text-center">단독여부</TableHead>
                  <TableHead className="text-center">판매수량</TableHead>
                  <TableHead className="text-center">URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProducts.map((product) => (
                  <TableRow key={product.product_id}>
                    <TableCell className="text-center">
                      <button
                        onClick={() => handleRemoveFromCart(product.product_id)}
                        className="w-8 h-8 flex items-center justify-center bg-white text-red-500 border border-red-500 hover:bg-red-50 transition-colors rounded-[5px] mx-auto"
                      >
                        -
                      </button>
                    </TableCell>
                    <TableCell className="text-center">{product.product_id}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        {product.img_desc1 ? (
                          <img 
                            src={product.img_desc1} 
                            alt="상품 이미지" 
                            className="w-20 h-20 object-cover rounded-md"
                            style={{ borderRadius: '5px' }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/no-image.png';
                              target.alt = '이미지 없음';
                              target.style.objectFit = 'contain';
                              target.style.backgroundColor = 'transparent';
                            }}
                          />
                        ) : (
                          <div className="w-20 h-20 flex items-center justify-center">
                            <img 
                              src="/no-image.png" 
                              alt="이미지 없음" 
                              className="w-20 h-20 object-contain rounded-md"
                              style={{ borderRadius: '5px' }}
                            />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => setSelectedProductId(product.product_id)}
                        className="text-left hover:text-blue-600 transition-colors w-full"
                      >
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {[
                            product.brand,
                            product.category_1,
                            product.extra_column2
                          ].filter(Boolean).join(' ')}
                        </div>
                      </button>
                    </TableCell>
                    <TableCell className="text-center">{product.org_price?.toLocaleString() || '-'}</TableCell>
                    <TableCell className="text-center">{product.shop_price?.toLocaleString() || '-'}</TableCell>
                    <TableCell className="text-center">{product.category_3 || '-'}</TableCell>
                    <TableCell className="text-center">{product.cost_ratio ? `${product.cost_ratio}%` : '-'}</TableCell>
                    <TableCell className="text-center">
                      {(product.total_stock !== undefined 
                        ? product.total_stock 
                        : product.main_wh_available_stock_excl_production_stock)?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell className="text-center">{product.soldout_rate ? `${product.soldout_rate}%` : '-'}</TableCell>
                    <TableCell className="text-center">{product.drop_yn || '-'}</TableCell>
                    <TableCell className="text-center">{product.supply_name || '-'}</TableCell>
                    <TableCell className="text-center">{product.exclusive2 || '-'}</TableCell>
                    <TableCell className="text-center">{product.total_order_qty?.toLocaleString() || '-'}</TableCell>
                    <TableCell className="text-center">
                      {product.product_desc ? (
                        <a href={product.product_desc} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          링크
                        </a>
                      ) : '링크 없음'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}
    </div>
  )
} 