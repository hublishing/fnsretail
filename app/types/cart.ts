import { ReactNode } from 'react';

export interface Product {
  [key: string]: any;
  id: string;
  product_id: string;
  name: string;
  org_price: number;
  shop_price: number;
  global_price: number;
  img_desc1: string;
  product_desc: string;
  extra_column2: string;
  cost_ratio: number;
  category_1: string;
  category_3: string;
  main_wh_available_stock_excl_production_stock: number;
  total_stock: number;
  drop_yn: string;
  soldout_rate: number;
  supply_name: string;
  exclusive2: string;
  detail?: never;
  options_product_id: string;
  brand?: string;
  line?: string;
  season?: string;
  total_order_qty?: number;
  recent_order_dates?: string[];
  order_countries?: string[];
  order_channels?: string[];
  order_categories?: string[];
  order_types?: string[];
  discount_price: number;
  discount: number;
  discount_rate: number;
  discount_unit: string;
  coupon_price_1?: number | null;
  coupon_price_2?: number | null;
  coupon_price_3?: number | null;
  isSelected?: boolean;
  pricing_price: number;
  self_ratio?: number;
  final_price: number | null;
  rowColor?: string;
  dividerText?: string;
  adjusted_cost: number;
  discount_burden_amount: number;
  expected_commission_fee: number;
  expected_settlement_amount: number;
  logistics_cost?: number;
  expected_net_profit: number;
  expected_net_profit_margin?: number;
  domestic_delivery_fee?: number;
  shipping_fee?: number;
  average_fee_rate?: number;
  self_burden_1?: number;
  self_burden_2?: number;
  self_burden_3?: number;
}

export interface Column {
  key: keyof Product | 'actions';
  label: string;
  format?: (value: any) => ReactNode;
  render?: (product: Product) => ReactNode;
}

export interface Filters {
  channel_name_2: string;
  delivery_type: string;
}

export interface ChannelInfo {
  channel_name_2: string;
  channel_category_2: string;
  channel_category_3: string;
  team: string;
  manager: string;
  shop_id: string;
  shop_name: string;
  used: string;
  price_formula: string;
  shipping_formula: string;
  currency: string;
  correction_rate: string;
  amount: string;
  comment: string;
  use_yn: string;
  type: string;
  markup_ratio: string;
  applied_exchange_rate: string;
  rounddown: string;
  digit_adjustment: string;
  currency_2: string;
  average_fee_rate: string;
  shipping_condition: string;
  outerbox_fee: string;
  domestic_delivery_fee: string;
  shipping_fee: string;
  customs_fee: string;
  declaration_fee: string;
  innerbox_fee: string;
  packingbox_fee: string;
  brand_type: string;
  free_shipping: number;
  conditional_shipping: number;
  amazon_shipping_cost?: number;
  min_price?: number;
  commission_rate?: number;
  delivery_fee?: number;
  writer?: string;
  uuid?: string;
  [key: string]: any;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  brand?: string;
  url?: string;
}

export interface ExcelSettings {
  includeImage: boolean;
  includeUrl: boolean;
  includeCost: boolean;
  includeDiscount: boolean;
}

export interface DividerRule {
  id: string;
  range: [number, number];
  color: string;
  text: string;
}

export type ValueSource = 'db' | 'user_input' | 'channel_match' | 'calculation' | 'mixed';
export type ValueType = 'fixed' | 'calculated' | 'mixed';

export interface ImpactMap {
  id: string;
  timestamp: number;
  type: 'logistics' | 'commission' | 'profit' | 'settlement' | 'discount' | 'price';
  productId: string;
  oldValue: any;
  newValue: any;
  description: string;
  valueSource: ValueSource;
  valueType: ValueType;
  formula?: string;
  dependencies?: {
    type: string;
    value: any;
  }[];
}

export interface HistoryState {
  impactMaps: ImpactMap[];
  currentIndex: number;
  formulaHistory?: {
    [key: string]: string;
  };
}