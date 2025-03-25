import { NextResponse, NextRequest } from 'next/server'
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const optionsProductId = params.id;
    console.log('Received optionsProductId:', optionsProductId);
    
    // 먼저 options_product_id로 product_id를 조회
    const productIdQuery = `
      SELECT product_id
      FROM \`third-current-410914.project_m.product_db\`
      WHERE options_product_id = '${optionsProductId}'
      LIMIT 1
    `;

    const bigQueryUrl = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    // JWT 토큰 생성
    const now = Math.floor(Date.now() / 1000);
    const privateKeyString = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
    
    if (!privateKeyString) {
      throw new Error('GOOGLE_CLOUD_PRIVATE_KEY 환경 변수가 설정되지 않았습니다.');
    }

    const privateKey = createPrivateKey({
      key: privateKeyString,
      format: 'pem',
    });
    
    const jwtToken = jwt.sign(
      {
        iss: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        sub: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        jti: Math.random().toString(),
        scope: 'https://www.googleapis.com/auth/bigquery',
      },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
      }
    );

    // OAuth 2.0 액세스 토큰 얻기
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtToken,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(`액세스 토큰 획득 실패: ${JSON.stringify(tokenData)}`);
    }

    const { access_token } = tokenData;

    // product_id 조회
    const productIdResponse = await fetch(bigQueryUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: productIdQuery,
        useLegacySql: false,
      }),
    });

    const productIdData = await productIdResponse.json();
    
    if (!productIdData.rows || productIdData.rows.length === 0) {
      return NextResponse.json(
        { error: '상품을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const productId = productIdData.rows[0].f[0].v;
    console.log('Found product_id:', productId);

    // product_id로 모든 옵션 상품 조회
    const query = `
      SELECT 
        product_id,
        name,
        origin,
        weight,
        org_price,
        shop_price,
        img_desc1,
        product_desc,
        category,
        extra_column1,
        extra_column2,
        options_product_id,
        options_options,
        cost_ratio,
        category_1,
        brand,
        category_3,
        global_price,
        category_group,
        amazon_shipping_cost,
        main_stock,
        add_wh_stock,
        production_stock,
        prima_stock,
        main_wh_available_stock,
        main_wh_available_stock_excl_production_stock,
        incoming_stock,
        tag,
        drop_yn,
        soldout,
        soldout_rate,
        supply_name,
        scheduled,
        last_shipping,
        exclusive,
        exclusive2,
        fulfillment_stock_zalora,
        fulfillment_stock_shopee_sg,
        fulfillment_stock_shopee_my
      FROM \`third-current-410914.project_m.product_db\`
      WHERE product_id = '${productId}'
      ORDER BY options_product_id ASC
    `;

    // BigQuery API 요청
    const response = await fetch(bigQueryUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        useLegacySql: false,
      }),
    });

    const data = await response.json();
    console.log('BigQuery 응답:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(`BigQuery API 요청 실패: ${JSON.stringify(data)}`);
    }

    // 결과가 없는 경우
    if (!data.rows || data.rows.length === 0) {
      console.log('상품을 찾을 수 없음');
      return NextResponse.json(
        { error: '상품을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 첫 번째 행을 메인 상품 정보로 사용
    const mainProductValues = data.rows[0].f.map((field: any) => field.v);
    const mainProductData = {
      product_id: mainProductValues[0] || '',
      name: mainProductValues[1] || '',
      origin: mainProductValues[2] || '',
      weight: mainProductValues[3] || '',
      org_price: Number(mainProductValues[4] || 0),
      shop_price: Number(mainProductValues[5] || 0),
      img_desc1: mainProductValues[6] || '',
      product_desc: mainProductValues[7] || '',
      category: mainProductValues[8] || '',
      extra_column1: mainProductValues[9] || '',
      extra_column2: mainProductValues[10] || '',
      options_options: mainProductValues[12] || '',
      cost_ratio: Number(mainProductValues[13] || 0),
      category_1: mainProductValues[14] || '',
      brand: mainProductValues[15] || '',
      category_3: mainProductValues[16] || '',
      global_price: Number(mainProductValues[17] || 0),
      category_group: mainProductValues[18] || '',
      amazon_shipping_cost: Number(mainProductValues[19] || 0),
      tag: mainProductValues[27] || '',
      drop_yn: mainProductValues[28] || '',
      soldout_rate: Number(mainProductValues[30] || 0),
      supply_name: mainProductValues[31] || '',
      exclusive2: mainProductValues[35] || ''
    };

    // 모든 행을 옵션 상품 정보로 변환
    const optionProductsData = data.rows.map((row: any) => {
      const values = row.f.map((field: any) => field.v);
      return {
        options_product_id: values[11] || '',
        options_options: values[12] || '',
        main_stock: Number(values[20] || 0),
        add_wh_stock: Number(values[21] || 0),
        production_stock: Number(values[22] || 0),
        prima_stock: Number(values[23] || 0),
        main_wh_available_stock: Number(values[24] || 0),
        main_wh_available_stock_excl_production_stock: Number(values[25] || 0),
        incoming_stock: Number(values[26] || 0),
        soldout: values[29] || '',
        scheduled: values[32] || '',
        last_shipping: values[33] || '',
        exclusive: values[34] || '',
        fulfillment_stock_zalora: Number(values[36] || 0),
        fulfillment_stock_shopee_sg: Number(values[37] || 0),
        fulfillment_stock_shopee_my: Number(values[38] || 0)
      };
    });

    console.log('변환된 상품 데이터:', { mainProduct: mainProductData, optionProducts: optionProductsData });
    return NextResponse.json({ mainProduct: mainProductData, optionProducts: optionProductsData });
  } catch (error) {
    console.error('상품 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '상품 정보를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 