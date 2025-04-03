import { ChannelInfo } from '@/app/types/cart';

/**
 * 문자열로 된 환율을 숫자로 변환
 * @param rate 환율 문자열 (예: "1,234.56")
 * @returns 변환된 숫자
 */
export const parseExchangeRate = (rate: string | undefined): number => {
  return Number(rate?.replace(/,/g, '') || 0);
};

/**
 * 문자열로 된 숫자를 숫자로 변환
 * @param value 숫자 문자열 (예: "1,234.56")
 * @returns 변환된 숫자
 */
export const parseNumber = (value: string | number | undefined | null): number => {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return 0;
  return Number(String(value).replace(/,/g, '') || 0);
};

/**
 * 채널 정보에서 필요한 기본 값들을 파싱
 * @param channel 채널 정보
 * @returns 파싱된 기본 값들
 */
export const parseChannelBasicInfo = (channel: ChannelInfo) => {
  // 문자열에서 쉼표 제거 후 숫자로 변환
  const exchangeRate = parseFloat(channel.exchange_rate?.replace(/,/g, '') || '0');
  const markupRatio = parseFloat(channel.markup_ratio?.replace(/,/g, '') || '0');
  const rounddown = parseFloat(channel.rounddown?.replace(/,/g, '') || '0');
  const digitAdjustment = parseFloat(channel.digit_adjustment?.replace(/,/g, '') || '0');
  const amazonShippingCost = channel.amazon_shipping_cost || 0;
  const freeShipping = channel.free_shipping || 0;
  const conditionalShipping = channel.conditional_shipping || 0;

  return {
    exchangeRate,
    markupRatio,
    rounddown,
    digitAdjustment,
    amazonShippingCost,
    freeShipping,
    conditionalShipping
  };
};

/**
 * 가격을 소수점 자리수에 맞게 반올림
 * @param price 가격
 * @param decimals 소수점 자리수
 * @returns 반올림된 가격
 */
export const roundPrice = (price: number, decimals: number = 0): number => {
  const multiplier = Math.pow(10, decimals);
  return Math.round(price * multiplier) / multiplier;
};

/**
 * 할인 계산 함수
 * @param price 원래 가격
 * @param rate 할인율
 * @param roundType 반올림 유형 ('floor', 'ceil', 'round')
 * @param decimalPoint 소수점 처리 ('0.01', '0.1', '1', 'none')
 * @returns 할인된 가격
 */
export const calculateDiscount = (
  price: number, 
  rate: number, 
  roundType: 'floor' | 'ceil' | 'round' = 'round', 
  decimalPoint: '0.01' | '0.1' | '1' | 'none' = 'none'
): number => {
  // 기본 할인 계산
  let result = price * (1 - rate / 100);
  
  // 소수점 처리
  if (decimalPoint !== 'none') {
    const multiplier = decimalPoint === '0.01' ? 100 : decimalPoint === '0.1' ? 10 : 1;
    result = result * multiplier;
    
    // 반올림 처리
    switch (roundType) {
      case 'floor':
        result = Math.floor(result);
        break;
      case 'ceil':
        result = Math.ceil(result);
        break;
      case 'round':
        result = Math.round(result);
        break;
    }
    
    // 원래 자리수로 되돌리기
    result = result / multiplier;
  }
  
  return result;
}; 