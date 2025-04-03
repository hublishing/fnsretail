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