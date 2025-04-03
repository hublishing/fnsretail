import { Product, ChannelInfo } from '@/app/types/cart';
import { calculateBaseCost } from './price';

/**
 * 상품의 최종 판매가 계산
 * @param product 상품 정보
 * @returns 최종 판매가
 */
export function calculateFinalPrice(product: Product): number {
  return product.discount_price 
    ? product.discount_price - (product.discount_burden_amount || 0)
    : (product.pricing_price || 0) - (product.discount_burden_amount || 0);
}

/**
 * 상품의 원가율 계산
 * @param product 상품 정보
 * @param channelInfo 채널 정보
 * @returns 원가율 (0-100 사이의 값)
 */
export function calculateDetailedCostRatio(product: Product, channelInfo: ChannelInfo): number {
  if (!product.org_price || !channelInfo) return 0;
  
  const cost = calculateBaseCost(product, channelInfo);
  const finalPrice = calculateFinalPrice(product);
  
  if (finalPrice <= 0) return 0;
  
  // 원가율을 퍼센트로 변환 (0-100 사이의 값)
  return Math.round((cost / finalPrice) * 10000) / 100;
} 