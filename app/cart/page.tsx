'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getSession } from '@/app/actions/auth';
import { ProductDetailModal } from "@/components/product-detail-modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { v4 as uuidv4 } from 'uuid';

interface Product {
  product_id: string;
  name: string;
  org_price: number;
  shop_price: number;
  img_desc1: string;
  product_desc: string;
  extra_column2: string;
  cost_ratio: number;
  category_3: string;
  main_wh_available_stock_excl_production_stock: number;
  total_stock: number;
  drop_yn: string;
  soldout_rate: number;
  supply_name: string;
  exclusive2: string;
  brand?: string;
  category_1?: string;
  total_order_qty?: number;
  discount?: number;
  discount_unit?: '원' | '%';
  discount_price?: number;
  selected?: boolean;
}

interface Filters {
  channel_name: string;
  delivery_type: string;
}

interface ChannelInfo {
  channel_name: string;
  channel_category_2: string;
  channel_category_3: string;
  team: string;
  manager: string;
  shop_id: string;
  shop_name: string;
  used: string;
  price_formula: string;
  shipping_formula: string;
  exchange_rate: string;
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
}

export default function CartPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'default' | 'qty_desc' | 'qty_asc' | 'stock_desc' | 'stock_asc'>('qty_desc');
  const [sortedProducts, setSortedProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [channelSearchTerm, setChannelSearchTerm] = useState('');
  const [showChannelSuggestions, setShowChannelSuggestions] = useState(false);
  const [filteredChannels, setFilteredChannels] = useState<ChannelInfo[]>([]);
  const [isValidChannel, setIsValidChannel] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    channel_name: '',
    delivery_type: ''
  });
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountUnit, setDiscountUnit] = useState<'원' | '%'>('%');
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [listUuid, setListUuid] = useState<string>('');
  const [usedUuids] = useState<Set<string>>(new Set());
  const [deliveryType, setDeliveryType] = useState<string>('');
  const [isValidDeliveryType, setIsValidDeliveryType] = useState(true);
  const [selectedChannelInfo, setSelectedChannelInfo] = useState<ChannelInfo | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [title, setTitle] = useState<string>('');

  // UUID 생성 함수
  const generateUniqueId = () => {
    let newUuid: string;
    do {
      // UUID v4에서 숫자와 알파벳만 추출
      newUuid = uuidv4().replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    } while (usedUuids.has(newUuid));
    
    usedUuids.add(newUuid);
    return newUuid;
  };

  // 사용자 세션 로드
  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await getSession();
        setUser(session);
        // 새로운 UUID 생성
        setListUuid(generateUniqueId());
        
        if (session) {
          try {
            // 장바구니 데이터 불러오기 로직...
            const docRef = doc(db, 'userCarts', session.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.products && Array.isArray(data.products)) {
                setProducts(data.products);
                // 기본적으로 판매 많은 순으로 정렬
                const sortedItems = [...data.products].sort((a, b) => (b.total_order_qty || 0) - (a.total_order_qty || 0));
                setSortedProducts(sortedItems);
              }
            }
          } catch (error) {
            console.error('장바구니 데이터 불러오기 오류:', error);
          }
        }
      } catch (error) {
        console.error('세션 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSession();
  }, []);

  // 채널 정보 로드
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const response = await fetch('/api/channels');
        if (!response.ok) {
          throw new Error('채널 정보를 가져오는데 실패했습니다.');
        }
        const data = await response.json();
        if (data.channels) {
          // 중복 제거: channel_name이 같은 경우 use_yn이 '운영중'인 것만 선택
          const uniqueChannels = data.channels.reduce((acc: ChannelInfo[], curr: ChannelInfo) => {
            const existingChannel = acc.find(c => c.channel_name === curr.channel_name);
            if (!existingChannel || (curr.use_yn === '운영중' && existingChannel.use_yn !== '운영중')) {
              if (existingChannel) {
                const index = acc.findIndex(c => c.channel_name === curr.channel_name);
                acc[index] = curr;
              } else {
                acc.push(curr);
              }
            }
            return acc;
          }, []);
          setChannels(uniqueChannels);
        }
      } catch (error) {
        console.error('채널 정보 로딩 실패:', error);
      }
    };

    loadChannels();
  }, []);

  // 채널 검색어 변경 시 필터링
  useEffect(() => {
    if (channelSearchTerm.trim()) {
      const filtered = channels.filter(channel => 
        channel.channel_name.toLowerCase().includes(channelSearchTerm.toLowerCase())
      );
      setFilteredChannels(filtered);
      setShowChannelSuggestions(true);
    } else {
      setFilteredChannels([]);
      setShowChannelSuggestions(false);
    }
  }, [channelSearchTerm, channels]);

  // 채널 검색 입력 핸들러
  const handleChannelSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setChannelSearchTerm(value);
    // 입력된 값이 채널 목록에 있는지 확인
    setIsValidChannel(channels.some(c => c.channel_name === value));
  };

  // 채널 선택 핸들러
  const handleChannelSelect = (channel: ChannelInfo) => {
    setChannelSearchTerm(channel.channel_name);
    setShowChannelSuggestions(false);
    setIsValidChannel(true);
    setFilters(prev => ({
      ...prev,
      channel_name: channel.channel_name
    }));
    setSelectedChannelInfo(channel);
  };

  // 채널 검색창 포커스 핸들러
  const handleChannelSearchFocus = () => {
    if (channelSearchTerm.trim()) {
      setShowChannelSuggestions(true);
    }
  };

  // 채널 검색창 블러 핸들러
  const handleChannelSearchBlur = () => {
    // 약간의 지연을 주어 선택 이벤트가 먼저 발생하도록 함
    setTimeout(() => {
      setShowChannelSuggestions(false);
    }, 200);
  };

  const handleRemoveFromCart = async (productId: string) => {
    try {
      const updatedProducts = products.filter((p: Product) => p.product_id !== productId);
      
      if (user) {
        // 로그인 상태: Firestore 업데이트
        const docRef = doc(db, 'userCarts', user.uid);
        await setDoc(docRef, {
          products: updatedProducts,
          updatedAt: new Date().toISOString()
        });
      } else {
        // 로그아웃 상태: 로컬 스토리지 업데이트
        localStorage.setItem('cartProducts', JSON.stringify(updatedProducts));
      }
      
      setProducts(updatedProducts);
      alert('상품이 제거되었습니다.');
    } catch (error) {
      console.error('상품 제거 오류:', error);
      alert('상품을 제거하는 중 오류가 발생했습니다.');
    }
  }

  // 정렬 상태 변경 시 상품 정렬
  useEffect(() => {
    if (!products.length) return;
    
    let sortedItems = [...products];
    if (sortOption === 'qty_desc') {
      sortedItems.sort((a, b) => (b.total_order_qty || 0) - (a.total_order_qty || 0));
    } else if (sortOption === 'qty_asc') {
      sortedItems.sort((a, b) => (a.total_order_qty || 0) - (b.total_order_qty || 0));
    } else if (sortOption === 'stock_desc') {
      sortedItems.sort((a, b) => (b.total_stock || 0) - (a.total_stock || 0));
    } else if (sortOption === 'stock_asc') {
      sortedItems.sort((a, b) => (a.total_stock || 0) - (b.total_stock || 0));
    }
    setSortedProducts(sortedItems);
  }, [products, sortOption]);

  // 할인 적용 핸들러
  const handleApplyDiscount = () => {
    if (!selectedProducts.length) {
      alert('할인을 적용할 상품을 선택해주세요.');
      return;
    }

    if (!filters.channel_name) {
      alert('채널을 선택해주세요.');
      return;
    }

    if (!discountRate) {
      alert('할인율을 입력해주세요.');
      return;
    }

    const updatedProducts = products.map(product => {
      if (selectedProducts.includes(product.product_id)) {
        let discountPrice = product.shop_price;
        if (discountUnit === '원') {
          discountPrice = product.shop_price - discountRate;
        } else {
          discountPrice = Math.round(product.shop_price * (1 - discountRate / 100));
        }

        return {
          ...product,
          discount: discountRate,
          discount_unit: discountUnit,
          discount_price: discountPrice
        };
      }
      return product;
    });

    setProducts(updatedProducts);
    setShowDiscountModal(false);
    setDiscountRate(0);
  };

  // 날짜 변경 핸들러
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    const value = e.target.value;
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">리스트 작성</h1>
          <div className="text-sm text-gray-500 mt-1">
            <span className="mr-4">작성자: {user?.uid === 'a8mwwycqhaZLIb9iOcshPbpAVrj2' ? '한재훈' :
             user?.uid === 'MhMI2KxbxkPHIAJP0o4sPSZG35e2' ? '이세명' :
             user?.uid === '6DnflkbFSifLCNVQGWGv7aqJ2w72' ? '박연수' : ''}</span>
            <span>UUID: {listUuid}</span>
          </div>
        </div>
      </div>

      {/* 편집 섹션 */}
      <Card className="mb-12 border-0 bg-transparent shadow-none">
        <CardContent className="p-0">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="타이틀을 입력해주세요"
                className={`w-[300px] h-10 px-3 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
                  title ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              />
              <div className="relative">
                <input
                  type="text"
                  value={channelSearchTerm}
                  onChange={handleChannelSearch}
                  onFocus={handleChannelSearchFocus}
                  onBlur={handleChannelSearchBlur}
                  placeholder="채널명을 입력하세요"
                  className={`w-[160px] h-10 px-3 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    channelSearchTerm && !isValidChannel 
                      ? 'border-red-500 focus:ring-[1px] focus:ring-red-500 focus:border-red-500 bg-red-50' 
                      : channelSearchTerm && isValidChannel
                      ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-blue-50'
                      : 'border-gray-300'
                  }`}
                />
                {showChannelSuggestions && filteredChannels.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredChannels.map((channel) => (
                      <div
                        key={channel.channel_name}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => handleChannelSelect(channel as ChannelInfo)}
                      >
                        {channel.channel_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Select 
                value={deliveryType} 
                onValueChange={(value: string) => {
                  setDeliveryType(value);
                  setIsValidDeliveryType(true);
                  setFilters(prev => ({
                    ...prev,
                    delivery_type: value
                  }));
                }}
              >
                <SelectTrigger className={`w-[120px] h-10 ${
                  deliveryType ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-blue-50' : ''
                }`}>
                  <SelectValue placeholder="배송조건" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conditional">조건부배송</SelectItem>
                  <SelectItem value="free">무료배송</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleDateChange(e, 'start')}
                  className={`w-[150px] h-10 px-3 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    startDate ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                />
                <span className="text-gray-500">~</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleDateChange(e, 'end')}
                  className={`w-[150px] h-10 px-3 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    endDate ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                />
              </div>
            </div>

            {/* 채널 상세 정보 첫 번째 줄 */}
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={selectedChannelInfo?.channel_category_2 || ''}
                readOnly
                placeholder="구분"
                className="w-[120px] h-10 px-3 border-[1px] rounded-md shadow-sm bg-gray-50 text-sm text-gray-500"
              />
              <input
                type="text"
                value={selectedChannelInfo?.channel_category_3 || ''}
                readOnly
                placeholder="분류"
                className="w-[120px] h-10 px-3 border-[1px] rounded-md shadow-sm bg-gray-50 text-sm text-gray-500"
              />
              <input
                type="text"
                value={selectedChannelInfo?.team || ''}
                readOnly
                placeholder="팀"
                className="w-[80px] h-10 px-3 border-[1px] rounded-md shadow-sm bg-gray-50 text-sm text-gray-500"
              />
              <input
                type="text"
                value={selectedChannelInfo?.manager || ''}
                readOnly
                placeholder="담당자"
                className="w-[80px] h-10 px-3 border-[1px] rounded-md shadow-sm bg-gray-50 text-sm text-gray-500"
              />
              <input
                type="text"
                value={selectedChannelInfo?.average_fee_rate ? `평균수수료 : ${selectedChannelInfo.average_fee_rate}` : ''}
                readOnly
                placeholder="평균수수료"
                className="w-[160px] h-10 px-3 border-[1px] rounded-md shadow-sm bg-gray-50 text-sm text-gray-500"
              />
            </div>

            {/* 메모 입력창 */}
            <div className="w-full">
              <input
                type="text"
                placeholder="메모를 입력해주세요"
                className="w-full h-10 px-3 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm border-gray-300"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 할인 적용 섹션 */}
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowDiscountModal(true)}>
            할인 적용
          </Button>
            <Button className="bg-blue-500 text-white hover:bg-blue-600">
              리스트저장
            </Button>
          </div>
          <div className="flex gap-2">
            <Select value={sortOption} onValueChange={(value: 'default' | 'qty_desc' | 'qty_asc' | 'stock_desc' | 'stock_asc') => setSortOption(value)}>
              <SelectTrigger className="w-[140px] border-none focus:ring-0 focus:ring-offset-0 shadow-none h-10">
                <SelectValue placeholder="정렬 기준" />
              </SelectTrigger>
              <SelectContent className="min-w-[140px]">
                <SelectItem value="default">기본</SelectItem>
                <SelectItem value="qty_desc">판매 많은순</SelectItem>
                <SelectItem value="qty_asc">판매 적은순</SelectItem>
                <SelectItem value="stock_desc">재고 많은순</SelectItem>
                <SelectItem value="stock_asc">재고 적은순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 상품 테이블 */}
      <div className="rounded-md border">
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 500px)' }}>
          <Table className="w-full">
            <TableHeader className="sticky top-0 bg-white z-10 border-b shadow-sm">
              <TableRow className="hover:bg-white">
                <TableHead className="w-[50px] text-center">
                  <Checkbox 
                    checked={selectedProducts.length === products.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedProducts(products.map(p => p.product_id));
                      } else {
                        setSelectedProducts([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="text-center">상품코드</TableHead>
                <TableHead className="text-center">상품이미지</TableHead>
                <TableHead className="text-center">상품명</TableHead>
                <TableHead className="text-center">원가</TableHead>
                <TableHead className="text-center">판매가</TableHead>
                <TableHead className="text-center">할인가</TableHead>
                <TableHead className="text-center">할인율</TableHead>
                <TableHead className="text-center">카테고리</TableHead>
                <TableHead className="text-center">원가율</TableHead>
                <TableHead className="text-center">재고</TableHead>
                <TableHead className="text-center">품절률</TableHead>
                <TableHead className="text-center">드랍여부</TableHead>
                <TableHead className="text-center">공급처명</TableHead>
                <TableHead className="text-center">단독여부</TableHead>
                <TableHead className="text-center">판매수량</TableHead>
                <TableHead className="text-center">URL</TableHead>
                <TableHead className="text-center">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.map((product) => (
                <TableRow key={product.product_id}>
                  <TableCell className="text-center w-[50px]">
                    <Checkbox 
                      checked={selectedProducts.includes(product.product_id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedProducts([...selectedProducts, product.product_id]);
                        } else {
                          setSelectedProducts(selectedProducts.filter(id => id !== product.product_id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center w-[100px]">{product.product_id}</TableCell>
                  <TableCell className="text-center w-[80px]">
                    <div className="flex justify-center">
                      {product.img_desc1 ? (
                        <img 
                          src={product.img_desc1} 
                          alt="상품 이미지" 
                          className="w-12 h-12 object-cover rounded-md"
                          style={{ borderRadius: '5px' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/no-image.png';
                            target.alt = '이미지 없음';
                            target.style.objectFit = 'contain';
                            target.style.backgroundColor = 'transparent';
                            target.parentElement?.classList.add('flex', 'justify-center');
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center">
                          <img 
                            src="/no-image.png" 
                            alt="이미지 없음" 
                            className="w-12 h-12 object-contain rounded-md"
                            style={{ borderRadius: '5px' }}
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center w-[200px]">
                    <button
                      onClick={() => setSelectedProductId(product.product_id)}
                      className="text-left hover:text-blue-600 transition-colors w-full"
                    >
                      <div className="font-medium truncate" title={product.name}>
                        {product.name.length > 20 ? `${product.name.slice(0, 20)}...` : product.name}
                      </div>
                      <div className="text-sm text-gray-500 mt-1 truncate">
                        {[
                          product.brand,
                          product.category_1,
                          product.extra_column2
                        ].filter(Boolean).join(' ')}
                      </div>
                    </button>
                  </TableCell>
                  <TableCell className="text-center w-[100px]">{product.org_price?.toLocaleString() || '-'}</TableCell>
                  <TableCell className="text-center w-[100px]">{product.shop_price?.toLocaleString() || '-'}</TableCell>
                  <TableCell className="text-center w-[100px]">{product.discount_price?.toLocaleString() || '-'}</TableCell>
                  <TableCell className="text-center w-[80px]">
                    {product.discount_price && product.shop_price 
                      ? `${Math.round(((product.shop_price - product.discount_price) / product.shop_price) * 100)}%`
                      : product.discount ? `${product.discount}%` : '-'}
                  </TableCell>
                  <TableCell className="text-center w-[120px]">{product.category_3 || '-'}</TableCell>
                  <TableCell className="text-center w-[80px]">{product.cost_ratio ? `${product.cost_ratio}%` : '-'}</TableCell>
                  <TableCell className="text-center w-[80px]">
                    {(product.total_stock !== undefined 
                      ? product.total_stock 
                      : product.main_wh_available_stock_excl_production_stock)?.toLocaleString() || '-'}
                  </TableCell>
                  <TableCell className="text-center w-[80px]">{product.soldout_rate ? `${product.soldout_rate}%` : '-'}</TableCell>
                  <TableCell className="text-center w-[80px]">{product.drop_yn || '-'}</TableCell>
                  <TableCell className="text-center w-[120px]">{product.supply_name || '-'}</TableCell>
                  <TableCell className="text-center w-[80px]">{product.exclusive2 || '-'}</TableCell>
                  <TableCell className="text-center w-[100px]">{product.total_order_qty?.toLocaleString() || '-'}</TableCell>
                  <TableCell className="text-center w-[80px]">
                    {product.product_desc ? (
                      <a href={product.product_desc} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        링크
                      </a>
                    ) : '링크 없음'}
                  </TableCell>
                  <TableCell className="text-center w-[80px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFromCart(product.product_id)}
                    >
                      삭제
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}

      {/* 할인 적용 모달 */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-[400px]">
            <h2 className="text-lg font-semibold mb-4">할인</h2>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(Number(e.target.value))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <Select value={discountUnit} onValueChange={(value: '원' | '%') => setDiscountUnit(value)}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="원">원</SelectItem>
                    <SelectItem value="%">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDiscountModal(false)}>
                  닫기
                </Button>
                <Button onClick={handleApplyDiscount}>
                  변경
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 