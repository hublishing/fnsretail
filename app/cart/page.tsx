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
}

export default function CartPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [user, setUser] = useState<any>(null);

  // 사용자 세션 로드
  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await getSession();
        if (session) {
          setUser(session);
          // 저장된 장바구니 데이터 불러오기
          const docRef = doc(db, 'userCarts', session.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProducts(data.products || []);
          }
        } else {
          // 로그아웃 상태에서도 장바구니 데이터 유지
          const localCart = localStorage.getItem('cartProducts');
          if (localCart) {
            setProducts(JSON.parse(localCart));
          }
        }
      } catch (error) {
        console.error('세션 로드 오류:', error);
        // 에러 발생 시에도 로컬 데이터 확인
        const localCart = localStorage.getItem('cartProducts');
        if (localCart) {
          setProducts(JSON.parse(localCart));
        }
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

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">담은 상품 목록</h1>
      
      {products.length === 0 ? (
        <p className="text-center text-gray-500">담은 상품이 없습니다.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품코드</TableHead>
                <TableHead>상품명</TableHead>
                <TableHead>정상가</TableHead>
                <TableHead>판매가</TableHead>
                <TableHead>원가율</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>총재고</TableHead>
                <TableHead>드랍여부</TableHead>
                <TableHead>품절율</TableHead>
                <TableHead>공급처명</TableHead>
                <TableHead>단독여부</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.product_id}>
                  <TableCell>{product.product_id}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.org_price?.toLocaleString() || 0}</TableCell>
                  <TableCell>{product.shop_price?.toLocaleString() || 0}</TableCell>
                  <TableCell>{product.cost_ratio}%</TableCell>
                  <TableCell>{product.category_3}</TableCell>
                  <TableCell>
                    {(product.total_stock !== undefined 
                      ? product.total_stock 
                      : product.main_wh_available_stock_excl_production_stock)?.toLocaleString() || 0}
                  </TableCell>
                  <TableCell>{product.drop_yn}</TableCell>
                  <TableCell>{product.soldout_rate}%</TableCell>
                  <TableCell>{product.supply_name}</TableCell>
                  <TableCell>{product.exclusive2}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveFromCart(product.product_id)}
                    >
                      제거
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
} 