import { Product, ChannelInfo } from '@/app/types/cart';
import { parseNumber } from './common';
import { calculateBaseCost } from './price';

/**
 * 정산예정금액 계산
 * @param product 상품 정보
 * @returns 계산된 정산예정금액
 */
export const calculateSettlementAmount = (product: Product): number => {
  const pricingPrice = parseNumber(product.pricing_price);
  const discountPrice = parseNumber(product.discount_price);
  const expectedCommissionFee = parseNumber(product.expected_commission_fee);
  const discountBurdenAmount = parseNumber(product.discount_burden_amount);
  
  // 할인가가 있으면 할인가 기준, 없으면 판매가 기준
  const baseAmount = discountPrice > 0 ? discountPrice : pricingPrice;
  
  // NaN 체크
  if (isNaN(baseAmount) || isNaN(expectedCommissionFee) || isNaN(discountBurdenAmount)) {
    console.log('calculateSettlementAmount - NaN 발생:', {
      baseAmount,
      expectedCommissionFee,
      discountBurdenAmount,
      original: {
        pricingPrice: product.pricing_price,
        discountPrice: product.discount_price,
        expectedCommissionFee: product.expected_commission_fee,
        discountBurdenAmount: product.discount_burden_amount
      }
    });
    return 0;
  }
  
  return baseAmount - expectedCommissionFee - discountBurdenAmount;
};

/**
 * 순이익 계산
 * @param product 상품 정보
 * @param channel 채널 정보
 * @returns 계산된 순이익
 */
export const calculateNetProfit = (product: Product, channel: ChannelInfo): number => {
  if (!product.org_price || !channel) return 0;
  
  const expectedSettlementAmount = calculateSettlementAmount(product);
  const cost = product.adjusted_cost || calculateBaseCost(product, channel);
  const logisticsCost = parseNumber(product.logistics_cost);
  
  // NaN 체크
  if (isNaN(expectedSettlementAmount) || isNaN(cost) || isNaN(logisticsCost)) {
    console.log('calculateNetProfit - NaN 발생:', {
      expectedSettlementAmount,
      cost,
      logisticsCost
    });
    return 0;
  }
  
  return expectedSettlementAmount - cost - logisticsCost;
};

/**
 * 이익률 계산
 * @param product 상품 정보
 * @param channel 채널 정보
 * @returns 계산된 이익률 (0-1 사이의 값)
 */
export const calculateProfitMargin = (product: Product, channel: ChannelInfo): number => {
  if (!product.pricing_price || product.pricing_price === 0) return 0;
  
  const netProfit = calculateNetProfit(product, channel);
  return netProfit / product.pricing_price;
};

/**
 * 원가율 계산
 * @param product 상품 정보
 * @param channel 채널 정보
 * @returns 계산된 원가율 (0-100 사이의 값)
 */
export const calculateCostRatio = (product: Product, channel: ChannelInfo): number => {
  if (!product.org_price) return 0;
  
  const cost = calculateBaseCost(product, channel);
  const finalPrice = product.discount_price 
    ? product.discount_price - parseNumber(product.discount_burden_amount)
    : parseNumber(product.pricing_price) - parseNumber(product.discount_burden_amount);
    
  if (finalPrice === 0) return 0;
  
  // 원가율을 퍼센트로 변환 (0-100 사이의 값)
  return Math.round((cost / finalPrice) * 10000) / 100;
}; 