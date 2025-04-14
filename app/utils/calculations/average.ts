import { Product, ChannelInfo } from '@/app/types/cart';
import { calculateProfitMargin } from './profit';

/**
 * 상품 목록의 평균 할인율을 계산합니다.
 * @param products 상품 목록
 * @returns 평균 할인율 (0-100 사이의 값)
 */
export function calculateAverageDiscountRate(products: Product[]): number {
  if (!products.length) return 0;
  
  let totalDiscountRate = 0;
  let validProductsCount = 0;

  products.forEach(product => {
    // 최종 할인가격 계산 (쿠폰3 > 쿠폰2 > 쿠폰1 > 즉시할인 순)
    const finalDiscountPrice = product.coupon_price_3 || 
                             product.coupon_price_2 || 
                             product.coupon_price_1 || 
                             product.discount_price;

    if (finalDiscountPrice && product.pricing_price) {
      const discountRate = ((product.pricing_price - finalDiscountPrice) / product.pricing_price) * 100;
      if (discountRate > 0) {
        totalDiscountRate += discountRate;
        validProductsCount++;
      }
    }
  });
  
  return validProductsCount > 0 ? totalDiscountRate / validProductsCount : 0;
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