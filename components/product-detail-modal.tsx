'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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
  main_wh_available_stock: number;
  additional_wh_available_stock: number;
  production_waiting_stock: number;
  prima_wh_available_stock: number;
  main_wh_available_stock_excl_production_stock: number;
  main_wh_available_stock_excl_production_stock_with_additional: number;
  incoming_stock: number;
  soldout: number;
  zalora: number;
  shopee_sg: number;
  shopee_my: number;
  schedule: string;
  last_delivery: string;
  exclusive2: string;
}

interface ProductDetailModalProps {
  productId: string;
  onClose: () => void;
}

export function ProductDetailModal({ productId, onClose }: ProductDetailModalProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [optionProducts, setOptionProducts] = useState<OptionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        console.log('상품 상세 정보 조회 시작:', { productId });
        
        const response = await fetch(`/api/products/${productId}`);
        console.log('API 응답 상태:', response.status);
        
        const data = await response.json();
        console.log('API 응답 데이터:', data);
        
        if (!response.ok) {
          throw new Error(data.error || '상품 정보를 불러오는데 실패했습니다.');
        }

        if (!data || !data.mainProduct) {
          console.error('상품 데이터 누락:', data);
          throw new Error('상품 정보가 올바르지 않습니다.');
        }

        console.log('상품 정보 설정:', data.mainProduct);
        setProduct(data.mainProduct);
        setOptionProducts(data.optionProducts || []);
      } catch (error) {
        console.error('상품 정보 조회 오류:', error);
        setError(error instanceof Error ? error.message : '상품 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      console.log('상품 ID 변경 감지:', productId);
      fetchProduct();
    } else {
      console.warn('상품 ID가 없습니다.');
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">상품 상세 정보</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          <div className="text-center py-8">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">상품 상세 정보</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          <div className="text-center py-8 text-red-500">{error || '상품 정보를 찾을 수 없습니다.'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">상품 상세 정보</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-[400px_1fr] gap-20">
          {/* 상품 이미지 섹션 */}
          <div className="flex flex-col items-center">
            <div className="relative w-full aspect-square mb-4">
              <a href={product.product_desc} target="_blank" rel="noopener noreferrer">
                <img 
                  src={product.img_desc1 || '/no-image.png'} 
                  alt={product.name}
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
            <div>
              <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
              <p className="text-sm text-gray-500 mb-2">{product.extra_column1}</p>
              <p className="text-sm text-gray-500">브랜드 : {product.brand} 상품코드 : {product.product_id}</p>
            </div>

            {/* 가격 정보 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">원가</p>
                <p className="text-base text-gray-900">{product.org_price?.toLocaleString()}원</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">판매가</p>
                <p className="text-base text-gray-900">{product.shop_price?.toLocaleString()}원</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">글로벌 가격</p>
                <p className="text-base text-gray-900">{product.global_price?.toLocaleString()}원</p>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* 카테고리 정보 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">카테고리</p>
                <p className="text-base text-gray-900">{product.category_3}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">라인</p>
                <p className="text-base text-gray-900">{product.category_1}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">출시 시즌</p>
                <p className="text-base text-gray-900">{product.extra_column2}</p>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* 기본 정보 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">원산지</p>
                <p className="text-base text-gray-900">{product.origin}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">무게</p>
                <p className="text-base text-gray-900">{product.weight}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">공급사</p>
                <p className="text-base text-gray-900">{product.supply_name}</p>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* 상태 정보 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">품절률</p>
                <p className="text-base text-gray-900">{product.soldout_rate}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">드랍 여부</p>
                <p className="text-base text-gray-900">{product.drop_yn}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">태그</p>
                <p className="text-base text-gray-900">{product.tag}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 옵션 상품 목록 */}
        {optionProducts.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">옵션 상품 목록</h3>
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
                  {optionProducts.map((option) => (
                    <TableRow key={option.options_product_id}>
                      <TableCell>{option.options_product_id}</TableCell>
                      <TableCell>{option.options_options}</TableCell>
                      <TableCell>{option.main_wh_available_stock}</TableCell>
                      <TableCell>{option.additional_wh_available_stock}</TableCell>
                      <TableCell>{option.production_waiting_stock}</TableCell>
                      <TableCell>{option.prima_wh_available_stock}</TableCell>
                      <TableCell>{option.main_wh_available_stock_excl_production_stock}</TableCell>
                      <TableCell>{option.main_wh_available_stock_excl_production_stock_with_additional}</TableCell>
                      <TableCell>{option.incoming_stock}</TableCell>
                      <TableCell>{option.soldout}</TableCell>
                      <TableCell>{option.zalora}</TableCell>
                      <TableCell>{option.shopee_sg}</TableCell>
                      <TableCell>{option.shopee_my}</TableCell>
                      <TableCell>{option.schedule}</TableCell>
                      <TableCell>{option.last_delivery}</TableCell>
                      <TableCell>{option.exclusive2}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 