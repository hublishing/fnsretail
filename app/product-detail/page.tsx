'use client'

import { useEffect, useState, Suspense } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getSession } from '@/app/actions/auth';
import { useSearchParams, useRouter } from 'next/navigation';

interface Product {
  product_id: string;
  name: string;
  origin: string;
  weight: string;
  org_price: number;
  shop_price: number;
  img_desc1: string;
  product_desc: string;
  category: string;
  extra_column1: string;
  extra_column2: string;
  options_options: string;
  cost_ratio: number;
  category_1: string;
  brand: string;
  category_3: string;
  global_price: number;
  category_group: string;
  amazon_shipping_cost: number;
  tag: string;
  drop_yn: string;
  soldout_rate: number;
  supply_name: string;
  exclusive2: string;
}

interface OptionProduct {
  options_product_id: string;
  options_options: string;
  main_stock: number;
  add_wh_stock: number;
  production_stock: number;
  prima_stock: number;
  main_wh_available_stock: number;
  main_wh_available_stock_excl_production_stock: number;
  incoming_stock: number;
  soldout: string;
  scheduled: string;
  last_shipping: string;
  exclusive: string;
  fulfillment_stock_zalora: number;
  fulfillment_stock_shopee_sg: number;
  fulfillment_stock_shopee_my: number;
}

function ProductDetailContent() {
  const router = useRouter();
  const [mainProduct, setMainProduct] = useState<Product | null>(null)
  const [optionProducts, setOptionProducts] = useState<OptionProduct[]>([])
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // 사용자 세션 로드
  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await getSession();
        if (session) {
          setUser(session);
        }
      } catch (error) {
        console.error('세션 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  // 상품 정보 로드
  useEffect(() => {
    const loadProduct = async () => {
      const productId = searchParams.get('id');
      if (!productId) {
        setError('상품 ID가 없습니다.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Fetching product with ID:', productId);
        const response = await fetch(`/api/products/${productId}`);
        const data = await response.json();
        console.log('API Response:', data);
        
        if (!response.ok) {
          throw new Error(data.error || '상품 정보를 불러오는데 실패했습니다.');
        }

        if (!data || !data.mainProduct) {
          throw new Error('상품 정보가 올바르지 않습니다.');
        }

        setMainProduct(data.mainProduct);
        setOptionProducts(data.optionProducts || []);
      } catch (error) {
        console.error('상품 정보 로드 오류:', error);
        setError(error instanceof Error ? error.message : '상품 정보를 불러오는데 실패했습니다.');
        setMainProduct(null);
        setOptionProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <p className="text-center">로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button 
            onClick={() => router.push('/dynamic-table')}
            className="bg-blue-500 text-white hover:bg-blue-600"
          >
            상품검색으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  if (!mainProduct) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <p className="text-red-500 mb-4">상품 정보를 찾을 수 없습니다.</p>
          <Button 
            onClick={() => router.push('/dynamic-table')}
            className="bg-blue-500 text-white hover:bg-blue-600"
          >
            상품검색으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{mainProduct.name}</h1>
          <p className="text-sm text-gray-500 mb-2">{mainProduct.extra_column1}</p>
          <p className="text-sm text-gray-500">브랜드 : {mainProduct.brand} 상품코드 : {mainProduct.product_id}</p>
        </div>
        <Button 
          onClick={() => router.push('/dynamic-table')}
          className="bg-blue-500 text-white hover:bg-blue-600"
        >
          상품검색으로 돌아가기
        </Button>
      </div>

      {/* 메인 상품 정보 */}
      <div className="bg-white mb-8">
        <div className="grid grid-cols-[400px_1fr] gap-20">
          {/* 상품 이미지 섹션 */}
          <div className="flex flex-col items-center">
            <div className="relative w-full aspect-square mb-4">
              <a href={mainProduct.product_desc} target="_blank" rel="noopener noreferrer">
                <img 
                  src={mainProduct.img_desc1 || '/no-image.png'} 
                  alt={mainProduct.name}
                  className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/no-image.png';
                  }}
                />
              </a>
            </div>
          </div>

          {/* 상품 정보 섹션 */}
          <div className="space-y-6">
            {/* 가격 정보 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">원가</p>
                <p className="text-base text-gray-900">{mainProduct.org_price?.toLocaleString()}원</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">판매가</p>
                <p className="text-base text-gray-900">{mainProduct.shop_price?.toLocaleString()}원</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">글로벌 가격</p>
                <p className="text-base text-gray-900">{mainProduct.global_price?.toLocaleString()}원</p>
              </div>
            </div>

            <div className="border-t border-gray-200 my-6"></div>

            {/* 카테고리 정보 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">카테고리</p>
                <p className="text-base text-gray-900">{mainProduct.category_3}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">라인</p>
                <p className="text-base text-gray-900">{mainProduct.category_1}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">출시 시즌</p>
                <p className="text-base text-gray-900">{mainProduct.extra_column2}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 my-6"></div>

            {/* 기본 정보 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">원산지</p>
                <p className="text-base text-gray-900">{mainProduct.origin}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">무게</p>
                <p className="text-base text-gray-900">{mainProduct.weight}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">공급사</p>
                <p className="text-base text-gray-900">{mainProduct.supply_name}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 my-6"></div>

            {/* 상태 정보 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">품절률</p>
                <p className="text-base text-gray-900">{mainProduct.soldout_rate}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">드랍 여부</p>
                <p className="text-base text-gray-900">{mainProduct.drop_yn}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">태그</p>
                <p className="text-base text-gray-900">{mainProduct.tag}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 옵션 상품 목록 */}
      <div className="bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>옵션 상품코드</TableHead>
                <TableHead>옵션</TableHead>
                <TableHead>정상 재고</TableHead>
                <TableHead>추가 창고</TableHead>
                <TableHead>생산 대기</TableHead>
                <TableHead>프리마 창고</TableHead>
                <TableHead>정상+창고 가용재고</TableHead>
                <TableHead>정상+창고 가용재고-생산대기</TableHead>
                <TableHead>입고예정</TableHead>
                <TableHead>품절</TableHead>
                <TableHead>ZALORA</TableHead>
                <TableHead>쇼피 SG</TableHead>
                <TableHead>쇼피 MY</TableHead>
                <TableHead>스케줄</TableHead>
                <TableHead>마지막 배송</TableHead>
                <TableHead>단독여부</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {optionProducts.map((option, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{option.options_product_id}</TableCell>
                  <TableCell>{option.options_options}</TableCell>
                  <TableCell>{option.main_stock.toLocaleString()}</TableCell>
                  <TableCell>{option.add_wh_stock.toLocaleString()}</TableCell>
                  <TableCell>{option.production_stock.toLocaleString()}</TableCell>
                  <TableCell>{option.prima_stock.toLocaleString()}</TableCell>
                  <TableCell>{option.main_wh_available_stock.toLocaleString()}</TableCell>
                  <TableCell>{option.main_wh_available_stock_excl_production_stock.toLocaleString()}</TableCell>
                  <TableCell>{option.incoming_stock.toLocaleString()}</TableCell>
                  <TableCell>{option.soldout}</TableCell>
                  <TableCell>{option.fulfillment_stock_zalora.toLocaleString()}</TableCell>
                  <TableCell>{option.fulfillment_stock_shopee_sg.toLocaleString()}</TableCell>
                  <TableCell>{option.fulfillment_stock_shopee_my.toLocaleString()}</TableCell>
                  <TableCell>{option.scheduled}</TableCell>
                  <TableCell>{option.last_shipping}</TableCell>
                  <TableCell>{option.exclusive}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-10">
        <p className="text-center">로딩 중...</p>
      </div>
    }>
      <ProductDetailContent />
    </Suspense>
  );
} 