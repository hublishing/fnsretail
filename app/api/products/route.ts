import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search');

  // 검색어가 없으면 빈 배열 반환
  if (!searchTerm) {
    return NextResponse.json({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0
    });
  }

  try {
    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    // 데이터를 가져오는 쿼리
    const dataQuery = `
      SELECT DISTINCT
        상품코드 as product_id,
        상품명 as name,
        원가 as org_price,
        판매가 as shop_price,
        카테고리 as category
      FROM \`third-current-410914.001_ezadmin.001_ezadmin_product_*\`
      WHERE 상품명 LIKE '%${searchTerm}%'
      ORDER BY 상품코드 DESC
    `;

    // JWT 토큰 생성
    const now = Math.floor(Date.now() / 1000);
    const privateKeyString = process.env.GOOGLE_CLOUD_PRIVATE_KEY || '';
    
    if (!privateKeyString) {
      return NextResponse.json(
        { error: 'GOOGLE_CLOUD_PRIVATE_KEY 환경 변수가 설정되지 않았습니다.' },
        { status: 500 }
      );
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

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return NextResponse.json(
        { error: `액세스 토큰 획득 실패: ${errorText}` },
        { status: 500 }
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // 데이터 조회
    const dataResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: dataQuery,
        useLegacySql: false,
      }),
    });

    if (!dataResponse.ok) {
      const errorText = await dataResponse.text();
      return NextResponse.json(
        { error: `데이터 조회 실패: ${errorText}` },
        { status: 500 }
      );
    }

    const data = await dataResponse.json();

    // BigQuery 응답에서 데이터 추출
    const allItems = data.rows?.map((row: any) => ({
      product_id: row.f[0].v,
      name: row.f[1].v,
      org_price: Number(row.f[2].v),
      shop_price: Number(row.f[3].v),
      category: row.f[4].v,
    })) || [];

    return NextResponse.json({
      items: allItems,
      total: allItems.length,
      page: 1,
      pageSize: 50,
      totalPages: Math.ceil(allItems.length / 50)
    });
  } catch (error) {
    console.error('BigQuery 쿼리 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 