import { Product } from '@/app/types/cart';

/**
 * 할인율 계산
 * @param originalPrice 원래 가격
 * @param discountedPrice 할인된 가격
 * @returns 할인율 (0-100 사이의 값)
 */
export function calculateDiscountRate(originalPrice: number, discountedPrice: number): number {
  if (!originalPrice || originalPrice <= 0) return 0;
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
}

/**
 * 상품의 즉시할인율 계산
 * @param product 상품 정보
 * @returns 할인율 (0-100 사이의 값)
 */
export function calculateImmediateDiscountRate(product: Product): number {
  if (!product.pricing_price || !product.discount_price) return 0;
  return calculateDiscountRate(product.pricing_price, product.discount_price);
}

/**
 * 상품의 쿠폰1 할인율 계산
 * @param product 상품 정보
 * @returns 할인율 (0-100 사이의 값)
 */
export function calculateCoupon1DiscountRate(product: Product): number {
  if (!product.discount_price || !product.coupon_price_1) return 0;
  return calculateDiscountRate(product.discount_price, product.coupon_price_1);
}

/**
 * 상품의 쿠폰2 할인율 계산
 * @param product 상품 정보
 * @returns 할인율 (0-100 사이의 값)
 */
export function calculateCoupon2DiscountRate(product: Product): number {
  if (!product.coupon_price_1 || !product.coupon_price_2) return 0;
  return calculateDiscountRate(product.coupon_price_1, product.coupon_price_2);
}

/**
 * 상품의 쿠폰3 할인율 계산
 * @param product 상품 정보
 * @returns 할인율 (0-100 사이의 값)
 */
export function calculateCoupon3DiscountRate(product: Product): number {
  if (!product.coupon_price_2 || !product.coupon_price_3) return 0;
  return calculateDiscountRate(product.coupon_price_2, product.coupon_price_3);
}

/**
 * 상품의 최종 할인율 계산
 * @param product 상품 정보
 * @returns 할인율 (0-100 사이의 값)
 */
export function calculateFinalDiscountRate(product: Product): number {
  if (!product.pricing_price) return 0;
  
  const finalPrice = product.coupon_price_3 || product.coupon_price_2 || 
                    product.coupon_price_1 || product.discount_price || product.pricing_price;
  
  return calculateDiscountRate(product.pricing_price, finalPrice);
}

export function calculateDiscount(
  basePrice: number,
  discountValue: number,
  roundingMethod: 'round' | 'floor' | 'ceil' = 'round',
  roundingPrecision: string = '0.01',
  channelInfo?: { currency_2: string } | null
): number {
  if (!basePrice || !discountValue) return basePrice;

  // 할인 계산
  const discountedPrice = basePrice * (1 - discountValue / 100);

  // currency_2가 USD나 SGD인 경우에만 소수점 둘째자리까지 표시
  if (channelInfo && (channelInfo.currency_2 === 'USD' || channelInfo.currency_2 === 'SGD')) {
    return Number(discountedPrice.toFixed(2));
  }

  // 그 외의 경우 반올림 적용
  const precision = Number(roundingPrecision);
  const factor = 1 / precision;
  
  switch (roundingMethod) {
    case 'floor':
      return Math.floor(discountedPrice * factor) / factor;
    case 'ceil':
      return Math.ceil(discountedPrice * factor) / factor;
    case 'round':
    default:
      return Math.round(discountedPrice * factor) / factor;
  }
} 