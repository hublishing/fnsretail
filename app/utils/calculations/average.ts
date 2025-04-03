import { Product, ChannelInfo } from '@/app/types/cart';
import { calculateProfitMargin } from './profit';

/**
 * 상품 목록의 평균 할인율을 계산합니다.
 * @param products 상품 목록
 * @returns 평균 할인율 (0-100 사이의 값)
 */
export function calculateAverageDiscountRate(products: Product[]): number {
  if (!products.length) return 0;
  
  const totalDiscountRate = products.reduce((acc, product) => {
    const discountRate = product.discount_price && product.pricing_price 
      ? ((product.pricing_price - product.discount_price) / product.pricing_price) * 100
      : 0;
    return acc + discountRate;
  }, 0);
  
  return Math.round(totalDiscountRate / products.length);
}

/**
 * 상품 목록의 평균 원가율을 계산합니다.
 * @param products 상품 목록
 * @returns 평균 원가율 (0-100 사이의 값)
 */
export function calculateAverageCostRatio(products: Product[]): number {
  if (!products.length) return 0;
  
  const totalCostRatio = products.reduce((acc, product) => 
    acc + (product.cost_ratio || 0), 0);
  
  return Math.round(totalCostRatio / products.length);
}

/**
 * 상품 목록의 평균 순이익률을 계산합니다.
 * @param products 상품 목록
 * @param channelInfo 채널 정보
 * @returns 평균 순이익률 (0-100 사이의 값)
 */
export function calculateAverageProfitMargin(products: Product[], channelInfo?: ChannelInfo): number {
  if (!products.length || !channelInfo) return 0;
  
  const totalProfitMargin = products.reduce((acc, product) => {
    const netProfitMargin = calculateProfitMargin(product, channelInfo);
    return acc + (netProfitMargin * 100);
  }, 0);
  
  return Math.round(totalProfitMargin / products.length);
} 