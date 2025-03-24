import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  // 검색어가 없으면 빈 배열 반환
  if (!searchTerm) {
    return NextResponse.json({
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    });
  }

  try {
    // Google Cloud API 엔드포인트
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/queries`;
    
    // 전체 데이터 수를 가져오는 쿼리
    const countQuery = `
      SELECT COUNT(*) as total
      FROM \`third-current-410914.001_ezadmin.001_ezadmin_product_*\`
      WHERE name LIKE '%${searchTerm}%'
    `;

    // 페이징된 데이터를 가져오는 쿼리
    const dataQuery = `
      SELECT DISTINCT
        product_id,
        options_product_id,
        name,
        options_options,
        org_price,
        shop_price,
        category
      FROM \`third-current-410914.001_ezadmin.001_ezadmin_product_*\`
      WHERE name LIKE '%${searchTerm}%'
      ORDER BY product_id DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;

    // JWT 토큰 생성
    const now = Math.floor(Date.now() / 1000);
    const privateKeyString = process.env.GOOGLE_CLOUD_PRIVATE_KEY || '';
    
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

    const tokenResponseText = await tokenResponse.text();
    console.log('토큰 응답:', tokenResponseText);

    if (!tokenResponse.ok) {
      throw new Error(`액세스 토큰 획득 실패: ${tokenResponseText}`);
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenResponseText);
    } catch (e) {
      throw new Error(`토큰 응답 파싱 실패: ${tokenResponseText}`);
    }

    const { access_token } = tokenData;

    // 전체 데이터 수 조회
    const countResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: countQuery,
        useLegacySql: false,
      }),
    });

    const countData = await countResponse.json();
    const total = parseInt(countData.rows[0].f[0].v);

    // 페이징된 데이터 조회
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

    const dataResponseText = await dataResponse.text();
    console.log('BigQuery 응답:', dataResponseText);

    if (!dataResponse.ok) {
      throw new Error(`BigQuery API 요청 실패: ${dataResponseText}`);
    }

    let data;
    try {
      data = JSON.parse(dataResponseText);
    } catch (e) {
      throw new Error(`BigQuery 응답 파싱 실패: ${dataResponseText}`);
    }

    // BigQuery 응답에서 데이터 추출
    const items = data.rows?.map((row: any) => ({
      product_id: row.f[0].v,
      options_product_id: row.f[1].v,
      name: row.f[2].v,
      options_options: row.f[3].v,
      org_price: Number(row.f[4].v),
      shop_price: Number(row.f[5].v),
      category: row.f[6].v,
    })) || [];

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('BigQuery 쿼리 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 