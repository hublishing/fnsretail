import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search');

  // 검색어가 없으면 빈 배열 반환
  if (!searchTerm) {
    return NextResponse.json([]);
  }

  try {
    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    // BigQuery 쿼리
    const query = `
      WITH RankedProducts AS (
        SELECT 
          *,
          ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY product_id DESC) as rn
        FROM \`third-current-410914.project_m.product_db\`
        WHERE name LIKE '%${searchTerm}%'
      )
      SELECT 
        product_id,
        name,
        org_price,
        shop_price,
        img_desc1,
        product_desc,
        extra_column2,
        cost_ratio,
        category_1,
        category_3,
        main_wh_available_stock_excl_production_stock,
        drop_yn,
        soldout_rate,
        supply_name,
        exclusive2
      FROM RankedProducts
      WHERE rn = 1
      ORDER BY product_id DESC
    `;

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

    if (!response.ok) {
      throw new Error(`BigQuery API 요청 실패: ${JSON.stringify(data)}`);
    }

    // BigQuery 응답에서 데이터 추출
    const rows = data.rows?.map((row: any) => {
      const values = row.f.map((field: any) => field.v);
      return {
        product_id: values[0] || '',
        name: values[1] || '',
        org_price: Number(values[2] || 0),
        shop_price: Number(values[3] || 0),
        img_desc1: values[4] || '',
        product_desc: values[5] || '',
        extra_column2: values[6] || '',
        cost_ratio: Number(values[7] || 0),
        category_1: values[8] || '',
        category_3: values[9] || '',
        main_wh_available_stock_excl_production_stock: Number(values[10] || 0),
        drop_yn: values[11] || '',
        soldout_rate: Number(values[12] || 0),
        supply_name: values[13] || '',
        exclusive2: values[14] || ''
      };
    }) || [];

    return NextResponse.json(rows);
  } catch (error) {
    console.error('BigQuery 쿼리 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 