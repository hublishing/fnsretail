import { Product, ChannelInfo } from '@/app/types/cart';
import { parseChannelBasicInfo, roundPrice } from './common';

/**
 * 채널 타입에 따른 판매가 계산
 * @param product 상품 정보
 * @param channel 채널 정보
 * @returns 계산된 판매가
 */
export const calculateChannelPrice = (product: Product, channel: ChannelInfo): number => {
  const { exchangeRate, markupRatio, rounddown, digitAdjustment, amazonShippingCost } = parseChannelBasicInfo(channel);
  
  console.log('calculateChannelPrice - 파싱된 채널 정보:', {
    exchangeRate, 
    markupRatio, 
    rounddown, 
    digitAdjustment, 
    amazonShippingCost,
    type: channel.type
  });
  
  console.log('calculateChannelPrice - 상품 정보:', {
    shop_price: product.shop_price,
    global_price: product.global_price,
    product_id: product.product_id
  });

  // 채널 정보 누락 시 0 반환
  if (!channel.type || markupRatio === null || exchangeRate === null) {
    console.log('calculateChannelPrice - 채널 정보 누락으로 0 반환');
    return 0;
  }

  let pricingPrice: number = 0;

  // 채널 타입별 판매가 계산
  switch (channel.type) {
    case '일본':
    case '자사몰':
      if (rounddown !== null) {
        if (!product.global_price) {
          console.log('calculateChannelPrice - 글로벌 가격 없음');
          return 0;
        }
        const basePrice = product.global_price / exchangeRate;
        console.log('calculateChannelPrice - 일본/자사몰 타입 계산:', {
          basePrice,
          rounddownResult: roundPrice(basePrice, rounddown),
          withAdjustment: roundPrice(basePrice, rounddown) + digitAdjustment
        });
        pricingPrice = roundPrice(basePrice, rounddown);
        pricingPrice += digitAdjustment;
        if (channel.channel_name_2 === 'SG_아마존US') {
          pricingPrice += amazonShippingCost;
          console.log('calculateChannelPrice - 아마존US 추가 배송비:', amazonShippingCost);
        }
      } else {
        console.log('calculateChannelPrice - rounddown이 null임');
      }
      break;

    case '국내':
      if (!product.shop_price) {
        console.log('calculateChannelPrice - 판매가(shop_price) 없음');
        return 0;
      }
      pricingPrice = product.shop_price + markupRatio;
      console.log('calculateChannelPrice - 국내 타입 계산:', {
        shop_price: product.shop_price,
        markupRatio,
        result: pricingPrice
      });
      break;

    case '해외':
      if (rounddown !== null) {
        if (!product.shop_price) {
          console.log('calculateChannelPrice - 판매가(shop_price) 없음');
          return 0;
        }
        const basePriceOverseas = (product.shop_price * markupRatio) / exchangeRate;
        console.log('calculateChannelPrice - 해외 타입 계산:', {
          basePriceOverseas,
          rounddownResult: roundPrice(basePriceOverseas, rounddown),
          withAdjustment: roundPrice(basePriceOverseas, rounddown) + digitAdjustment
        });
        pricingPrice = roundPrice(basePriceOverseas, rounddown);
        pricingPrice += digitAdjustment;

        // ZALORA 특별 케이스
        if (channel.channel_name_2 === 'SG_ZALORA_SG') {
          pricingPrice *= 1.09;
          console.log('calculateChannelPrice - ZALORA_SG 특별 케이스 적용:', pricingPrice);
        } else if (channel.channel_name_2 === 'SG_ZALORA_MY') {
          pricingPrice *= 1.1;
          console.log('calculateChannelPrice - ZALORA_MY 특별 케이스 적용:', pricingPrice);
        }
      } else {
        console.log('calculateChannelPrice - rounddown이 null임');
      }
      break;
      
    default:
      console.log('calculateChannelPrice - 알 수 없는 채널 타입:', channel.type);
  }

  console.log('calculateChannelPrice - 최종 반환 가격:', pricingPrice);
  return pricingPrice;
};

/**
 * 기본 원가 계산
 * @param product 상품 정보
 * @param channel 채널 정보
 * @returns 계산된 원가
 */
export const calculateBaseCost = (product: Product, channel: ChannelInfo): number => {
  const { exchangeRate } = parseChannelBasicInfo(channel);
  
  if (!product.org_price || !exchangeRate) return 0;

  // 조정원가가 있으면 조정원가 사용
  if (product.adjusted_cost) {
    return product.adjusted_cost;
  }

  // 기본 원가 계산
  const baseCost = product.org_price / exchangeRate;
  return channel.type === '국내' ? baseCost * 1.1 : baseCost;
};

/**
 * 조정원가 계산
 * @param product 상품 정보
 * @returns 계산된 조정원가
 */
export const calculateAdjustedCost = (product: Product): number => {
  return product.adjusted_cost || 0;
};

/**
 * 할인가 계산
 * @param basePrice 기본 가격
 * @param discountType 할인 유형
 * @param discountValue 할인 값
 * @returns 계산된 할인가
 */
export const calculateDiscountPrice = (
  basePrice: number,
  discountType: string,
  discountValue: number
): number => {
  switch (discountType) {
    case 'percentage':
      return basePrice * (1 - discountValue / 100);
    case 'fixed':
      return basePrice - discountValue;
    case 'min_profit_amount':
      return basePrice + discountValue;
    case 'min_profit_rate':
      return basePrice / (1 - discountValue / 100);
    default:
      return basePrice;
  }
}; 