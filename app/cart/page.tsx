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

export default function CartPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'default' | 'qty_desc' | 'qty_asc' | 'stock_desc' | 'stock_asc'>('qty_desc');
  const [sortedProducts, setSortedProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [channelSearchTerm, setChannelSearchTerm] = useState('');
  const [showChannelSuggestions, setShowChannelSuggestions] = useState(false);
  const [filteredChannels, setFilteredChannels] = useState<string[]>([]);
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
          setChannels(data.channels.filter((channel: string) => channel !== 'nan'));
        }
      } catch (error) {
        console.error('채널 정보 로딩 실패:', error);
        // 기본 채널 목록 설정
        setChannels([
          'SD_쿠팡',
          'SD_쿠팡로켓',
          'SD_티몬',
          'SD_11번가',
          'SD_29CM',
          'SD_CJ온스타일',
          'SD_GS샵',
          'SD_SSF',
          'SD_W컨셉',
          'SD_국내자사몰'
        ]);
      }
    };

    loadChannels();
  }, []);

  // 채널 검색어 변경 시 필터링
  useEffect(() => {
    if (channelSearchTerm.trim()) {
      const filtered = channels.filter(channel => 
        channel.toLowerCase().includes(channelSearchTerm.toLowerCase())
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
    setIsValidChannel(channels.includes(value));
  };

  // 채널 선택 핸들러
  const handleChannelSelect = (channel: string) => {
    setChannelSearchTerm(channel);
    setShowChannelSuggestions(false);
    setIsValidChannel(true);
    setFilters(prev => ({
      ...prev,
      channel_name: channel
    }));
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
                placeholder="타이틀을 입력해주세요"
                className="w-[300px] h-10 px-3 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm border-gray-300"
              />
              <div className="relative">
                <input
                  type="text"
                  value={channelSearchTerm}
                  onChange={handleChannelSearch}
                  onFocus={handleChannelSearchFocus}
                  onBlur={handleChannelSearchBlur}
                  placeholder="채널명을 입력하세요"
                  className={`w-[200px] h-10 px-3 border-[1px] rounded-md shadow-sm focus:outline-none focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 text-sm ${
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
                        key={channel}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => handleChannelSelect(channel)}
                      >
                        {channel}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Select 
                value={deliveryType} 
                onValueChange={(value) => {
                  setDeliveryType(value);
                  setIsValidDeliveryType(true);
                  setFilters(prev => ({
                    ...prev,
                    delivery_type: value
                  }));
                }}
              >
                <SelectTrigger 
                  className={`w-[200px] h-10 ${
                    deliveryType ? 'border-blue-500 focus:ring-[1px] focus:ring-blue-500 focus:border-blue-500 bg-blue-50' : ''
                  }`}
                >
                  <SelectValue placeholder="배송조건을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conditional">조건부배송</SelectItem>
                  <SelectItem value="free">무료배송</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => {}}>
                리스트 생성
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 할인 적용 섹션 */}
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => setShowDiscountModal(true)}>
            할인 적용
          </Button>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
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
                <TableCell>
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
                <TableCell className="text-center">{product.product_id}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    {product.img_desc1 ? (
                      <img 
                        src={product.img_desc1} 
                        alt="상품 이미지" 
                        className="w-20 h-20 object-cover rounded-md"
                        style={{ borderRadius: '5px' }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/no-image.png';
                          target.alt = '이미지 없음';
                          target.style.objectFit = 'contain';
                          target.style.backgroundColor = 'transparent';
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 flex items-center justify-center">
                        <img 
                          src="/no-image.png" 
                          alt="이미지 없음" 
                          className="w-20 h-20 object-contain rounded-md"
                          style={{ borderRadius: '5px' }}
                        />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <button
                    onClick={() => setSelectedProductId(product.product_id)}
                    className="text-left hover:text-blue-600 transition-colors w-full"
                  >
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {[
                        product.brand,
                        product.category_1,
                        product.extra_column2
                      ].filter(Boolean).join(' ')}
                    </div>
                  </button>
                </TableCell>
                <TableCell className="text-center">{product.org_price?.toLocaleString() || '-'}</TableCell>
                <TableCell className="text-center">{product.shop_price?.toLocaleString() || '-'}</TableCell>
                <TableCell className="text-center">{product.discount_price?.toLocaleString() || '-'}</TableCell>
                <TableCell className="text-center">
                  {product.discount_price && product.shop_price 
                    ? `${Math.round(((product.shop_price - product.discount_price) / product.shop_price) * 100)}%`
                    : product.discount ? `${product.discount}%` : '-'}
                </TableCell>
                <TableCell className="text-center">{product.category_3 || '-'}</TableCell>
                <TableCell className="text-center">{product.cost_ratio ? `${product.cost_ratio}%` : '-'}</TableCell>
                <TableCell className="text-center">
                  {(product.total_stock !== undefined 
                    ? product.total_stock 
                    : product.main_wh_available_stock_excl_production_stock)?.toLocaleString() || '-'}
                </TableCell>
                <TableCell className="text-center">{product.soldout_rate ? `${product.soldout_rate}%` : '-'}</TableCell>
                <TableCell className="text-center">{product.drop_yn || '-'}</TableCell>
                <TableCell className="text-center">{product.supply_name || '-'}</TableCell>
                <TableCell className="text-center">{product.exclusive2 || '-'}</TableCell>
                <TableCell className="text-center">{product.total_order_qty?.toLocaleString() || '-'}</TableCell>
                <TableCell className="text-center">
                  {product.product_desc ? (
                    <a href={product.product_desc} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      링크
                    </a>
                  ) : '링크 없음'}
                </TableCell>
                <TableCell className="text-center">
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