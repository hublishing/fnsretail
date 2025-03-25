import { NextResponse, NextRequest } from 'next/server'
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export async function GET(
  request: NextRequest,
  { params, searchParams }: { params: { id: string }, searchParams: { [key: string]: string | string[] | undefined } }
) {
  try {
    const productId = params.id
    console.log('상품 ID:', productId);
    
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    // BigQuery 쿼리
    const query = `
      WITH RankedProducts AS (
        SELECT 
          *,
          ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY product_id DESC) as rn
        FROM \`third-current-410914.project_m.product_db\`
        WHERE product_id = '${productId}'
      )
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
      FROM RankedProducts
      WHERE rn = 1
      LIMIT 1
    `;

    console.log('BigQuery 쿼리:', query);

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

    // BigQuery API 요청
    const response = await fetch(url, {
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

    // BigQuery 응답에서 데이터 추출
    const values = data.rows[0].f.map((field: any) => field.v);
    console.log('추출된 값:', values);

    const product = {
      product_id: values[0] || '',
      name: values[1] || '',
      origin: values[2] || '',
      weight: values[3] || '',
      org_price: Number(values[4] || 0),
      shop_price: Number(values[5] || 0),
      img_desc1: values[6] || '',
      product_desc: values[7] || '',
      category: values[8] || '',
      extra_column1: values[9] || '',
      extra_column2: values[10] || '',
      options_product_id: values[11] || '',
      options_options: values[12] || '',
      cost_ratio: Number(values[13] || 0),
      category_1: values[14] || '',
      brand: values[15] || '',
      category_3: values[16] || '',
      global_price: Number(values[17] || 0),
      category_group: values[18] || '',
      amazon_shipping_cost: Number(values[19] || 0),
      main_stock: Number(values[20] || 0),
      add_wh_stock: Number(values[21] || 0),
      production_stock: Number(values[22] || 0),
      prima_stock: Number(values[23] || 0),
      main_wh_available_stock: Number(values[24] || 0),
      main_wh_available_stock_excl_production_stock: Number(values[25] || 0),
      incoming_stock: Number(values[26] || 0),
      tag: values[27] || '',
      drop_yn: values[28] || '',
      soldout: values[29] || '',
      soldout_rate: Number(values[30] || 0),
      supply_name: values[31] || '',
      scheduled: values[32] || '',
      last_shipping: values[33] || '',
      exclusive: values[34] || '',
      exclusive2: values[35] || '',
      fulfillment_stock_zalora: Number(values[36] || 0),
      fulfillment_stock_shopee_sg: Number(values[37] || 0),
      fulfillment_stock_shopee_my: Number(values[38] || 0)
    };

    console.log('변환된 상품 데이터:', product);
    return NextResponse.json(product);
  } catch (error) {
    console.error('상품 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '상품 정보를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 