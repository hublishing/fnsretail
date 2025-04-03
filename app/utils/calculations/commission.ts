import { Product, ChannelInfo } from '@/app/types/cart';
import { parseNumber } from './common';

/**
 * 수수료율 계산
 * @param channel 채널 정보
 * @param price 가격
 * @param discountRatio 할인율 (0~1 사이 값)
 * @param isAdjustFeeEnabled 수수료 조정 활성화 여부
 * @returns 계산된 수수료율
 */
export const calculateFeeRate = (
  channel: ChannelInfo,
  price: number,
  discountRatio: number,
  isAdjustFeeEnabled: boolean
): number => {
  // 문자열에서 쉼표와 % 제거 후 숫자로 변환
  const averageFeeRate = channel?.average_fee_rate 
    ? parseFloat(channel.average_fee_rate.replace(/,/g, '').replace('%', '')) 
    : 0;
  
  // NaN 체크
  if (isNaN(averageFeeRate)) {
    console.log('calculateFeeRate - NaN 발생:', {
      averageFeeRate,
      original: channel.average_fee_rate
    });
    return 0;
  }
  
  // 수수료율 조정 - 스위치가 켜져있을 때만 할인율에 따른 차감 적용
  let adjustedFeeRate = averageFeeRate;
  if (isAdjustFeeEnabled && discountRatio > 0) {
    const feeRateReduction = Math.floor(discountRatio * 100 / 10);
    adjustedFeeRate = Math.max(averageFeeRate - feeRateReduction, 0);
  }
  
  return adjustedFeeRate;
};

/**
 * 수수료 계산
 * @param product 상품 정보
 * @param channel 채널 정보
 * @param isAdjustFeeEnabled 수수료 조정 활성화 여부
 * @returns 계산된 수수료
 */
export const calculateCommissionFee = (
  product: Product,
  channel: ChannelInfo,
  isAdjustFeeEnabled: boolean
): number => {
  const pricingPrice = parseNumber(product.pricing_price);
  const discountPrice = parseNumber(product.discount_price);
  
  // 최종 가격 결정 (즉시할인가가 있으면 즉시할인가, 없으면 판매가)
  const finalPrice = discountPrice > 0 ? discountPrice : pricingPrice;
  
  // 할인율 계산 (0~1 사이 값)
  const discountRatio = pricingPrice > 0 ? (pricingPrice - finalPrice) / pricingPrice : 0;
  
  // 수수료율 계산
  const feeRate = calculateFeeRate(channel, finalPrice, discountRatio, isAdjustFeeEnabled);
  
  // 최종 수수료 계산
  return Math.round(finalPrice * (feeRate / 100));
};

/**
 * 예상 수수료율을 계산합니다.
 * @param channel 채널 정보
 * @param price 가격
 * @returns 계산된 수수료율
 */
export const calculateExpectedFeeRate = (channel: ChannelInfo, price: number): number => {
  if (!channel.average_fee_rate) return 0;
  
  // 문자열을 숫자로 변환
  const averageFeeRate = Number(channel.average_fee_rate);
  
  // 평균 수수료율이 0.15(15%)인 경우
  if (averageFeeRate === 0.15) {
    // 가격이 10000원 미만이면 0.15(15%)
    if (price < 10000) return 0.15;
    // 가격이 10000원 이상이면 0.12(12%)
    return 0.12;
  }
  
  // 평균 수수료율이 0.12(12%)인 경우
  if (averageFeeRate === 0.12) {
    // 가격이 10000원 미만이면 0.12(12%)
    if (price < 10000) return 0.12;
    // 가격이 10000원 이상이면 0.08(8%)
    return 0.08;
  }
  
  // 그 외의 경우 평균 수수료율 그대로 사용
  return averageFeeRate;
};

/**
 * 수수료율 계산
 * @param product 상품 정보
 * @param channelInfo 채널 정보
 * @param isAdjustFeeEnabled 수수료 조정 여부
 * @returns 수수료율 (0-100 사이의 값)
 */
export function calculateAdjustedFeeRate(product: Product, channelInfo: ChannelInfo, isAdjustFeeEnabled: boolean): number {
  const pricingPrice = parseNumber(product.pricing_price);
  const discountPrice = parseNumber(product.discount_price);
  const finalPrice = discountPrice > 0 ? discountPrice : pricingPrice;
  const discountRatio = pricingPrice > 0 ? (pricingPrice - finalPrice) / pricingPrice : 0;
  
  // 문자열에서 쉼표 제거 후 숫자로 변환
  const averageFeeRate = channelInfo?.average_fee_rate 
    ? parseFloat(channelInfo.average_fee_rate.replace(/,/g, '').replace('%', '')) 
    : 0;
  
  // 스위치 상태에 따라 수수료율 조정
  let adjustedFeeRate = averageFeeRate;
  if (isAdjustFeeEnabled && discountRatio > 0) {
    const feeRateReduction = Math.floor(discountRatio * 100 / 10);
    adjustedFeeRate = Math.max(averageFeeRate - feeRateReduction, 0);
  }
  
  return adjustedFeeRate;
} 