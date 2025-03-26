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
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
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
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
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
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-8 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">상품 상세 정보</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
            <X size={28} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-10">
          {/* 상품 이미지 섹션 */}
          <div className="flex flex-col items-center">
            <div className="relative w-full aspect-square">
              <a href={product.product_desc} target="_blank" rel="noopener noreferrer" className="block">
                <img 
                  src={product.img_desc1 || '/no-image.png'} 
                  alt={product.name}
                  className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity rounded-md"
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
            <div className="border-b pb-4">
              <h3 className="text-2xl font-semibold mb-2 text-gray-800">{product.name}</h3>
              <div className="flex items-center gap-3 text-base text-gray-600">
                <span>브랜드: <strong>{product.brand}</strong></span>
                <span className="text-gray-300">|</span>
                <span>상품코드: <strong>{product.product_id}</strong></span>
              </div>
              {product.extra_column1 && (
                <p className="mt-3 text-base text-gray-500">{product.extra_column1}</p>
              )}
            </div>

            <div className="pb-5">
              {/* 카테고리 정보 */}
              <div className="flex flex-wrap gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-gray-500">카테고리:</span>
                  <span className="text-base text-gray-800">{product.category_3}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-gray-500">라인:</span>
                  <span className="text-base text-gray-800">{product.category_1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-gray-500">출시 시즌:</span>
                  <span className="text-base text-gray-800">{product.extra_column2}</span>
                </div>
              </div>

              {/* 가격 정보 */}
              <div className="flex flex-wrap gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-gray-500">원가:</span>
                  <span className="text-base text-gray-800">{product.org_price?.toLocaleString()}원</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-gray-500">판매가:</span>
                  <span className="text-base text-gray-800">{product.shop_price?.toLocaleString()}원</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-gray-500">글로벌 가격:</span>
                  <span className="text-base text-gray-800">{product.global_price?.toLocaleString()}원</span>
                </div>
              </div>

              {/* 기본 정보 및 상태 정보 */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-gray-500">원산지:</span>
                  <span className="text-base text-gray-800">{product.origin}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-gray-500">무게:</span>
                  <span className="text-base text-gray-800">{product.weight}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-gray-500">공급사:</span>
                  <span className="text-base text-gray-800">{product.supply_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-gray-500">품절률:</span>
                  <span className="text-base text-gray-800">{product.soldout_rate}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-gray-500">드랍 여부:</span>
                  <span className="text-base text-gray-800">{product.drop_yn}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-gray-500">태그:</span>
                  <span className="text-base text-gray-800">{product.tag || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 옵션 상품 목록 */}
        {optionProducts.length > 0 && (
          <div className="mt-10 border-t pt-8">
            <h3 className="text-xl font-semibold mb-5 text-gray-800">옵션 상품 목록</h3>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-center">옵션 상품코드</TableHead>
                    <TableHead className="text-left">옵션</TableHead>
                    <TableHead className="text-center">정상 재고</TableHead>
                    <TableHead className="text-center">추가 창고</TableHead>
                    <TableHead className="text-center">생산 대기</TableHead>
                    <TableHead className="text-center">프리마 창고</TableHead>
                    <TableHead className="text-center">정상+창고 가용재고</TableHead>
                    <TableHead className="text-center">입고예정</TableHead>
                    <TableHead className="text-center">품절</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {optionProducts.map((option) => (
                    <TableRow key={option.options_product_id} className="hover:bg-gray-50">
                      <TableCell className="text-center">{option.options_product_id}</TableCell>
                      <TableCell className="text-left font-medium">{option.options_options}</TableCell>
                      <TableCell className="text-center">{option.main_wh_available_stock}</TableCell>
                      <TableCell className="text-center">{option.additional_wh_available_stock}</TableCell>
                      <TableCell className="text-center">{option.production_waiting_stock}</TableCell>
                      <TableCell className="text-center">{option.prima_wh_available_stock}</TableCell>
                      <TableCell className="text-center">{option.main_wh_available_stock_excl_production_stock}</TableCell>
                      <TableCell className="text-center">{option.incoming_stock}</TableCell>
                      <TableCell className="text-center">{option.soldout}</TableCell>
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