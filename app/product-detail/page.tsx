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
  options_product_id: string;
  options_options: string;
  cost_ratio: number;
  category_1: string;
  brand: string;
  category_3: string;
  global_price: number;
  category_group: string;
  amazon_shipping_cost: number;
  main_stock: number;
  add_wh_stock: number;
  production_stock: number;
  prima_stock: number;
  main_wh_available_stock: number;
  main_wh_available_stock_excl_production_stock: number;
  incoming_stock: number;
  tag: string;
  drop_yn: string;
  soldout: string;
  soldout_rate: number;
  supply_name: string;
  scheduled: string;
  last_shipping: string;
  exclusive: string;
  exclusive2: string;
  fulfillment_stock_zalora: number;
  fulfillment_stock_shopee_sg: number;
  fulfillment_stock_shopee_my: number;
}

function ProductDetailContent() {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null)
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
        const response = await fetch(`/api/products/${productId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || '상품 정보를 불러오는데 실패했습니다.');
        }

        if (!data || !data.product_id) {
          throw new Error('상품 정보가 올바르지 않습니다.');
        }

        setProduct(data);
      } catch (error) {
        console.error('상품 정보 로드 오류:', error);
        setError(error instanceof Error ? error.message : '상품 정보를 불러오는데 실패했습니다.');
        setProduct(null);
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

  if (!product) {
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
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-gray-600 mt-2">상품코드: {product.product_id}</p>
        </div>
        <Button 
          onClick={() => router.push('/dynamic-table')}
          className="bg-blue-500 text-white hover:bg-blue-600"
        >
          상품검색으로 돌아가기
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 왼쪽: 상품 이미지 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">상품 이미지</h2>
            {product.product_desc ? (
              <a 
                href={product.product_desc}
                target="_blank"
                rel="noopener noreferrer"
                className="block cursor-pointer hover:opacity-90 transition-opacity"
              >
                <img 
                  src={product.img_desc1 || '/no-image.png'} 
                  alt={product.name}
                  className="w-full h-auto rounded-lg shadow-md"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/no-image.png';
                  }}
                />
              </a>
            ) : (
              <img 
                src={product.img_desc1 || '/no-image.png'} 
                alt={product.name}
                className="w-full h-auto rounded-lg shadow-md"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/no-image.png';
                }}
              />
            )}
          </div>
        </div>

        {/* 중앙: 주요 정보 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">상품 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">정상가</p>
                  <p className="text-xl font-bold text-gray-900">{product.org_price.toLocaleString()}원</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">판매가</p>
                  <p className="text-xl font-bold text-gray-900">{product.shop_price.toLocaleString()}원</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">글로벌가</p>
                  <p className="text-xl font-bold text-gray-900">{product.global_price.toLocaleString()}원</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">원가율</p>
                  <p className="text-xl font-bold text-gray-900">{product.cost_ratio}%</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">브랜드</p>
                  <p className="text-lg font-semibold text-gray-900">{product.brand}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">원산지</p>
                  <p className="text-lg font-semibold text-gray-900">{product.origin}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">무게</p>
                  <p className="text-lg font-semibold text-gray-900">{product.weight}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">카테고리</p>
                  <p className="text-lg font-semibold text-gray-900">{product.category_3}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 재고 정보 섹션 */}
      <div className="mt-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">재고 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">메인 재고</p>
              <p className="text-lg font-semibold text-gray-900">{product.main_stock.toLocaleString()}개</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">추가 창고 재고</p>
              <p className="text-lg font-semibold text-gray-900">{product.add_wh_stock.toLocaleString()}개</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">생산 재고</p>
              <p className="text-lg font-semibold text-gray-900">{product.production_stock.toLocaleString()}개</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">프리마 재고</p>
              <p className="text-lg font-semibold text-gray-900">{product.prima_stock.toLocaleString()}개</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">메인 창고 가용 재고</p>
              <p className="text-lg font-semibold text-gray-900">{product.main_wh_available_stock.toLocaleString()}개</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">입고 예정</p>
              <p className="text-lg font-semibold text-gray-900">{product.incoming_stock.toLocaleString()}개</p>
            </div>
          </div>
        </div>
      </div>

      {/* 추가 정보 섹션 */}
      <div className="mt-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">추가 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">옵션 상품코드</p>
                <p className="font-medium text-gray-900">{product.options_product_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">옵션</p>
                <p className="font-medium text-gray-900">{product.options_options}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">태그</p>
                <p className="font-medium text-gray-900">{product.tag}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">시즌</p>
                <p className="font-medium text-gray-900">{product.extra_column2}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">공급처명</p>
                <p className="font-medium text-gray-900">{product.supply_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">스케줄</p>
                <p className="font-medium text-gray-900">{product.scheduled}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">마지막 배송</p>
                <p className="font-medium text-gray-900">{product.last_shipping}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">단독여부</p>
                <p className="font-medium text-gray-900">{product.exclusive}</p>
              </div>
            </div>
          </div>
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